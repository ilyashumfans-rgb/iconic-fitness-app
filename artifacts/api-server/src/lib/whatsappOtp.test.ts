import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { WhatsappOtpService, OtpError, normalizeOtpPhone, isNewOtpPhoneAssignment, keyedHash, codeMatches, type OtpIdentity, sendWhatsappOtp } from "./whatsappOtp";

test("phone normalization is full-number, not suffix matching", () => {
  for (const value of ["9876543210", "+91 98765 43210", "919876543210", "(98765) 43210"]) assert.equal(normalizeOtpPhone(value), "919876543210");
  for (const value of ["+449876543210", "00919876543210", "1234567890", "9876543210x", "1".repeat(100)]) assert.equal(normalizeOtpPhone(value), null);
  const hash = keyedHash("test-secret", "code:1", "123456");
  assert.notEqual(hash, "123456");
  assert.equal(codeMatches(hash, keyedHash("test-secret", "code:1", "123456")), true);
  assert.equal(codeMatches(hash, keyedHash("test-secret", "code:2", "123456")), false);
  assert.equal(isNewOtpPhoneAssignment("+91 98765 43210", "9876543210"), false);
  assert.equal(isNewOtpPhoneAssignment("", "9876543210"), true);
});

test("W4U sender contract and sanitized failure, without network sends", async () => {
  const original = globalThis.fetch;
  const key = process.env.W4U_API_KEY, secret = process.env.W4U_API_SECRET;
  process.env.W4U_API_KEY = "test-key"; process.env.W4U_API_SECRET = "test-secret";
  try {
    let calls = 0;
    globalThis.fetch = (async (url, options) => {
      calls++;
      assert.equal(String(url), "https://iconicfitnesshsr.w4u.in/api/wapi/v1?resource=send/template");
      const headers = options!.headers as Record<string, string>;
      assert.equal(headers["User-Agent"], "IconicFitness/1.0");
      const body = JSON.parse(String(options!.body));
      assert.deepEqual(body, {
        to: "919876543210", template_name: "otp_message", language: "en_US",
        components: [
          { type: "body", parameters: [{ type: "text", text: "123456" }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "123456" }] },
        ],
      });
      return new Response(JSON.stringify({ success: true, message_id: "mock-id" }), { status: 200 });
    }) as typeof fetch;
    await sendWhatsappOtp("919876543210", "123456");
    assert.equal(calls, 1);
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ success: false, error_message: "private 123456" }), { status: 400 });
    }) as typeof fetch;
    await assert.rejects(sendWhatsappOtp("919876543210", "123456"), (e: unknown) => e instanceof OtpError && e.status === 502 && !e.message.includes("123456"));
    assert.equal(calls, 2); // no automatic retries
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.W4U_API_KEY; else process.env.W4U_API_KEY = key;
    if (secret === undefined) delete process.env.W4U_API_SECRET; else process.env.W4U_API_SECRET = secret;
  }
});

