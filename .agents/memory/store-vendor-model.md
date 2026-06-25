---
name: Store vendor / order data model
description: Durable constraints of the multi-vendor store (partners-as-vendors, order-item snapshots, no FKs).
---

- Vendors are NOT a separate table: they are `partnersTable` rows with `kind` in (`vendor`,`both`). Same login/session infra as gym partners; vendor portal lives at `/vendor` and gates by `kind`.
- `productsTable.vendorPartnerId` and `productOrderItemsTable.{productId,vendorPartnerId}` are plain integers — **no FK constraints**. So nothing cascades automatically.
- **Order items snapshot `productName` + `unitPriceInr` at checkout.** Past orders are therefore self-contained.
  **Why:** lets you delete a vendor's products (e.g. on vendor delete) without corrupting order history.
  **How to apply:** when deleting a vendor/partner, also delete their `products` rows, but leave `product_order_items` alone — history stays readable.
- Vendor `/vendor/login` only blocks `status==="suspended"`; `pending` accounts can still sign in. Create vendors as `active` for clarity (POST /admin/partners accepts optional validated `status`).
