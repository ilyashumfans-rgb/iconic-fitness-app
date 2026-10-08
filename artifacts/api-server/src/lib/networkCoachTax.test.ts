import { test } from "node:test";
import assert from "node:assert/strict";
import { networkCoachTax } from "./networkCoachTax";
import { billingFormHtml, autoPostHtml } from "./networkPayHandoff";

test("GST adds both components to the base with store-compatible rounding", () => {
  assert.deepEqual(networkCoachTax(1000, { cgstPercent: 9, sgstPercent: 9 }), {
    subtotalInr: 1000, cgstPercent: 9, sgstPercent: 9, cgstInr: 90, sgstInr: 90, amountInr: 1180,
  });
  assert.equal(networkCoachTax(999, { cgstPercent: 2.5, sgstPercent: 2.5 }).amountInr, 1049);
  assert.equal(networkCoachTax(1000, {}).amountInr, 1000);
  assert.equal(networkCoachTax(0, { cgstPercent: 9, sgstPercent: 9 }).amountInr, 0);
});

test("billing shows captured taxes and shared handoff sends origin-only referrer", () => {
  const tax = networkCoachTax(1000, { cgstPercent: 9, sgstPercent: 9 });
  const html = billingFormHtml({ action: "/api/pay/network-coach/test/start", amountInr: tax.amountInr, tax });
  assert.match(html, /CGST \(9%\): ₹90/);
  assert.match(html, /SGST \(9%\): ₹90/);
  assert.match(html, /Total payable: ₹1180/);
  const handoff = autoPostHtml("https://payments.airpay.co.in/pay/v4/index.php", { checksum: '"><script>' });
  assert.match(handoff, /name="referrer" content="strict-origin"/);
  assert.match(handoff, /&quot;&gt;&lt;script&gt;/);
});
