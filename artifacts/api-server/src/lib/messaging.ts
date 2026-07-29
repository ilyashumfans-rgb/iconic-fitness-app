/**
 * WhatsApp / SMS messaging via Twilio REST API.
 *
 * Design notes:
 * - No SDK dependency — uses native fetch with HTTP Basic Auth.
 * - Config is stored in messaging_config (single-row, lazily created).
 * - Every send attempt is logged in lead_messages so the admin can see
 *   delivery status per lead in the CRM.
 * - Always fire-and-forget from callers; never let a messaging failure
 *   fail the lead-capture or member-join request.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { db, messagingConfigTable, leadMessagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

// ── DB migration (CREATE TABLE IF NOT EXISTS) ─────────────────────────────────

let migrationRan = false;

export async function ensureMessagingTables(): Promise<void> {
  if (migrationRan) return;
  migrationRan = true;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messaging_config (
        id                     SERIAL PRIMARY KEY,
        twilio_account_sid     TEXT NOT NULL DEFAULT '',
        twilio_auth_token      TEXT NOT NULL DEFAULT '',
        sms_from               TEXT NOT NULL DEFAULT '',
        whatsapp_from          TEXT NOT NULL DEFAULT '',
        sms_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
        whatsapp_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
        lead_welcome_template  TEXT NOT NULL DEFAULT 'Hi {{name}}! 👋 Thanks for your interest in GYMCO{{gymInfo}}. Our team will reach out shortly to schedule your visit. 💪',
        member_welcome_template TEXT NOT NULL DEFAULT 'Welcome to GYMCO, {{name}}! 🎉 Your fitness journey starts now. We''ll be in touch to schedule your complimentary fitness assessment.',
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_messages (
        id            SERIAL PRIMARY KEY,
        lead_id       INTEGER,
        user_id       INTEGER,
        to_number     TEXT NOT NULL,
        body          TEXT NOT NULL,
        channel       TEXT NOT NULL DEFAULT 'sms',
        status        TEXT NOT NULL DEFAULT 'queued',
        twilio_sid    TEXT,
        error_message TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_sms_sent BOOLEAN NOT NULL DEFAULT FALSE
    `);
    // Follow-up nudge config + message-type tag (additive, idempotent).
    await db.execute(sql`
      ALTER TABLE messaging_config ADD COLUMN IF NOT EXISTS nudge_enabled BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await db.execute(sql`
      ALTER TABLE messaging_config ADD COLUMN IF NOT EXISTS nudge_delay_hours INTEGER NOT NULL DEFAULT 24
    `);
    await db.execute(sql`
      ALTER TABLE messaging_config ADD COLUMN IF NOT EXISTS lead_nudge_template TEXT NOT NULL DEFAULT 'Hi {{name}}! 👋 Just checking in — we''d love to help you get started{{gymInfo}}. Reply here or drop by any time for a free tour. 💪'
    `);
    await db.execute(sql`
      ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'welcome'
    `);
  } catch {
    // Non-fatal: tables may already exist
    migrationRan = false; // allow retry next call if it was a transient error
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

export type MessagingConfig = {
  twilioAccountSid: string;
  twilioAuthToken: string;
  smsFrom: string;
  whatsappFrom: string;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  leadWelcomeTemplate: string;
  memberWelcomeTemplate: string;
  nudgeEnabled: boolean;
  nudgeDelayHours: number;
  leadNudgeTemplate: string;
};

const DEFAULT_CONFIG: MessagingConfig = {
  twilioAccountSid: "",
  twilioAuthToken: "",
  smsFrom: "",
  whatsappFrom: "",
  smsEnabled: false,
  whatsappEnabled: false,
  leadWelcomeTemplate:
    "Hi {{name}}! 👋 Thanks for your interest in GYMCO{{gymInfo}}. Our team will reach out shortly to schedule your visit. 💪",
  memberWelcomeTemplate:
    "Welcome to GYMCO, {{name}}! 🎉 Your fitness journey starts now. We'll be in touch to schedule your complimentary fitness assessment.",
  nudgeEnabled: false,
  nudgeDelayHours: 24,
  leadNudgeTemplate:
    "Hi {{name}}! 👋 Just checking in — we'd love to help you get started{{gymInfo}}. Reply here or drop by any time for a free tour. 💪",
};

export async function getMessagingConfig(): Promise<MessagingConfig> {
  await ensureMessagingTables();
  try {
    const [row] = await db.select().from(messagingConfigTable).limit(1);
    if (!row) return DEFAULT_CONFIG;
    return {
      twilioAccountSid: row.twilioAccountSid,
      twilioAuthToken: row.twilioAuthToken,
      smsFrom: row.smsFrom,
      whatsappFrom: row.whatsappFrom,
      smsEnabled: row.smsEnabled,
      whatsappEnabled: row.whatsappEnabled,
      leadWelcomeTemplate: row.leadWelcomeTemplate,
      memberWelcomeTemplate: row.memberWelcomeTemplate,
      nudgeEnabled: row.nudgeEnabled,
      nudgeDelayHours: row.nudgeDelayHours,
      leadNudgeTemplate: row.leadNudgeTemplate,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveMessagingConfig(
  patch: Partial<MessagingConfig>,
): Promise<MessagingConfig> {
  await ensureMessagingTables();
  const [existing] = await db.select().from(messagingConfigTable).limit(1);
  const values = {
    ...(patch.twilioAccountSid !== undefined && {
      twilioAccountSid: patch.twilioAccountSid,
    }),
    ...(patch.twilioAuthToken !== undefined && {
      twilioAuthToken: patch.twilioAuthToken,
    }),
    ...(patch.smsFrom !== undefined && { smsFrom: patch.smsFrom }),
    ...(patch.whatsappFrom !== undefined && {
      whatsappFrom: patch.whatsappFrom,
    }),
    ...(patch.smsEnabled !== undefined && { smsEnabled: patch.smsEnabled }),
    ...(patch.whatsappEnabled !== undefined && {
      whatsappEnabled: patch.whatsappEnabled,
    }),
    ...(patch.leadWelcomeTemplate !== undefined && {
      leadWelcomeTemplate: patch.leadWelcomeTemplate,
    }),
    ...(patch.memberWelcomeTemplate !== undefined && {
      memberWelcomeTemplate: patch.memberWelcomeTemplate,
    }),
    ...(patch.nudgeEnabled !== undefined && {
      nudgeEnabled: patch.nudgeEnabled,
    }),
    ...(patch.nudgeDelayHours !== undefined && {
      nudgeDelayHours: patch.nudgeDelayHours,
    }),
    ...(patch.leadNudgeTemplate !== undefined && {
      leadNudgeTemplate: patch.leadNudgeTemplate,
    }),
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(messagingConfigTable)
      .set(values)
      .where(eq(messagingConfigTable.id, existing.id));
  } else {
    await db.insert(messagingConfigTable).values({
      ...DEFAULT_CONFIG,
      ...values,
    });
  }
  return getMessagingConfig();
}

// ── Template rendering ────────────────────────────────────────────────────────

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// ── Twilio send ───────────────────────────────────────────────────────────────

/**
 * Normalize a phone number for use with Twilio.
 * - If it already starts with '+', use as-is.
 * - If it's a 10-digit Indian number, prefix +91.
 * - Otherwise just prepend '+'.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return phone.replace(/\s/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

type SendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

async function twilioSend(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<SendResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`;
  const creds = Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString(
    "base64",
  );
  const params = new URLSearchParams({
    From: opts.from,
    To: opts.to,
    Body: opts.body,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch (err) {
    return { ok: false, error: String(err) };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof json.message === "string"
        ? json.message
        : `HTTP ${res.status}`;
    return { ok: false, error: msg };
  }
  return { ok: true, sid: String(json.sid ?? "") };
}

// ── High-level helpers ────────────────────────────────────────────────────────

export type LeadWelcomeOutcome =
  | { attempted: true; ok: boolean; error?: string }
  | { attempted: false; reason: string };

/** Send a welcome WhatsApp/SMS to a new lead. Fire-and-forget safe. */
export async function sendLeadWelcome(opts: {
  leadId: number;
  name: string;
  phone: string;
  gymName?: string;
}): Promise<LeadWelcomeOutcome> {
  const cfg = await getMessagingConfig();
  if (!cfg.smsEnabled && !cfg.whatsappEnabled)
    return {
      attempted: false,
      reason: "Messaging is disabled — enable WhatsApp or SMS in Messaging settings.",
    };
  if (!cfg.twilioAccountSid || !cfg.twilioAuthToken)
    return {
      attempted: false,
      reason: "Twilio credentials are not configured in Messaging settings.",
    };

  const gymInfo = opts.gymName ? ` at ${opts.gymName}` : "";
  const body = renderTemplate(cfg.leadWelcomeTemplate, {
    name: opts.name.split(" ")[0] || opts.name,
    gymInfo,
    gymName: opts.gymName ?? "",
  });
  const toRaw = normalizePhone(opts.phone);

  if (cfg.whatsappEnabled && cfg.whatsappFrom) {
    const to = `whatsapp:${toRaw}`;
    const from = cfg.whatsappFrom.startsWith("whatsapp:")
      ? cfg.whatsappFrom
      : `whatsapp:${cfg.whatsappFrom}`;
    const result = await twilioSend({
      accountSid: cfg.twilioAccountSid,
      authToken: cfg.twilioAuthToken,
      from,
      to,
      body,
    });
    await db.insert(leadMessagesTable).values({
      leadId: opts.leadId,
      toNumber: to,
      body,
      channel: "whatsapp",
      status: result.ok ? "sent" : "failed",
      twilioSid: result.ok ? result.sid : null,
      errorMessage: result.ok ? null : result.error,
    });
    return {
      attempted: true,
      ok: result.ok,
      ...(result.ok ? {} : { error: result.error }),
    };
  } else if (cfg.smsEnabled && cfg.smsFrom) {
    const result = await twilioSend({
      accountSid: cfg.twilioAccountSid,
      authToken: cfg.twilioAuthToken,
      from: cfg.smsFrom,
      to: toRaw,
      body,
    });
    await db.insert(leadMessagesTable).values({
      leadId: opts.leadId,
      toNumber: toRaw,
      body,
      channel: "sms",
      status: result.ok ? "sent" : "failed",
      twilioSid: result.ok ? result.sid : null,
      errorMessage: result.ok ? null : result.error,
    });
    return {
      attempted: true,
      ok: result.ok,
      ...(result.ok ? {} : { error: result.error }),
    };
  }
  return {
    attempted: false,
    reason:
      "No sender number configured — set a WhatsApp or SMS 'from' number in Messaging settings.",
  };
}

