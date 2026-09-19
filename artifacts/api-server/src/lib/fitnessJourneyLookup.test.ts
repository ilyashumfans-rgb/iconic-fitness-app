import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchYoactivMemberByMobile } from "./yoactiv";

test("journey strict lookup rejects partial/malformed upstream data without changing legacy lookup", async t => {
  const originalFetch = globalThis.fetch;
  const overrides: Record<string, string> = {
    YOACTIV_MODE: "sandbox", YOACTIV_DEV_BRANCH_IDS: "7415,5838",
    YOACTIV_BRANCH_IDS_1: "7415,5838", YOACTIV_BRANCH_IDS_2: "",
    YOACTIV_API_KEY_1: "test-only-key", YOACTIV_API_KEY_2: "", YOACTIV_SANDBOX_API_KEY: "",
  };
  const saved = Object.fromEntries(Object.keys(overrides).map(k => [k, process.env[k]]));
  Object.assign(process.env, overrides);
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  let mode = "partial";
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    let response: unknown;
    if (path === "/Users/GetUserList") response = { Results: [] };
    else if (path === "/Users/Branches") {
      response = mode === "malformed" ? { MSG: "Unavailable" } :
        { Results: [{ Branch_Id: 7415 }, { Branch_Id: 5838 }] };
    } else {
      assert.equal(path, "/Users/Fetch");
      if (mode === "partial" && new Headers(options?.headers).get("Branch_Id") === "5838") {
        throw new Error("Test upstream branch unavailable");
      }
      response = {
        MemberId: 42, Name: "Test fixture",
        Results: [{ Status: "Active", Start_Date: "18-09-2026", Expiry_date: "18-10-2026" }],
      };
    }
    return new Response(JSON.stringify(response), { status: 200 });
  };
  assert.ok(await fetchYoactivMemberByMobile("9000000000"));
  assert.equal(await fetchYoactivMemberByMobile("9000000000", { requireComplete: true }), null);
  mode = "complete";
  assert.equal((await fetchYoactivMemberByMobile("9000000000", { requireComplete: true }))?.memberships.length, 2);
  mode = "malformed";
  assert.equal(await fetchYoactivMemberByMobile("9000000000", { requireComplete: true }), null);
});