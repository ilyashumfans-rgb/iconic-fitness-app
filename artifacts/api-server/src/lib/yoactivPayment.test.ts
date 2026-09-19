import assert from "node:assert/strict";
import { test } from "node:test";
import { createYoactivPaymentUrl } from "./yoactiv";

test("payment body and header both use the selected branch, including legacy retry", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  for (const branchId of [7415, 5838]) {
    for (const legacyRetry of [false, true]) {
      const requests: Array<{ headers: Headers; body: Record<string, unknown> }> = [];
      globalThis.fetch = async (url, options) => {
        assert.ok(String(url).endsWith("/Billing/APIPayment"));
        assert.equal(options?.method, "POST");
        requests.push({
          headers: new Headers(options?.headers),
          body: JSON.parse(String(options?.body)),
        });
        if (legacyRetry && requests.length === 1) {
          return new Response(JSON.stringify({
            Error: "Only one service item can be booked at a time",
          }), { status: 400 });
        }
        return new Response(JSON.stringify({
          PaymentURL: "https://example.test/payment",
        }), { status: 200 });
      };

      const result = await createYoactivPaymentUrl({
        target: { branchId, apiKey: "test-only-key" },
        memberId: 123,
        variationId: 456,
        amountInr: 7260,
        startDateIso: "2026-09-16",
        successUrl: "https://example.test/success",
        failedUrl: "https://example.test/failed",
      });

      assert.equal(result, "https://example.test/payment");
      assert.equal(requests.length, legacyRetry ? 2 : 1);
      for (const request of requests) {
        assert.equal(request.body.Busid, String(branchId));
        assert.equal(request.headers.get("Branch_Id"), String(branchId));
        assert.equal(request.body.memberId, "123");
        assert.equal(request.body.Amount, 7260);
        const service = Array.isArray(request.body.ServiceDetails)
          ? request.body.ServiceDetails[0]
          : request.body.ServiceDetails;
        assert.deepEqual(service, {
          Fee: 7260, ServiceVariationID: 456, TotAmt: 7260,
          discount: 0, disctype: 0, Qty: 1, StartDate: "16-09-2026",
        });
      }
      assert.ok(Array.isArray(requests[0]!.body.ServiceDetails));
      if (legacyRetry) assert.ok(!Array.isArray(requests[1]!.body.ServiceDetails));
    }
  }
});