/** Send a welcome WhatsApp/SMS to a newly registered member. Fire-and-forget. */
export async function sendMemberWelcome(opts: {
  userId: number;
  name: string;
  phone: string;
}): Promise<void> {
  const cfg = await getMessagingConfig();
  if (!cfg.smsEnabled && !cfg.whatsappEnabled) return;
  if (!cfg.twilioAccountSid || !cfg.twilioAuthToken) return;

  const body = renderTemplate(cfg.memberWelcomeTemplate, {
    name: opts.name.split(" ")[0] || opts.name,
  });
  const toRaw = normalizePhone(opts.phone);

  if (cfg.whatsappEnabled && cfg.whatsappFrom) {
    const to = `whatsapp:${toRaw}`;
    const from = cfg.whatsappFrom.startsWith("whatsapp:")
      ? cfg.whatsappFrom
      : `whatsapp:${cfg.whatsappFrom}`;
    const result = await twilioSend({
      accountSid: cfg.twilioAccountSid,
      authToken: cfg.twilioAuthToken,
      from,
      to,
      body,
    });
    await db.insert(leadMessagesTable).values({
      userId: opts.userId,
      toNumber: to,
      body,
      channel: "whatsapp",
      status: result.ok ? "sent" : "failed",
      twilioSid: result.ok ? result.sid : null,
      errorMessage: result.ok ? null : result.error,
    });
  } else if (cfg.smsEnabled && cfg.smsFrom) {
    const result = await twilioSend({
      accountSid: cfg.twilioAccountSid,
      authToken: cfg.twilioAuthToken,
      from: cfg.smsFrom,
      to: toRaw,
      body,
    });
    await db.insert(leadMessagesTable).values({
      userId: opts.userId,
      toNumber: toRaw,
      body,
      channel: "sms",
      status: result.ok ? "sent" : "failed",
      twilioSid: result.ok ? result.sid : null,
      errorMessage: result.ok ? null : result.error,
    });
  }
}

