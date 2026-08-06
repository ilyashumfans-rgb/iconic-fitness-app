---
name: Coupon redemption settlement
description: How discount coupons validate, snapshot, and settle in the hosted-payment money path.
---
Coupons (packages + PT) follow the wallet money-path conventions:
- Validate best-effort at checkout creation (`quoteCoupon`); the coupon is CONSUMED only at the pending→paid flip.
- Bookings snapshot immutable `couponId` + code + discount — settlement resolves by id, so admin rename/delete can't detach a pending booking's discount.
- Idempotency truth = unique `(kind, booking_id)` index on `coupon_redemptions` (23505 catch); `used_count` bumps via conditional UPDATE (`max_uses=0 OR used_count<max_uses`) so the counter never exceeds the cap.
- **Why:** payment happens on YoActiv's hosted page, so an over-limit paid flip can't be rejected — it's logged, not blocked. Discount order: coupon first, then wallet points on the remainder, always ≥₹1 payable.
- PT purchase endpoint must enforce the same PT-package classification as the app's PT list, or a pt-only coupon can discount a membership package.

**How to apply:** any new discount/credit mechanism in checkout should copy this snapshot-at-creation + settle-at-flip pattern.
