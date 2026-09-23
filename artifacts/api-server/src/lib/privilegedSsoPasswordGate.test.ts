import assert from "node:assert/strict";
import test from "node:test";
import {
  checkPrivilegedSsoPasswordGate,
  PASSWORD_REQUIRED_ERROR,
} from "./privilegedSsoPasswordGate";

test("linked Clerk account is denied privileged SSO and requires password", async () => {
  let parameters: unknown[] | undefined;
  const decision = await checkPrivilegedSsoPasswordGate(
    "clerk_linked",
    async (sql, values) => {
      assert.match(sql, /SELECT EXISTS/);
      assert.match(sql, /whatsapp_phone_links/);
      assert.match(sql, /clerk_user_id = \$1/);
      parameters = values;
      return { rows: [{ linked: true }] };
    },
  );

  assert.deepEqual(parameters, ["clerk_linked"]);
  assert.deepEqual(decision, {
    allowed: false,
    status: 403,
    error: PASSWORD_REQUIRED_ERROR,
    code: "PASSWORD_REQUIRED",
  });
});

test("unlinked Clerk account is allowed to continue privileged SSO", async () => {
  const decision = await checkPrivilegedSsoPasswordGate(
    "clerk_unlinked",
    async () => ({ rows: [{ linked: false }] }),
  );

  assert.deepEqual(decision, { allowed: true });
});

test("database errors fail closed instead of allowing privileged SSO", async () => {
  const failure = new Error("database unavailable");
  const decision = await checkPrivilegedSsoPasswordGate(
    "clerk_unknown",
    async () => {
      throw failure;
    },
  );

  assert.equal(decision.allowed, false);
  if (decision.allowed) return;
  assert.equal(decision.status, 503);
  assert.equal(decision.code, "PASSWORD_GATE_UNAVAILABLE");
  assert.equal(decision.cause, failure);
});