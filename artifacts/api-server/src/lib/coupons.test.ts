import assert from "node:assert/strict";
import test from "node:test";
import {
  collectAvailableCoupons,
  type CouponQuote,
} from "./coupons";

test("available coupons filter failed quotes and sort by savings then code", async () => {
  const candidates = [
    { code: "LOW" },
    { code: "USED" },
    { code: "Z-TIE" },
    { code: "A-TIE" },
  ];
  const quotes: Record<string, CouponQuote> = {
    LOW: {
      ok: true,
      code: "LOW",
      description: "Small saving",
      discountInr: 50,
    },
    USED: { ok: false, error: "You have already used this coupon" },
    "Z-TIE": { ok: true, code: "Z-TIE", discountInr: 100 },
    "A-TIE": {
      ok: true,
      code: "A-TIE",
      description: "Best saving",
      discountInr: 100,
    },
  };

  const available = await collectAvailableCoupons(
    candidates,
    500,
    async (code) => quotes[code],
  );

  assert.deepEqual(available, [
    {
      code: "A-TIE",
      description: "Best saving",
      discountInr: 100,
      finalInr: 400,
    },
    {
      code: "Z-TIE",
      description: "",
      discountInr: 100,
      finalInr: 400,
    },
    {
      code: "LOW",
      description: "Small saving",
      discountInr: 50,
      finalInr: 450,
    },
  ]);
});

test("collecting available coupons does not mutate candidates or quotes", async () => {
  const candidates = Object.freeze([
    Object.freeze({ code: "SAVE" }),
    Object.freeze({ code: "EXPIRED" }),
  ]);
  const quotes: Readonly<Record<string, CouponQuote>> = Object.freeze({
    SAVE: Object.freeze({
      ok: true,
      code: "SAVE",
      description: "Save now",
      discountInr: 75,
    }),
    EXPIRED: Object.freeze({ ok: false, error: "This coupon has expired" }),
  });
  const before = JSON.stringify({ candidates, quotes });

  await collectAvailableCoupons(
    candidates,
    300,
    async (code) => quotes[code],
  );

  assert.equal(JSON.stringify({ candidates, quotes }), before);
});