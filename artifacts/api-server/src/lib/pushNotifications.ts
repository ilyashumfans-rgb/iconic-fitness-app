import { createHash } from "node:crypto";
import { and, eq, like, sql } from "drizzle-orm";
import { appSettingsTable, db } from "@workspace/db";
import { logger } from "./logger";

// Expo push channel. Tokens live in app_settings (no schema churn), keyed by a
// hash so the raw token never appears in keys or logs. One token belongs to
// exactly one user at a time: registering it for another account moves it.

const EXPO_SEND = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";
const TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,}\]$/;
const MAX_TOKENS_PER_USER = 10;
const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const TICKET_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

type TokenRecord = { userId: number; recipientType?: "user" | "staff"; token: string; platform: string; updatedAt: string };

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

export function tokenKey(token: string): string {
  return `push:token:${createHash("sha256").update(token).digest("hex").slice(0, 40)}`;
}

export async function registerPushToken(userId: number, token: string, platform: string, recipientType: "user" | "staff" = "user"): Promise<void> {
  const rec: TokenRecord = { userId, recipientType, token, platform: platform.slice(0, 16), updatedAt: new Date().toISOString() };
  const value = JSON.stringify(rec);
  await db
    .insert(appSettingsTable)
    .values({ key: tokenKey(token), value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
}

/**
 * Remove a device token. Possession of the token (it only exists on that
 * device) is enough, so a new member on a shared phone can release a previous
 * member's registration without knowing who it was.
 */
export async function removePushToken(token: string): Promise<void> {
  await db.delete(appSettingsTable).where(eq(appSettingsTable.key, tokenKey(token)));
}

export async function tokensForUser(userId: number, recipientType: "user" | "staff" = "user"): Promise<{ key: string; token: string }[]> {
  const rows = await db
    .select({ key: appSettingsTable.key, value: appSettingsTable.value })
    .from(appSettingsTable)
    .where(
      and(
        like(appSettingsTable.key, "push:token:%"),
        sql`(${appSettingsTable.value})::jsonb->>'userId' = ${String(userId)}`,
        sql`COALESCE((${appSettingsTable.value})::jsonb->>'recipientType', 'user') = ${recipientType}`,
      ),
    )
    .limit(MAX_TOKENS_PER_USER);
  const out: { key: string; token: string }[] = [];
  for (const r of rows) {
    try {
      const rec = JSON.parse(r.value ?? "") as TokenRecord;
      if (rec.userId === userId && (rec.recipientType ?? "user") === recipientType && isExpoPushToken(rec.token)) out.push({ key: r.key, token: rec.token });
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function userHasPushToken(userId: number): Promise<boolean> {
  return (await tokensForUser(userId)).length > 0;
}

function pushEnabled(): boolean {
  return process.env.PUSH_SEND !== "off";
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const access = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (access) h.Authorization = `Bearer ${access}`;
  return h;
}

async function postWithRetry(fetchImpl: FetchLike, url: string, body: unknown): Promise<unknown | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchImpl(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) {
        logger.warn({ status: res.status }, "expo push request rejected");
        return null;
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "expo push request failed");
    }
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
  return null;
}

/** Send to every token registered for the user. Never throws; never logs tokens. */
export async function sendPushToUser(
  userId: number,
  msg: { title: string; body: string; link: string; ttl?: number; channelId?: string },
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  recipientType: "user" | "staff" = "user",
): Promise<{ sent: number; removed: number }> {
  if (!pushEnabled()) return { sent: 0, removed: 0 };
  try {
    const tokens = await tokensForUser(userId, recipientType);
    if (tokens.length === 0) return { sent: 0, removed: 0 };
    const messages = tokens.map((t) => ({
      to: t.token,
      title: msg.title,
      body: msg.body,
      sound: "default",
      channelId: msg.channelId ?? "default",
      ...(msg.ttl !== undefined ? { ttl: msg.ttl } : {}),
      data: { link: msg.link, url: msg.link },
    }));
    const json = (await postWithRetry(fetchImpl, EXPO_SEND, messages)) as {
      data?: Array<{ status: string; id?: string; details?: { error?: string } }>;
    } | null;
    let sent = 0;
    let removed = 0;
    const tickets = json?.data ?? [];
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i]!;
      const tok = tokens[i];
      if (!tok) continue;
      if (t.status === "ok" && t.id) {
        sent++;
        await db
          .insert(appSettingsTable)
          .values({ key: `push:ticket:${t.id}`, value: JSON.stringify({ tokenKey: tok.key, createdAt: Date.now() }) })
          .onConflictDoNothing();
      } else if (t.details?.error === "DeviceNotRegistered") {
        removed++;
        await db.delete(appSettingsTable).where(eq(appSettingsTable.key, tok.key));
      }
    }
    return { sent, removed };
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId }, "push send failed");
    return { sent: 0, removed: 0 };
  }
}

/** Bounded receipt pass: drop tokens Expo reports as unregistered. */
export async function checkPushReceipts(fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<number> {
  if (!pushEnabled()) return 0;
  const rows = await db
    .select({ key: appSettingsTable.key, value: appSettingsTable.value })
    .from(appSettingsTable)
    .where(like(appSettingsTable.key, "push:ticket:%"))
    .limit(300);
  const now = Date.now();
  const due: { id: string; key: string; tokenKey: string }[] = [];
  for (const r of rows) {
    try {
      const v = JSON.parse(r.value ?? "") as { tokenKey: string; createdAt: number };
      if (now - v.createdAt > TICKET_MAX_AGE_MS) {
        await db.delete(appSettingsTable).where(eq(appSettingsTable.key, r.key));
      } else if (now - v.createdAt >= RECEIPT_DELAY_MS) {
        due.push({ id: r.key.slice("push:ticket:".length), key: r.key, tokenKey: v.tokenKey });
      }
    } catch {
      await db.delete(appSettingsTable).where(eq(appSettingsTable.key, r.key));
    }
  }
  if (due.length === 0) return 0;
  const json = (await postWithRetry(fetchImpl, EXPO_RECEIPTS, { ids: due.map((d) => d.id) })) as {
    data?: Record<string, { status: string; details?: { error?: string } }>;
  } | null;
  if (!json?.data) return 0; // retry next run
  let removed = 0;
  for (const d of due) {
    const rc = json.data[d.id];
    if (!rc) continue; // receipt not ready yet
    if (rc.status === "error" && rc.details?.error === "DeviceNotRegistered") {
      removed++;
      await db.delete(appSettingsTable).where(eq(appSettingsTable.key, d.tokenKey));
    }
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, d.key));
  }
  return removed;
}

