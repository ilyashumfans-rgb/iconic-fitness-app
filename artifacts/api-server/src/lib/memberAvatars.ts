import { and, inArray, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/**
 * Batch avatar lookup for staff-facing rosters. Staff screens show the
 * member's profile photo (uploaded from the app) so the person can be
 * visually verified at the door; UI falls back to initials when empty.
 *
 * Two lookup paths:
 *  - by userId (records already linked to an app account) — exact.
 *  - by phone last-10 digits (records that only carry a mobile number).
 *    Ambiguous matches (two users sharing the same last 10 digits) are
 *    skipped: never show the WRONG person's photo to staff.
 */

/** Normalize a free-format phone to its last 10 digits, or null. */
export function phoneLast10(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return last10.length === 10 ? last10 : null;
}

/** userId → avatarUrl (only non-empty avatars are included). */
export async function avatarsByUserId(
  userIds: Array<number | null | undefined>,
): Promise<Map<number, string>> {
  const ids = [
    ...new Set(
      userIds.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0),
    ),
  ];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: usersTable.id, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, ids));
  return new Map(rows.filter((r) => r.avatarUrl).map((r) => [r.id, r.avatarUrl]));
}

/** phone-last-10 → avatarUrl. Ambiguous numbers are omitted. */
export async function avatarsByPhone(
  phones: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const keys = [
    ...new Set(phones.map(phoneLast10).filter((k): k is string => k !== null)),
  ];
  if (keys.length === 0) return new Map();
  const last10Expr = sql<string>`right(regexp_replace(${usersTable.mobile}, '[^0-9]', '', 'g'), 10)`;
  const rows = await db
    .select({ id: usersTable.id, last10: last10Expr, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(
      and(
        sql`length(regexp_replace(${usersTable.mobile}, '[^0-9]', '', 'g')) >= 10`,
        inArray(last10Expr, keys),
      ),
    );
  const byKey = new Map<string, { count: number; avatarUrl: string }>();
  for (const r of rows) {
    const cur = byKey.get(r.last10);
    if (cur) cur.count += 1;
    else byKey.set(r.last10, { count: 1, avatarUrl: r.avatarUrl });
  }
  const out = new Map<string, string>();
  for (const [k, v] of byKey) {
    if (v.count === 1 && v.avatarUrl) out.set(k, v.avatarUrl);
  }
  return out;
}

/**
 * Resolve one avatar for a record carrying an optional userId and phone.
 * Prefer the exact userId link; fall back to the unambiguous phone match.
 */
export function pickAvatar(
  byUser: Map<number, string>,
  byPhone: Map<string, string>,
  userId: number | null | undefined,
  phone: string | null | undefined,
): string | null {
  if (userId != null) {
    const a = byUser.get(userId);
    if (a) return a;
  }
  const key = phoneLast10(phone);
  return (key && byPhone.get(key)) || null;
}
