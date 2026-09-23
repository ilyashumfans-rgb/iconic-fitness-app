import { createHmac, randomInt, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export class OtpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const invalid = () => new OtpError(401, "Code is invalid or expired. Please request a new code.");
const conflict = () => new OtpError(409, "Unable to sign in with this number. Please contact your gym.");
const disabledIdentity = () => new OtpError(403, "This account is disabled. Please contact your gym.");

export function normalizeOtpPhone(value: string): string | null {
  if (!/^[+\d ()-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `91${local}` : null;
}
export function isNewOtpPhoneAssignment(current: string, requested: string): boolean {
  const phone = normalizeOtpPhone(requested);
  return phone !== null && normalizeOtpPhone(current) !== phone;
}
export function keyedHash(secret: string, scope: string, value: string): string {
  return createHmac("sha256", secret).update(`${scope}\0${value}`).digest("hex");
}
export function codeMatches(expected: string, actual: string): boolean {
  return expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export async function sendWhatsappOtp(phone: string, code: string): Promise<void> {
  const apiKey = process.env.W4U_API_KEY;
  const apiSecret = process.env.W4U_API_SECRET;
  if (!apiKey || !apiSecret) throw new OtpError(503, "WhatsApp sign-in is temporarily unavailable.");
  try {
    const response = await fetch("https://iconicfitnesshsr.w4u.in/api/wapi/v1?resource=send/template", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey, "X-Api-Secret": apiSecret, "User-Agent": "IconicFitness/1.0" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        to: phone, template_name: "otp_message", language: "en_US",
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      }),
    });
    const body = await response.json() as { success?: boolean; message_id?: unknown; wa_message_id?: unknown; delivery_status?: string };
    if (!response.ok || body.success !== true || (!body.message_id && !body.wa_message_id) || ["failed", "undelivered"].includes(body.delivery_status ?? "")) {
      throw new Error("Delivery rejected");
    }
  } catch {
    // Never propagate provider body/errors: they can contain the OTP and credentials.
    throw new OtpError(502, "WhatsApp could not send your code. Please wait a minute and try again.");
  }
}

export type OtpIdentity = {
  id: string;
  createdAt: number;
  email: string | null;
  emails: string[];
  name: string;
  avatarUrl: string;
  disabled: boolean;
};
export type OtpDependencies = {
  pool: Pool;
  secret: string;
  send: (phone: string, code: string) => Promise<void>;
  identity: (id: string) => Promise<OtpIdentity>;
  ticket: (id: string) => Promise<string>;
};
type Member = { id: number; clerk_user_id: string | null; mobile: string; email: string };
type PhoneLink = { phone: string; user_id: number; clerk_user_id: string };

// Strict normalization, not suffix matching: a non-Indian country code cannot
// collide with an Indian number just because the final ten digits match.
const normalizedSql = (column: string) => `CASE
  WHEN regexp_replace(${column}, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
    THEN '91' || regexp_replace(${column}, '[^0-9]', '', 'g')
  WHEN regexp_replace(${column}, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
    THEN regexp_replace(${column}, '[^0-9]', '', 'g') END`;

export class WhatsappOtpService {
  constructor(private readonly deps: OtpDependencies) {}
  private hash(scope: string, value: string) { return keyedHash(this.deps.secret, scope, value); }
  private async tx<T>(fn: (tx: PoolClient) => Promise<T>): Promise<T> {
    const tx = await this.deps.pool.connect();
    try {
      await tx.query("BEGIN");
      const result = await fn(tx);
      await tx.query("COMMIT");
      return result;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally { tx.release(); }
  }
  private async lock(tx: PoolClient, key: string) {
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`whatsapp:${key}`]);
  }
  private async candidates(tx: PoolClient, phone: string): Promise<Member[]> {
    const rows = await tx.query<Member>(`SELECT u.id,u.clerk_user_id,u.mobile,u.email FROM users u
      WHERE ${normalizedSql("u.mobile")} = $1 OR u.id IN
      (SELECT user_id FROM whatsapp_phone_links WHERE phone=$1) ORDER BY u.id FOR UPDATE`, [phone]);
    return rows.rows;
  }
  private async canonical(tx: PoolClient, phone: string): Promise<PhoneLink | undefined> {
    const result = await tx.query<PhoneLink>("SELECT phone,user_id,clerk_user_id FROM whatsapp_phone_links WHERE phone=$1 FOR UPDATE", [phone]);
    return result.rows[0];
  }
  private assertEnabledIdentity(identity: OtpIdentity) {
    if (identity.disabled) throw disabledIdentity();
  }
  private async link(tx: PoolClient, phone: string, member: Member, clerkId: string) {
    const links = await tx.query("SELECT * FROM whatsapp_phone_links WHERE phone=$1 OR user_id=$2 OR clerk_user_id=$3 FOR UPDATE", [phone, member.id, clerkId]);
    if (links.rows.some((l) => l.phone !== phone || l.user_id !== member.id || l.clerk_user_id !== clerkId)) throw conflict();
    await tx.query(`INSERT INTO whatsapp_phone_links(phone,user_id,clerk_user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [phone, member.id, clerkId]);
    const persisted = await tx.query<PhoneLink>("SELECT phone,user_id,clerk_user_id FROM whatsapp_phone_links WHERE phone=$1", [phone]);
    const link = persisted.rows[0];
    if (!link || link.user_id !== member.id || link.clerk_user_id !== clerkId) throw conflict();
  }
  async request(mobile: string, ip: string) {
    const phone = normalizeOtpPhone(mobile);
    if (!phone) throw new OtpError(400, "Enter a valid 10-digit Indian mobile number.");
    const id = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.tx(async (tx) => {
      // Global ordering avoids deadlocks; persistent budgets survive restarts.
      const keys = [`ip:${this.hash("ip", ip)}`, `phone:${phone}`].sort();
      for (const key of keys) await this.lock(tx, key);
      for (const key of keys) {
        const budget = await tx.query(`SELECT *, clock_timestamp() AS now FROM whatsapp_otp_budgets WHERE key=$1 FOR UPDATE`, [key]);
        const b = budget.rows[0];
        const isPhone = key.startsWith("phone:");
        const now = b ? new Date(b.now).getTime() : Date.now();
        const active = b && now - new Date(b.window_start).getTime() < 3_600_000;
        if ((isPhone && b && now - new Date(b.last_sent_at).getTime() < 60_000) || (active && b.count >= (isPhone ? 5 : 20))) {
          throw new OtpError(429, "Too many code requests. Please wait before trying again.");
        }
        await tx.query(`INSERT INTO whatsapp_otp_budgets(key,window_start,count,last_sent_at)
          VALUES($1,clock_timestamp(),1,clock_timestamp()) ON CONFLICT(key) DO UPDATE SET
          window_start=CASE WHEN $2 THEN whatsapp_otp_budgets.window_start ELSE clock_timestamp() END,
          count=CASE WHEN $2 THEN whatsapp_otp_budgets.count+1 ELSE 1 END,last_sent_at=clock_timestamp()`, [key, !!active]);
      }
      await tx.query("UPDATE whatsapp_otp_challenges SET state='superseded' WHERE phone=$1 AND state IN ('pending','active')", [phone]);
      // A resend revokes signup continuations too.
      await tx.query("UPDATE whatsapp_otp_continuations SET consumed_at=clock_timestamp() WHERE phone=$1 AND consumed_at IS NULL", [phone]);
      await tx.query(`INSERT INTO whatsapp_otp_challenges(id,phone,code_hash,state,expires_at)
        VALUES($1,$2,$3,'pending',clock_timestamp()+interval '10 minutes')`, [id, phone, this.hash(`code:${id}`, code)]);
    });
    try {
      await this.deps.send(phone, code);
    } catch (error) {
      await this.deps.pool.query("UPDATE whatsapp_otp_challenges SET state='failed' WHERE id=$1 AND state='pending'", [id]);
      throw error instanceof OtpError ? error : new OtpError(502, "WhatsApp could not send your code. Please try again later.");
    }
    const activated = await this.deps.pool.query("UPDATE whatsapp_otp_challenges SET state='active' WHERE id=$1 AND state='pending' AND expires_at>clock_timestamp() RETURNING id", [id]);
    if (!activated.rowCount) throw new OtpError(409, "A newer code was requested. Please use the latest code.");
    return { challengeId: id, expiresInSeconds: 600 as const, resendAfterSeconds: 60 as const };
  }
  async verify(id: string, code: string) {
    // Consume in a separate committed transaction BEFORE any external call.
    // Provider/ticket failures can never make a verified OTP replayable.
    const phone = await this.tx(async (tx) => {
      const lookup = await tx.query("SELECT phone FROM whatsapp_otp_challenges WHERE id=$1", [id]);
      if (!lookup.rows[0]) return null;
      await this.lock(tx, `phone:${lookup.rows[0].phone}`);
      const { rows } = await tx.query("SELECT *, expires_at>clock_timestamp() AS valid FROM whatsapp_otp_challenges WHERE id=$1 FOR UPDATE", [id]);
      const challenge = rows[0];
      if (!challenge || challenge.state !== "active" || !challenge.valid || challenge.attempts >= 5) return null;
      if (!codeMatches(challenge.code_hash, this.hash(`code:${id}`, code))) {
        await tx.query("UPDATE whatsapp_otp_challenges SET attempts=attempts+1 WHERE id=$1", [id]);
        return null;
      }
      await tx.query("UPDATE whatsapp_otp_challenges SET state='consumed' WHERE id=$1", [id]);
      return challenge.phone as string;
    });
    if (!phone) throw invalid();
    return this.tx(async (tx) => {
      await this.lock(tx, `phone:${phone}`);
      const newer = await tx.query(`SELECT 1 FROM whatsapp_otp_challenges WHERE phone=$1 AND created_at>
        (SELECT created_at FROM whatsapp_otp_challenges WHERE id=$2) LIMIT 1`, [phone, id]);
      if (newer.rowCount) throw invalid();
      const members = await this.candidates(tx, phone);
      const canonical = await this.canonical(tx, phone);
      if (canonical) {
        const member = members.find((candidate) => candidate.id === canonical.user_id);
        if (!member || member.clerk_user_id !== canonical.clerk_user_id) throw conflict();
        const identity = await this.deps.identity(canonical.clerk_user_id);
        if (identity.id !== canonical.clerk_user_id) throw conflict();
        this.assertEnabledIdentity(identity);
        const ticket = await this.deps.ticket(identity.id);
        return { ticket, isNewUser: false as const };
      }
      if (members.length === 1) {
        const member = members[0]!;
        if (member.clerk_user_id) {
          const identity = await this.deps.identity(member.clerk_user_id);
          if (identity.id !== member.clerk_user_id) throw conflict();
          this.assertEnabledIdentity(identity);
          await this.link(tx, phone, member, identity.id);
          const ticket = await this.deps.ticket(identity.id);
          return { ticket, isNewUser: false as const };
        }
      }
      const continuationToken = randomBytes(32).toString("hex");
      await tx.query(`INSERT INTO whatsapp_otp_continuations(token_hash,phone,created_at,expires_at)
        SELECT $1,$2,created_at,clock_timestamp()+interval '10 minutes' FROM whatsapp_otp_challenges WHERE id=$3`, [this.hash("continuation", continuationToken), phone, id]);
      return {
        continuationToken,
        isNewUser: true as const,
        requiresEmailVerification: true as const,
        ...(members.length ? { requiresAccountSignIn: true as const } : {}),
      };
    });
  }
  async complete(token: string, clerkId: string) {
    const identity = await this.deps.identity(clerkId);
    if (identity.id !== clerkId) throw conflict();
    if (!identity.email) throw new OtpError(401, "Verify your email before completing sign-up.");
    this.assertEnabledIdentity(identity);
    return this.tx(async (tx) => {
      const hash = this.hash("continuation", token);
      const lookup = await tx.query("SELECT phone FROM whatsapp_otp_continuations WHERE token_hash=$1", [hash]);
      if (!lookup.rows[0]) throw invalid();
      const phone = lookup.rows[0].phone as string;
      await this.lock(tx, `phone:${phone}`);
      // Same lock as currentUser's JIT provision; one atomic user/setup winner.
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`member:${clerkId}`]);
      const { rows } = await tx.query("SELECT *,expires_at>clock_timestamp() AS valid FROM whatsapp_otp_continuations WHERE token_hash=$1 FOR UPDATE", [hash]);
      const continuation = rows[0];
      if (!continuation || continuation.consumed_at || !continuation.valid) throw invalid();
      // The caller proves both phone possession and their authenticated,
      // verified-email account. Explicit UI confirmation permits recovery of
      // an interrupted signup or linking an existing account with no mobile.
      // Differing mobiles and disabled identities still fail closed.
      const members = await this.candidates(tx, phone);
      const canonical = await this.canonical(tx, phone);
      if (canonical && canonical.clerk_user_id !== clerkId) throw conflict();
      const existing = await tx.query<Member>("SELECT id,clerk_user_id,mobile,email FROM users WHERE clerk_user_id=$1 FOR UPDATE", [clerkId]);
      let member: Member | undefined;
      let inserted = false;
      if (members.length) {
        const exact = members.filter((candidate) => candidate.clerk_user_id === clerkId);
        const emailMatches = members.filter((candidate) =>
          candidate.clerk_user_id == null && candidate.email.trim().toLowerCase() === identity.email!.toLowerCase());
        if (exact.length === 1) member = exact[0];
        else if (exact.length === 0 && emailMatches.length === 1) member = emailMatches[0];
        else throw conflict();
        if (existing.rows[0] && existing.rows[0].id !== member!.id) throw conflict();
        if (member.clerk_user_id == null) {
          const claimed = await tx.query<Member>(`UPDATE users SET clerk_user_id=$1 WHERE id=$2 AND clerk_user_id IS NULL
            RETURNING id,clerk_user_id,mobile,email`, [clerkId, member.id]);
          if (!claimed.rows[0]) throw conflict();
          member = claimed.rows[0];
        }
      } else {
        member = existing.rows[0];
      }
      if (member && member.mobile.trim() && normalizeOtpPhone(member.mobile) !== phone) throw conflict();
      if (!member) {
        const created = await tx.query<Member>(`INSERT INTO users
          (clerk_user_id,name,email,mobile,gender,age,height_cm,weight_kg,fitness_goal,avatar_url,city,member_code)
          VALUES($1,$2,$3,$4,'prefer_not_to_say',NULL,NULL,NULL,NULL,$5,'Bengaluru',$6)
          RETURNING id,clerk_user_id,mobile,email`,
        [clerkId, identity.name || "Member", identity.email, phone.slice(2), identity.avatarUrl, `GYM-${randomBytes(6).toString("hex").toUpperCase()}`]);
        member = created.rows[0]!;
        await tx.query("INSERT INTO fitness_setup(user_id,required_for_onboarding,current_step) VALUES($1,true,1)", [member.id]);
        inserted = true;
      } else if (!members.length) {
        // Preserve JIT enrollment; never rewrite setup or legacy profile fields.
        await tx.query("UPDATE users SET mobile=$1 WHERE id=$2 AND btrim(mobile)=''", [phone.slice(2), member.id]);
      }
      await this.link(tx, phone, member, clerkId);
      await tx.query("UPDATE whatsapp_otp_continuations SET consumed_at=clock_timestamp() WHERE token_hash=$1", [hash]);
      return { isNewUser: inserted, userId: member.id };
    });
  }
}