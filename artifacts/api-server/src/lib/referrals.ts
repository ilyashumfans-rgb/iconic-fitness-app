import { randomInt } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  referralSettingsTable,
  usersTable,
  walletsTable,
  walletTransactionsTable,
} from "@workspace/db";

// Refer & Earn core: rupee-valued wallet points (1 point = ₹1) on top of the
// existing wallets/wallet_transactions tables. All credits/debits go through
// creditWallet/debitWallet so the balance snapshot and ledger stay in sync.

export type ReferralSettings = {
  rewardType: "fixed" | "percent";
  rewardValue: number;
  isActive: boolean;
};

// Code-default: applies until an admin saves settings (row lazily created).
const DEFAULT_SETTINGS: ReferralSettings = {
  rewardType: "fixed",
  rewardValue: 100,
  isActive: true,
};

export async function getReferralSettings(): Promise<ReferralSettings> {
  const [row] = await db.select().from(referralSettingsTable).limit(1);
  if (!row) return DEFAULT_SETTINGS;
  return {
    rewardType: row.rewardType === "percent" ? "percent" : "fixed",
    rewardValue: Math.max(0, row.rewardValue),
    isActive: row.isActive,
  };
}

export async function saveReferralSettings(
  s: ReferralSettings,
): Promise<ReferralSettings> {
  const [existing] = await db.select().from(referralSettingsTable).limit(1);
  const values = {
    rewardType: s.rewardType,
    rewardValue: Math.max(0, Math.round(s.rewardValue)),
    isActive: s.isActive,
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(referralSettingsTable)
      .set(values)
      .where(eq(referralSettingsTable.id, existing.id));
  } else {
    await db.insert(referralSettingsTable).values(values);
  }
  return getReferralSettings();
}

export async function walletBalance(userId: number): Promise<number> {
  const [w] = await db
    .select({ balanceInr: walletsTable.balanceInr })
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));
  return w?.balanceInr ?? 0;
}

/** Unwrap Postgres unique-violation errors (drizzle may nest the pg error in `cause`). */
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Lock (creating if needed) the caller's wallet row inside a transaction and
 * return its current balance. FOR UPDATE serializes concurrent credits/debits
 * for the same member so clamping never reads a stale balance.
 */
async function lockWalletRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: number,
): Promise<number> {
  await tx
    .insert(walletsTable)
    .values({ userId, balanceInr: 0 })
    .onConflictDoNothing({ target: walletsTable.userId });
  const [row] = await tx
    .select({ balanceInr: walletsTable.balanceInr })
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .for("update");
  return row?.balanceInr ?? 0;
}

/**
 * Credit points; no-op (returns false) when the (refType, refId) was already
 * credited. Idempotency is enforced by the wallet_tx_ref_unique DB index, so
 * concurrent duplicate calls can never double-credit.
 */
