---
name: YoActiv branch scoping is strict for money paths
description: Unmapped/mis-mapped gyms must never fall back to another YoActiv branch for packages, payments, or rosters.
---

The rule: any YoActiv call scoped to a gym (`gyms.yoactiv_branch_id`) must resolve strictly — no branch mapping, or a branch id no API key covers, means **empty results / paid flow unavailable**, never "use the first configured branch".

**Why:** the hosted Razorpay payment URL (`Billing/APIPayment`) collects real money into the branch's account. A default-branch fallback would charge members into the wrong branch's books, and show another branch's trainers/packages as if they were local. This was flagged as a blocker in review after the initial implementation silently fell back.

**How to apply:** `resolveBranchTarget()` returns null for unmapped/uncovered branches; `/trainer-packages` and `/trainers/live?gymId=` return `[]` for unmapped gyms; `POST /trainer-bookings` returns 409. The mobile app treats "no packages" as the signal to fall back to the free enquiry (lead) flow, and empty live roster falls back to local trainer profiles — so strict scoping degrades gracefully.

Related caveat (accepted by user): booking `paid` status is set by the success-redirect landing only; there is no YoActiv webhook/verification step.

## Branch mapping & package visibility rules
- Every gym must carry both `yoactiv_branch_id` and `yoactiv_pt_branch_id`; the mappings live in the dev DB AND `seed-snapshot.json` (keep them in sync). `YOACTIV_DEV_BRANCH_IDS` controls which live branches dev routes to.
- BTM naming trap: YoActiv "BTM Layout" is the **Maruti Nagar** gym; "BTM 1st Stage" is the **Tavarekere** gym — confirmed via YoActiv's public branch page address. Never map by name similarity alone; verify against a branch's published address.
- Packages are DEFAULT-HIDDEN: a branch shows plans only when `yoactiv_package_prefs` has hidden=false rows. The curated visible set mirrors 5th Block's plan names (1-month multiclub, 6-month, 15-month limited slot, 3-month fee) matched per branch by name.
- `yoactiv_package_prefs` IS included in the seed snapshot and both seeders (startup + force reseed), so a fresh/reseeded DB gets the visibility rows automatically.