/** Send a follow-up nudge WhatsApp/SMS to a cold lead. Fire-and-forget safe. */
export async function sendLeadNudge(opts: {
  leadId: number;
  name: string;
  phone: string;
  gymName?: string;
}): Promise<void> {
  const cfg = await getMessagingConfig();
  if (!cfg.nudgeEnabled) return;
  if (!cfg.smsEnabled && !cfg.whatsappEnabled) return;
  if (!cfg.twilioAccountSid || !cfg.twilioAuthToken) return;

  const gymInfo = opts.gymName ? ` at ${opts.gymName}` : "";
  const body = renderTemplate(cfg.leadNudgeTemplate, {
    name: opts.name.split(" ")[0] || opts.name,
    gymInfo,
    gymName: opts.gymName ?? "",
  });
  const toRaw = normalizePhone(opts.phone);

  if (cfg.whatsappEnabled && cfg.whatsappFrom) {
    const to = `whatsapp:${toRaw}`;
    const from = cfg.whatsappFrom.startsWith("whatsapp:")
      ? cfg.whatsappFrom
      : `whatsapp:${cfg.whatsappFrom}`;
    const result = await twilioSend({
      accountSid: cfg.twilioAccountSid,
      authToken: cfg.twilioAuthToken,
      from,
      to,
      body,
    });
    await db.insert(leadMessagesTable).values({
      leadId: opts.leadId,
      toNumber: to,
      body,
      channel: "whatsapp",
      messageType: "nudge",
      status: result.ok ? "sent" : "failed",
      twilioSid: result.ok ? result.sid : null,
      errorMessage: result.ok ? null : result.error,
    });
  } else if (cfg.smsEnabled && cfg.smsFrom) {
    const result = await twilioSend({
      accountSid: cfg.twilioAccountSid,
      authToken: cfg.twilioAuthToken,
      from: cfg.smsFrom,
      to: toRaw,
      body,
    });
    await db.insert(leadMessagesTable).values({
      leadId: opts.leadId,
      toNumber: toRaw,
      body,
      channel: "sms",
      messageType: "nudge",
      status: result.ok ? "sent" : "failed",
      twilioSid: result.ok ? result.sid : null,
      errorMessage: result.ok ? null : result.error,
    });
  }
}