export async function creditWallet(opts: {
  userId: number;
  amountInr: number;
  label: string;
  kind: string;
  refType: string;
  refId: string;
}): Promise<boolean> {
  const amount = Math.max(0, Math.round(opts.amountInr));
  if (amount <= 0) return false;
  try {
    await db.transaction(async (tx) => {
      await lockWalletRow(tx, opts.userId);
      await tx.insert(walletTransactionsTable).values({
        userId: opts.userId,
        label: opts.label,
        amountInr: amount,
        kind: opts.kind,
        refType: opts.refType,
        refId: opts.refId,
      });
      await tx
        .update(walletsTable)
        .set({ balanceInr: sql`${walletsTable.balanceInr} + ${amount}` })
        .where(eq(walletsTable.userId, opts.userId));
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false; // already credited for this ref
    throw err;
  }
}

/**
 * Debit points, clamped to the current balance (the balance may have dropped
 * between quote and settlement). Returns the amount actually debited.
 * Idempotent per (refType, refId) via the wallet_tx_ref_unique DB index; the
 * FOR UPDATE row lock serializes concurrent debits so two requests can never
 * both spend the same points.
 */
export async function debitWallet(opts: {
  userId: number;
  amountInr: number;
  label: string;
  refType: string;
  refId: string;
}): Promise<number> {
  const requested = Math.max(0, Math.round(opts.amountInr));
  if (requested <= 0) return 0;
  try {
    return await db.transaction(async (tx) => {
      const balance = await lockWalletRow(tx, opts.userId);
      const amount = Math.min(requested, balance);
      if (amount <= 0) return 0;
      await tx.insert(walletTransactionsTable).values({
        userId: opts.userId,
        label: opts.label,
        amountInr: -amount,
        kind: "debit",
        refType: opts.refType,
        refId: opts.refId,
      });
      await tx
        .update(walletsTable)
        .set({ balanceInr: sql`${walletsTable.balanceInr} - ${amount}` })
        .where(eq(walletsTable.userId, opts.userId));
      return amount;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return 0; // already settled for this ref
    throw err;
  }
}

// Unambiguous alphabet (no 0/O/1/I) for shareable codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `ICN-${s}`;
}

/** Lazily generate (and persist) the member's shareable referral code. */
export async function ensureReferralCode(userId: number): Promise<string> {
  const [user] = await db
    .select({ referralCode: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (user?.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      // Conditional update + unique index: a concurrent request that already
      // assigned a code makes this a no-op, and a code collision throws 23505.
      const [updated] = await db
        .update(usersTable)
        .set({ referralCode: code })
        .where(
          and(eq(usersTable.id, userId), sql`${usersTable.referralCode} IS NULL`),
        )
        .returning({ referralCode: usersTable.referralCode });
      if (updated?.referralCode) return updated.referralCode;
      break; // someone else assigned it concurrently — re-read below
    } catch (err) {
      if (isUniqueViolation(err)) continue; // rare code collision — retry
      throw err;
    }
  }
  const [after] = await db
    .select({ referralCode: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (after?.referralCode) return after.referralCode;
  // Practically unreachable (32^6 space); deterministic fallback stays unique.
  const code = `ICN-U${userId}`;
  await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, userId));
  return code;
}

/**
 * Credit the referrer once per referred member, on that member's first paid
 * purchase. Reward = fixed ₹ or a percent of the paid amount, per admin
 * settings. Never throws — a points failure must not break a payment landing.
 */
export async function creditReferralRewardOnce(
  buyerUserId: number | null | undefined,
  paidAmountInr: number,
): Promise<void> {
  try {
    if (!buyerUserId) return;
    const [buyer] = await db
      .select({ referredBy: usersTable.referredBy, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, buyerUserId));
    if (!buyer || buyer.referredBy <= 0) return;
    const settings = await getReferralSettings();
    if (!settings.isActive) return;
    const reward =
      settings.rewardType === "percent"
        ? Math.round((paidAmountInr * settings.rewardValue) / 100)
        : settings.rewardValue;
    if (reward <= 0) return;
    const firstName = (buyer.name ?? "").trim().split(/\s+/)[0] || "a friend";
    await creditWallet({
      userId: buyer.referredBy,
      amountInr: reward,
      label: `Referral reward — ${firstName} made their first purchase`,
      kind: "referral",
      refType: "referral_reward",
      refId: String(buyerUserId),
    });
  } catch {
    // Deliberately swallowed: reward crediting is best-effort on money paths.
  }
}

export async function referralSummary(userId: number) {
  const [code, balanceInr, settings, [referred], history] = await Promise.all([
    ensureReferralCode(userId),
    walletBalance(userId),
    getReferralSettings(),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.referredBy, userId)),
    db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.userId, userId))
      .orderBy(desc(walletTransactionsTable.createdAt))
      .limit(30),
  ]);
  const [me] = await db
    .select({ referredBy: usersTable.referredBy })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return {
    code,
    balanceInr,
    referredCount: referred?.count ?? 0,
    appliedCode: (me?.referredBy ?? 0) > 0,
    rewardType: settings.rewardType,
    rewardValue: settings.rewardValue,
    isActive: settings.isActive,
    history: history.map((t) => ({
      id: t.id,
      label: t.label,
      amountInr: t.amountInr,
      kind: t.kind,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