test("Postgres OTP lifecycle, concurrency, matching and signup", { skip: !process.env.DATABASE_URL }, async (t) => {
  // Isolated test-only schema, never real customer rows. All external identity,
  // ticket and WhatsApp operations are mocked. No real messages are sent.
  const schema = `otp_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 10 });
  const sent = new Map<string, string>();
  const identities = new Map<string, OtpIdentity>();
  let ticketCount = 0, sendCount = 0, lastTicketUserId: string | null = null;
  const service = new WhatsappOtpService({
    pool, secret: "test-only-secret-with-enough-entropy",
    send: async (phone, code) => { sent.set(phone, code); sendCount++; },
    identity: async (id) => { const i = identities.get(id); if (!i) throw new Error("Unknown mock identity"); return i; },
    ticket: async (id) => { ticketCount++; lastTicketUserId = id; return "mock-ticket"; },
  });
  const identity = (id: string, changes: Partial<OtpIdentity> = {}) => {
    const result = { id, createdAt: Date.now(), email: `${id}@example.test`, emails: [`${id}@example.test`], name: "Test Member", avatarUrl: "", disabled: false, ...changes };
    identities.set(id, result);
    return result;
  };
  const request = async (phone: string, ip: string = randomUUID()) => {
    const result = await service.request(phone, ip);
    return { ...result, code: sent.get(normalizeOtpPhone(phone)!)! };
  };
  const status = (n: number) => (e: unknown) => e instanceof OtpError && e.status === n;
  const addMember = async (id: string, phone: string, email = `${id}@example.test`) => {
    identity(id);
    const { rows } = await pool.query("INSERT INTO users(clerk_user_id,mobile,email) VALUES($1,$2,$3) RETURNING id", [id, phone, email]);
    return rows[0].id as number;
  };
  try {
    await pool.query(`
      CREATE TABLE whatsapp_otp_challenges(id uuid PRIMARY KEY,phone text NOT NULL,code_hash text NOT NULL,state text NOT NULL,attempts integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL);
      CREATE TABLE whatsapp_otp_budgets(key text PRIMARY KEY,window_start timestamptz NOT NULL,count integer NOT NULL,last_sent_at timestamptz NOT NULL);
      CREATE TABLE whatsapp_phone_links(phone text PRIMARY KEY,user_id integer UNIQUE NOT NULL,clerk_user_id text UNIQUE NOT NULL,verified_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE whatsapp_otp_continuations(token_hash text PRIMARY KEY,phone text NOT NULL,created_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,consumed_at timestamptz);
      CREATE TABLE users(id serial PRIMARY KEY,clerk_user_id text UNIQUE,name text DEFAULT 'Member',email text NOT NULL,mobile text NOT NULL,gender text,age integer,height_cm real,weight_kg real,fitness_goal text,avatar_url text,city text,member_code text);
      CREATE TABLE fitness_setup(user_id integer UNIQUE NOT NULL,required_for_onboarding boolean NOT NULL,current_step integer NOT NULL);
      CREATE TABLE admins(email text);
      CREATE TABLE staff(email text);
      CREATE TABLE partner_staff(email text);
      CREATE TABLE partners(email text,phone text);
    `);
    await t.test("wrong codes persist attempts; fifth failure exhausts; no provisioning", async () => {
      const c = await request("9000000001");
      assert.match(c.code, /^\d{6}$/);
      const wrong = c.code === "000000" ? "000001" : "000000";
      for (let n = 0; n < 5; n++) await assert.rejects(service.verify(c.challengeId, wrong), status(401));
      await assert.rejects(service.verify(c.challengeId, c.code), status(401));
      const row = (await pool.query("SELECT * FROM whatsapp_otp_challenges WHERE id=$1", [c.challengeId])).rows[0];
      assert.equal(row.attempts, 5);
      assert.notEqual(row.code_hash, c.code);
      assert.equal((await pool.query("SELECT * FROM users")).rowCount, 0);
    });
    await t.test("expiry and unknown challenge fail closed", async () => {
      const c = await request("9000000002");
      await pool.query("UPDATE whatsapp_otp_challenges SET expires_at=now()-interval '1 second' WHERE id=$1", [c.challengeId]);
      await assert.rejects(service.verify(c.challengeId, c.code), status(401));
      await assert.rejects(service.verify(randomUUID(), "123456"), status(401));
    });
    await t.test("resend invalidates earlier code and enforces 60s cooldown", async () => {
      const c = await request("9000000003");
      await assert.rejects(request("9000000003"), status(429));
      await pool.query("UPDATE whatsapp_otp_budgets SET last_sent_at=now()-interval '61 seconds' WHERE key=$1", ["phone:919000000003"]);
      const next = await request("9000000003");
      await assert.rejects(service.verify(c.challengeId, c.code), status(401));
      assert.equal((await service.verify(next.challengeId, next.code)).isNewUser, true);
    });
    await t.test("simultaneous issuance sends only once", async () => {
      const before = sendCount;
      const results = await Promise.allSettled([request("9000000004"), request("9000000004")]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(sendCount - before, 1);
    });
    await t.test("IP and phone budgets persist and reject before send", async () => {
      const ip = "test-limited-ip";
      await pool.query("INSERT INTO whatsapp_otp_budgets VALUES($1,now(),20,now()-interval '61 seconds')", [`ip:${keyedHash("test-only-secret-with-enough-entropy", "ip", ip)}`]);
      await assert.rejects(request("9000000005", ip), status(429));
      await pool.query("INSERT INTO whatsapp_otp_budgets VALUES($1,now(),5,now()-interval '61 seconds')", ["phone:919000000005"]);
      await assert.rejects(request("9000000005"), status(429));
    });
    await t.test("existing exact-format member is durably linked before its only ticket escapes", async () => {
      const userId = await addMember("existing", "+91 90000 00006");
      const c = await request("9000000006");
      const before = ticketCount;
      const results = await Promise.allSettled([service.verify(c.challengeId, c.code), service.verify(c.challengeId, c.code)]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(ticketCount - before, 1);
      assert.equal((await pool.query("SELECT * FROM whatsapp_phone_links WHERE user_id=$1", [userId])).rowCount, 1);
      assert.equal((await pool.query("SELECT * FROM fitness_setup WHERE user_id=$1", [userId])).rowCount, 0);
    });
    await t.test("legacy duplicates and unlinked profiles receive account-proof continuations; staff and admin members can sign in", async () => {
      await addMember("dup1", "9000000007"); await addMember("dup2", "+91 9000000007");
      let c = await request("9000000007");
      let continuation = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in continuation);
      assert.equal(continuation.requiresAccountSignIn, true);
      await pool.query("INSERT INTO users(mobile,email) VALUES('9000000008','unlinked@example.test')");
      c = await request("9000000008");
      continuation = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in continuation);
      assert.equal(continuation.requiresAccountSignIn, true);
      await addMember("staff1", "9000000009");
      await pool.query("INSERT INTO staff(email) VALUES('staff1@example.test')");
      c = await request("9000000009");
      assert.ok("ticket" in await service.verify(c.challengeId, c.code));
      assert.equal(lastTicketUserId, "staff1");
      await addMember("admin1", "9000000010");
      identity("admin1");
      await pool.query("INSERT INTO admins(email) VALUES('admin1@example.test')");
      c = await request("9000000010");
      assert.ok("ticket" in await service.verify(c.challengeId, c.code));
      assert.equal(lastTicketUserId, "admin1");
    });
    await t.test("disabled identities reject separately without tickets, links, or member creation", async () => {
      const disabledMemberId = await addMember("disabled31", "9000000031");
      identity("disabled31", { disabled: true });
      let challenge = await request("9000000031");
      const beforeTickets = ticketCount;
      await assert.rejects(service.verify(challenge.challengeId, challenge.code), (error: unknown) =>
        error instanceof OtpError && error.status === 403 && error.message.includes("disabled"));
      assert.equal(ticketCount, beforeTickets);
      assert.equal((await pool.query("SELECT * FROM whatsapp_phone_links WHERE user_id=$1", [disabledMemberId])).rowCount, 0);

      challenge = await request("9000000032");
      const verified = await service.verify(challenge.challengeId, challenge.code);
      assert.ok("continuationToken" in verified);
      identity("disabled32", { disabled: true });
      await assert.rejects(service.complete(verified.continuationToken!, "disabled32"), (error: unknown) =>
        error instanceof OtpError && error.status === 403 && error.message.includes("disabled"));
      assert.equal((await pool.query("SELECT * FROM users WHERE clerk_user_id='disabled32'")).rowCount, 0);
      assert.equal((await pool.query("SELECT * FROM whatsapp_phone_links WHERE phone='919000000032'")).rowCount, 0);
    });
    await t.test("identity lookup cannot substitute a different Clerk account", async () => {
      await addMember("expected33", "9000000033");
      const challenge = await request("9000000033");
      const mixingService = new WhatsappOtpService({
        pool, secret: "test-only-secret-with-enough-entropy", send: async () => {},
        identity: async () => ({ ...identities.get("expected33")!, id: "other33" }),
        ticket: async () => { throw new Error("ticket must not be created"); },
      });
      await assert.rejects(mixingService.verify(challenge.challengeId, challenge.code), status(409));
      assert.equal((await pool.query("SELECT * FROM whatsapp_phone_links WHERE phone='919000000033'")).rowCount, 0);

      const signup = await request("9000000034");
      const continuation = await service.verify(signup.challengeId, signup.code);
      assert.ok("continuationToken" in continuation);
      identity("expected34");
      const completionMixingService = new WhatsappOtpService({
        pool, secret: "test-only-secret-with-enough-entropy", send: async () => {},
        identity: async () => ({ ...identities.get("expected34")!, id: "other34" }),
        ticket: async () => "unused",
      });
      await assert.rejects(completionMixingService.complete(continuation.continuationToken!, "expected34"), status(409));
      assert.equal((await pool.query("SELECT * FROM users WHERE clerk_user_id IN ('expected34','other34')")).rowCount, 0);
    });
    await t.test("duplicate recovery requires the intended account, preserves every profile, and makes the canonical link permanent", async () => {
      const firstId = await addMember("recoverA", "9000000025");
      const secondId = await addMember("recoverB", "+91 90000 00025");
      await pool.query("UPDATE users SET name='First untouched' WHERE id=$1", [firstId]);
      await pool.query("UPDATE users SET name='Second untouched' WHERE id=$1", [secondId]);
      const before = (await pool.query("SELECT id,clerk_user_id,mobile,email,name FROM users WHERE id=ANY($1::int[]) ORDER BY id", [[firstId, secondId]])).rows;
      const challenge = await request("9000000025");
      const verified = await service.verify(challenge.challengeId, challenge.code);
      assert.ok("continuationToken" in verified);
      assert.equal(verified.requiresAccountSignIn, true);
      identity("wrong25");
      await assert.rejects(service.complete(verified.continuationToken!, "wrong25"), status(409));
      assert.equal((await pool.query("SELECT consumed_at FROM whatsapp_otp_continuations WHERE phone='919000000025'")).rows[0].consumed_at, null);

      const completed = await service.complete(verified.continuationToken!, "recoverB");
      assert.equal(completed.isNewUser, false);
      assert.equal(completed.userId, secondId);
      assert.deepEqual((await pool.query("SELECT id,clerk_user_id,mobile,email,name FROM users WHERE id=ANY($1::int[]) ORDER BY id", [[firstId, secondId]])).rows, before);
      const link = (await pool.query("SELECT * FROM whatsapp_phone_links WHERE phone='919000000025'")).rows[0];
      assert.equal(link.user_id, secondId);
      assert.equal(link.clerk_user_id, "recoverB");

      identity("claimant25");
      await assert.rejects(service.complete(verified.continuationToken!, "claimant25"), status(401));
      assert.equal((await pool.query("SELECT clerk_user_id FROM whatsapp_phone_links WHERE phone='919000000025'")).rows[0].clerk_user_id, "recoverB");

      await pool.query("UPDATE whatsapp_otp_budgets SET last_sent_at=now()-interval '61 seconds' WHERE key='phone:919000000025'");
      const next = await request("9000000025");
      const signedIn = await service.verify(next.challengeId, next.code);
      assert.ok("ticket" in signedIn);
      assert.equal(lastTicketUserId, "recoverB");
    });
    await t.test("verified email can claim exactly one unlinked legacy candidate among duplicates", async () => {
      const intendedId = (await pool.query(
        "INSERT INTO users(mobile,email,name) VALUES('9000000026','owner26@example.test','Intended') RETURNING id",
      )).rows[0].id as number;
      const otherId = (await pool.query(
        "INSERT INTO users(mobile,email,name) VALUES('+91 9000000026','other26@example.test','Other') RETURNING id",
      )).rows[0].id as number;
      identity("owner26", { email: "owner26@example.test", emails: ["owner26@example.test"] });
      const challenge = await request("9000000026");
      const verified = await service.verify(challenge.challengeId, challenge.code);
      assert.ok("continuationToken" in verified);
      const completed = await service.complete(verified.continuationToken!, "owner26");
      assert.equal(completed.isNewUser, false);
      assert.equal(completed.userId, intendedId);
      assert.equal((await pool.query("SELECT clerk_user_id FROM users WHERE id=$1", [intendedId])).rows[0].clerk_user_id, "owner26");
      assert.equal((await pool.query("SELECT clerk_user_id FROM users WHERE id=$1", [otherId])).rows[0].clerk_user_id, null);
    });
    await t.test("a staff duplicate can complete only its own member recovery and cannot mix accounts", async () => {
      await addMember("member27", "9000000027");
      await addMember("staff27", "+91 9000000027");
      await pool.query("INSERT INTO staff(email) VALUES('staff27@example.test')");
      const challenge = await request("9000000027");
      const verified = await service.verify(challenge.challengeId, challenge.code);
      assert.ok("continuationToken" in verified);
      const staff = await service.complete(verified.continuationToken!, "staff27");
      assert.equal(staff.isNewUser, false);
      assert.equal((await pool.query("SELECT clerk_user_id FROM whatsapp_phone_links WHERE phone='919000000027'")).rows[0].clerk_user_id, "staff27");
      await assert.rejects(service.complete(verified.continuationToken!, "member27"), status(401));
    });
    await t.test("duplicate unlinked candidates with the same email are never auto-selected", async () => {
      await pool.query(`INSERT INTO users(mobile,email) VALUES
        ('9000000028','shared28@example.test'),('+91 9000000028','shared28@example.test')`);
      identity("shared28", { email: "shared28@example.test", emails: ["shared28@example.test"] });
      const challenge = await request("9000000028");
      const verified = await service.verify(challenge.challengeId, challenge.code);
      assert.ok("continuationToken" in verified);
      await assert.rejects(service.complete(verified.continuationToken!, "shared28"), status(409));
      assert.equal((await pool.query("SELECT * FROM whatsapp_phone_links WHERE phone='919000000028'")).rowCount, 0);
      assert.equal((await pool.query("SELECT * FROM users WHERE clerk_user_id='shared28'")).rowCount, 0);
    });
    await t.test("foreign suffix never authenticates Indian mobile", async () => {
      await addMember("foreign", "+44 9000000011");
      const c = await request("9000000011");
      assert.equal((await service.verify(c.challengeId, c.code)).isNewUser, true);
    });
    await t.test("new signup continuation creates atomic member/setup/link once", async () => {
      const c = await request("9000000012");
      const result = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in result);
      const token = result.continuationToken!;
      assert.equal((await pool.query("SELECT * FROM users WHERE mobile='9000000012'")).rowCount, 0);
      identity("new12");
      const results = await Promise.allSettled([service.complete(token, "new12"), service.complete(token, "new12")]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const completion = results.find((r): r is PromiseFulfilledResult<{ isNewUser: boolean; userId: number }> => r.status === "fulfilled");
      assert.equal(completion?.value.isNewUser, true);
      const member = (await pool.query("SELECT * FROM users WHERE clerk_user_id='new12'")).rows[0];
      assert.equal(member.mobile, "9000000012"); assert.equal(member.age, null);
      const setup = (await pool.query("SELECT * FROM fitness_setup WHERE user_id=$1", [member.id])).rows[0];
      assert.equal(setup.required_for_onboarding, true); assert.equal(setup.current_step, 1);
      assert.equal((await pool.query("SELECT * FROM whatsapp_phone_links WHERE user_id=$1", [member.id])).rowCount, 1);
    });
    await t.test("JIT winner keeps setup progress and profile without overwrites", async () => {
      const c = await request("9000000013");
      const result = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in result);
      const uid = await addMember("jit13", "");
      await pool.query("UPDATE users SET name='Keep Name',age=28 WHERE id=$1", [uid]);
      await pool.query("INSERT INTO fitness_setup VALUES($1,true,3)", [uid]);
      await service.complete(result.continuationToken!, "jit13");
      const member = (await pool.query("SELECT * FROM users WHERE id=$1", [uid])).rows[0];
      assert.equal(member.name, "Keep Name"); assert.equal(member.age, 28); assert.equal(member.mobile, "9000000013");
      assert.equal((await pool.query("SELECT current_step FROM fitness_setup WHERE user_id=$1", [uid])).rows[0].current_step, 3);
    });
    await t.test("unverified email, mismatched mobile, and expired continuation rejected", async () => {
      const c = await request("9000000014");
      const result = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in result);
      identity("unverified", { email: null });
      await assert.rejects(service.complete(result.continuationToken!, "unverified"), status(401));
      await addMember("different", "9000000099");
      await assert.rejects(service.complete(result.continuationToken!, "different"), status(409));
      await pool.query("UPDATE whatsapp_otp_continuations SET expires_at=now()-interval '1 second' WHERE phone='919000000014'");
      identity("expired");
      await assert.rejects(service.complete(result.continuationToken!, "expired"), status(401));
    });
    await t.test("verified email account with no mobile can finish an interrupted setup", async () => {
      const uid = await addMember("returning", "");
      identity("returning", { createdAt: Date.now() - 86_400_000 });
      const c = await request("9000000018");
      const result = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in result);
      assert.equal((await service.complete(result.continuationToken!, "returning")).isNewUser, false);
      assert.equal((await service.complete(result.continuationToken!, "returning").catch((error) => error)).status, 401);
      assert.equal((await pool.query("SELECT mobile FROM users WHERE id=$1", [uid])).rows[0].mobile, "9000000018");
      assert.equal((await pool.query("SELECT * FROM fitness_setup WHERE user_id=$1", [uid])).rowCount, 0);
    });
    await t.test("resend revokes previously issued signup continuation", async () => {
      const c = await request("9000000015");
      const result = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in result);
      await pool.query("UPDATE whatsapp_otp_budgets SET last_sent_at=now()-interval '61 seconds' WHERE key='phone:919000000015'");
      await request("9000000015");
      identity("revoked");
      await assert.rejects(service.complete(result.continuationToken!, "revoked"), status(401));
    });
    await t.test("sender failure leaves no usable OTP and still spends budget", async () => {
      const failing = new WhatsappOtpService({ pool, secret: "test", send: async () => { throw new Error("private"); }, identity: async () => identity("unused"), ticket: async () => "unused" });
      await assert.rejects(failing.request("9000000016", "failed-ip"), status(502));
      assert.equal((await pool.query("SELECT state FROM whatsapp_otp_challenges WHERE phone='919000000016'")).rows[0].state, "failed");
      await assert.rejects(failing.request("9000000016", "failed-ip"), status(429));
    });
    await t.test("database failure rolls back member, setup, link and continuation consumption", async () => {
      const c = await request("9000000017");
      const result = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in result);
      identity("atomic17");
      await pool.query("ALTER TABLE fitness_setup ADD CONSTRAINT reject_fixture CHECK (current_step<>1) NOT VALID");
      await assert.rejects(service.complete(result.continuationToken!, "atomic17"));
      assert.equal((await pool.query("SELECT * FROM users WHERE clerk_user_id='atomic17'")).rowCount, 0);
      assert.equal((await pool.query("SELECT consumed_at FROM whatsapp_otp_continuations WHERE phone='919000000017'")).rows[0].consumed_at, null);
      await pool.query("ALTER TABLE fitness_setup DROP CONSTRAINT reject_fixture");
      await service.complete(result.continuationToken!, "atomic17");
    });
    await t.test("concurrent wrong codes stop exactly at five attempts", async () => {
      const c = await request("9000000024");
      const wrong = c.code === "000000" ? "000001" : "000000";
      const results = await Promise.allSettled(Array.from({ length: 9 }, () => service.verify(c.challengeId, wrong)));
      assert.equal(results.every((r) => r.status === "rejected"), true);
      assert.equal((await pool.query("SELECT attempts FROM whatsapp_otp_challenges WHERE id=$1", [c.challengeId])).rows[0].attempts, 5);
    });
    await t.test("ticket failure still consumes code, never creates a new account", async () => {
      await addMember("ticketFail19", "9000000019");
      const c = await request("9000000019");
      const failing = new WhatsappOtpService({
        pool, secret: "test-only-secret-with-enough-entropy", send: async () => {},
        identity: async () => identities.get("ticketFail19")!,
        ticket: async () => { throw new Error("Mock Clerk outage"); },
      });
      await assert.rejects(failing.verify(c.challengeId, c.code));
      await assert.rejects(service.verify(c.challengeId, c.code), status(401));
    });
    await t.test("late provider acknowledgement cannot reactivate superseded code", async () => {
      let unblock!: () => void, sentFirst!: () => void;
      const started = new Promise<void>((resolve) => { sentFirst = resolve; });
      const delayed = new WhatsappOtpService({
        pool, secret: "test-only-secret-with-enough-entropy",
        send: async () => { sentFirst(); await new Promise<void>((resolve) => { unblock = resolve; }); },
        identity: async () => identity("unused20"), ticket: async () => "unused",
      });
      const old = delayed.request("9000000020", "delayed-provider");
      // Attach the rejection handler before releasing the delayed sender.
      const rejected = assert.rejects(old, status(409));
      await started;
      await pool.query("UPDATE whatsapp_otp_budgets SET last_sent_at=now()-interval '61 seconds' WHERE key='phone:919000000020'");
      const newer = await request("9000000020");
      unblock();
      await rejected;
      assert.equal((await service.verify(newer.challengeId, newer.code)).isNewUser, true);
      const states = (await pool.query("SELECT state FROM whatsapp_otp_challenges WHERE phone='919000000020'")).rows.map((r) => r.state).sort();
      assert.deepEqual(states, ["consumed", "superseded"]);
    });
    await t.test("signup cannot overwrite a different account claiming phone after OTP", async () => {
      const c = await request("9000000021");
      const result = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in result);
      identity("new21");
      await addMember("other21", "9000000021");
      await assert.rejects(service.complete(result.continuationToken!, "new21"), status(409));
      assert.equal((await pool.query("SELECT * FROM users WHERE clerk_user_id='new21'")).rowCount, 0);
    });
    await t.test("partner phone and admin identity may create a separate member without associating role records", async () => {
      await pool.query("INSERT INTO partners(email,phone) VALUES('partner@example.test','+91 9000000022')");
      const c = await request("9000000022");
      const partnerResult = await service.verify(c.challengeId, c.code);
      assert.ok("continuationToken" in partnerResult);
      identity("partner22", { email: "partner@example.test", emails: ["partner@example.test"] });
      const partnerMember = await service.complete(partnerResult.continuationToken!, "partner22");
      assert.equal(partnerMember.isNewUser, true);
      assert.equal((await pool.query("SELECT clerk_user_id FROM users WHERE id=$1", [partnerMember.userId])).rows[0].clerk_user_id, "partner22");

      const next = await request("9000000023");
      const result = await service.verify(next.challengeId, next.code);
      assert.ok("continuationToken" in result);
      identity("new23");
      await pool.query("INSERT INTO admins(email) VALUES('new23@example.test')");
      assert.equal((await service.complete(result.continuationToken!, "new23")).isNewUser, true);

      await addMember("secondary29", "9000000029");
      identity("secondary29", {
        email: "customer29@example.test",
        emails: ["customer29@example.test", "admin-secondary29@example.test"],
      });
      await pool.query("INSERT INTO admins(email) VALUES('admin-secondary29@example.test')");
      const secondary = await request("9000000029");
      assert.ok("ticket" in await service.verify(secondary.challengeId, secondary.code));

      const localId = await addMember("local30", "", "staff-local30@example.test");
      identity("local30", { email: "customer30@example.test", emails: ["customer30@example.test"] });
      await pool.query("INSERT INTO staff(email) VALUES('staff-local30@example.test')");
      const local = await request("9000000030");
      const localContinuation = await service.verify(local.challengeId, local.code);
      assert.ok("continuationToken" in localContinuation);
      assert.equal((await service.complete(localContinuation.continuationToken!, "local30")).isNewUser, false);
      assert.equal((await pool.query("SELECT mobile FROM users WHERE id=$1", [localId])).rows[0].mobile, "9000000030");
    });
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});