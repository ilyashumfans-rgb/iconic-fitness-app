---
name: Admin Excel lead import
description: How bulk lead import + partner branch leads panel works and its guardrails
---
- Excel is parsed client-side (xlsx pkg in gymco admin Leads page, tolerant header mapping); server receives JSON rows at /admin/leads/import (max 1000, needs the raised 5mb body limit mounted BEFORE the global express.json in app.ts).
- "Branch No" column = gyms.id; unknown branch numbers are per-row errors (row numbering is sheet-based: +2 for header). Template download includes a "Branch Numbers" reference sheet.
- Partner "branch panel" leads: GET /partner/leads scoped by ownedGymIds. **Any new /partner/* route must be added to STAFF_PERMISSION_PREFIXES in partner.ts or partner-staff sessions get 403 (fail-closed guard).**
