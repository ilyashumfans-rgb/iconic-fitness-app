import test from "node:test";
import assert from "node:assert/strict";
import { OtpError } from "./whatsappOtp";
import { provisionWhatsappClerkUser, whatsappExternalId, type ProvisionedClerkUser, type WhatsappClerkDependencies } from "./whatsappClerkProvisioning";

const phone = "919000000001";
function fixture() {
  const users: ProvisionedClerkUser[] = [];
  let creates = 0;
  let lastParams: Parameters<WhatsappClerkDependencies<ProvisionedClerkUser>["create"]>[0] | undefined;
  const deps: WhatsappClerkDependencies<ProvisionedClerkUser> = {
    find: async (externalId) => {
      const data = users.filter((u) => u.externalId === externalId);
      return { data, totalCount: data.length };
    },
    create: async (params) => {
      creates++;
      lastParams = params;
      const user = { id: `fake_${creates}`, externalId: params.externalId, privateMetadata: params.privateMetadata, banned: false, locked: false };
      users.push(user);
      return user;
    },
  };
  return { users, deps, get creates() { return creates; }, get lastParams() { return lastParams; } };
}
const status = (n: number) => (e: unknown) => e instanceof OtpError && e.status === n;

test("opaque username, deterministic externalId/private provenance; no email/phone/password/legal attributes", async () => {
  const f = fixture();
  const user = await provisionWhatsappClerkUser(phone, f.deps);
  assert.deepEqual(Object.keys(f.lastParams!).sort(), ["externalId", "privateMetadata", "skipPasswordRequirement", "username"]);
  assert.match(f.lastParams!.username, /^wa_[a-f0-9]{48}$/);
  assert.ok(f.lastParams!.username.length >= 4 && f.lastParams!.username.length <= 64);
  assert.equal(f.lastParams!.skipPasswordRequirement, true);
  assert.equal(user.externalId, whatsappExternalId(phone));
  assert.notEqual(whatsappExternalId(phone), whatsappExternalId("919000000002"));
  assert.deepEqual(await provisionWhatsappClerkUser(phone, f.deps), user);
  assert.equal(f.creates, 1);
  assert.throws(() => whatsappExternalId("9000000001"), status(400));
});

test("a lost successful create response recovers only the exact externalId and private provenance", async () => {
  const f = fixture();
  const create = f.deps.create;
  f.deps.create = async (params) => { await create(params); throw new Error("lost response"); };
  assert.equal((await provisionWhatsappClerkUser(phone, f.deps)).id, "fake_1");
  assert.equal(f.creates, 1);
  assert.equal((await provisionWhatsappClerkUser(phone, f.deps)).id, "fake_1");
  assert.equal(f.creates, 1);
});

test("failure before persistence can retry; username collisions are never adopted", async () => {
  const f = fixture();
  const error = new Error("username collision or create unavailable");
  await assert.rejects(provisionWhatsappClerkUser(phone, { ...f.deps, create: async () => { throw error; } }), (e) => e === error);
  assert.equal(f.users.length, 0);
  assert.equal((await provisionWhatsappClerkUser(phone, f.deps)).id, "fake_1");
});

test("unavailable identity lookup never falls through to creation", async () => {
  const f = fixture();
  await assert.rejects(provisionWhatsappClerkUser(phone, {
    ...f.deps, find: async () => { throw new Error("lookup unavailable"); },
  }));
  assert.equal(f.creates, 0);
  assert.equal(f.users.length, 0);
});

test("externalId collision, wrong/absent provenance and ambiguous lookup all fail closed", async () => {
  for (const changes of [
    { privateMetadata: {} },
    { privateMetadata: { whatsappOtp: { source: "other", version: 1, externalId: whatsappExternalId(phone) } } },
    { privateMetadata: { whatsappOtp: { source: "iconic_whatsapp_otp", version: 2, externalId: whatsappExternalId(phone) } } },
    { privateMetadata: { whatsappOtp: { source: "iconic_whatsapp_otp", version: 1, externalId: "different" } } },
  ]) {
    const f = fixture();
    f.users.push({ id: "unrelated", externalId: whatsappExternalId(phone), banned: false, locked: false, ...changes });
    await assert.rejects(provisionWhatsappClerkUser(phone, f.deps), status(409));
    assert.equal(f.creates, 0);
  }
  const f = fixture();
  const user = await provisionWhatsappClerkUser(phone, f.deps);
  f.users.push({ ...user, id: "ambiguous" });
  await assert.rejects(provisionWhatsappClerkUser(phone, f.deps), status(409));
  await assert.rejects(provisionWhatsappClerkUser(phone, { ...f.deps, find: async () => ({ data: [user], totalCount: 2 }) }), status(409));
});

test("substituted create/lookup identities and disabled recovered identities reject", async () => {
  const f = fixture();
  const user = await provisionWhatsappClerkUser(phone, f.deps);
  await assert.rejects(provisionWhatsappClerkUser(phone, { ...f.deps, find: async () => ({ data: [{ ...user, externalId: "wrong" }], totalCount: 1 }) }), status(409));
  await assert.rejects(provisionWhatsappClerkUser("919000000002", { ...f.deps, create: async () => user }), status(409));
  for (const field of ["banned", "locked"] as const) {
    user[field] = true;
    await assert.rejects(provisionWhatsappClerkUser(phone, f.deps), status(403));
    user[field] = false;
  }
});

test("concurrent externalId winner is recovered without adopting another account", async () => {
  const f = fixture();
  let arrived = 0, release!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const create = f.deps.create;
  f.deps.create = async (params) => {
    arrived++;
    if (arrived === 2) release();
    await barrier;
    if (f.users.length) throw new Error("externalId already exists");
    return create(params);
  };
  const results = await Promise.all([provisionWhatsappClerkUser(phone, f.deps), provisionWhatsappClerkUser(phone, f.deps)]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(f.creates, 1);
});