// ── Delivery status updates (Twilio status webhook) ──────────────────────────

/**
 * Progression rank for message statuses. Twilio callbacks can arrive out of
 * order (e.g. "sent" after "delivered"), so we never downgrade a status —
 * except that "failed"/"undelivered" always win since they are terminal errors.
 */
const STATUS_RANK: Record<string, number> = {
  queued: 0,
  accepted: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  undelivered: 5,
  failed: 5,
};

/**
 * Update the lead_messages row matching a Twilio message SID with the real
 * delivery status reported by Twilio's status callback.
 * Returns true when a row was updated.
 */
export async function updateMessageStatus(opts: {
  twilioSid: string;
  status: string;
  errorCode?: string | null;
}): Promise<boolean> {
  await ensureMessagingTables();
  const status = opts.status.toLowerCase().trim();
  if (!(status in STATUS_RANK)) return false;

  try {
    const [row] = await db
      .select()
      .from(leadMessagesTable)
      .where(eq(leadMessagesTable.twilioSid, opts.twilioSid))
      .limit(1);
    if (!row) return false;

    const currentRank = STATUS_RANK[row.status] ?? 0;
    if (STATUS_RANK[status]! < currentRank) return false; // out-of-order callback

    await db
      .update(leadMessagesTable)
      .set({
        status,
        ...(opts.errorCode
          ? { errorMessage: `Twilio error ${opts.errorCode}` }
          : {}),
      })
      .where(eq(leadMessagesTable.id, row.id));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate Twilio's X-Twilio-Signature header.
 * Twilio signs: full webhook URL + POST params (keys sorted alphabetically,
 * each appended as key+value), HMAC-SHA1 with the account's auth token,
 * base64-encoded. https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(opts: {
  authToken: string;
  signature: string;
  url: string;
  params: Record<string, string>;
}): boolean {
  const data =
    opts.url +
    Object.keys(opts.params)
      .sort()
      .map((k) => k + opts.params[k])
      .join("");
  const expected = createHmac("sha1", opts.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(opts.signature, "base64");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Retrieve all messages for a given lead. */
export async function getLeadMessages(leadId: number) {
  await ensureMessagingTables();
  try {
    return await db
      .select()
      .from(leadMessagesTable)
      .where(eq(leadMessagesTable.leadId, leadId))
      .orderBy(leadMessagesTable.createdAt);
  } catch {
    return [];
  }
}

let nudgeSweepRunning = false;

export async function runNudgeSweep(): Promise<void> {
  const now = Date.now();
  if (nudgeSweepRunning || now - lastNudgeSweepAt < NUDGE_SWEEP_MIN_INTERVAL_MS)
    return;
  nudgeSweepRunning = true;
  lastNudgeSweepAt = now;
  try {
    const cfg = await getMessagingConfig();
    if (!cfg.nudgeEnabled) return;
    if (!cfg.smsEnabled && !cfg.whatsappEnabled) return;
    if (!cfg.twilioAccountSid || !cfg.twilioAuthToken) return;

    const delayHours = Math.max(1, cfg.nudgeDelayHours || 24);
    const rows = await db.execute(sql`
      SELECT l.id, l.name, l.phone, l.gym_name
      FROM leads l
      WHERE l.status = 'new'
        AND l.updated_at < NOW() - make_interval(hours => ${delayHours})
        AND EXISTS (
          SELECT 1 FROM lead_messages m
          WHERE m.lead_id = l.id
            AND m.message_type = 'welcome'
            AND m.status = 'sent'
            AND m.created_at < NOW() - make_interval(hours => ${delayHours})
        )
        AND NOT EXISTS (
          SELECT 1 FROM lead_messages n
          WHERE n.lead_id = l.id AND n.message_type = 'nudge'
        )
      ORDER BY l.id
      LIMIT 50
    `);
    const leads = rows.rows as Record<string, unknown>[];
    for (const r of leads) {
      await sendLeadNudge({
        leadId: Number(r.id),
        name: String(r.name ?? ""),
        phone: String(r.phone ?? ""),
        gymName: String(r.gym_name ?? "") || undefined,
      });
    }
  } catch {
    // Never let the sweep break the calling request.
  } finally {
    nudgeSweepRunning = false;
  }
}

const NUDGE_SWEEP_MIN_INTERVAL_MS = 5 * 60 * 1000;

let lastNudgeSweepAt = 0;
