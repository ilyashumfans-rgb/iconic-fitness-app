---
name: YoActiv API integration gotchas
description: Third-party gym-management API (api.yoactiv.com) — auth quirks, swapped key secrets, lookup conventions
---

- All endpoints are POST JSON with `API_Key` + `Branch_Id` headers; errors come back as `{"STS":0,"MSG":"Invalid API_Key"}` or `{"Error":"..."}` with HTTP 200.
- Member lookup body field is `Mobile_No` (NOT `Mobile`); match by last 10 digits.
- **The three key secrets (SANDBOX/1/2) were pasted into swapped slots.** The server does not trust slot names: `yoactiv.ts` probes each key against each branch set's first branch (`Users/GetUserList`) and auto-assigns, cached per process; partial resolution retries after 60s.
- **Why:** a wrong slot silently makes every lookup fail with "Invalid API_Key"; auto-detection survives any future re-paste order.
- Dates arrive as DD-MM-YYYY; statuses like Active/Expired plus freeze/hold variants (mapped to paused).
- `/memberships/mine` prefers YoActiv (5-min success / 60s failure cache, 6s global deadline, parallel branch fetches) and falls back to the local DB row; DTO has optional `source: local|yoactiv`.
- Sandbox: branch 7820, test mobile 9008003082. Mode = NODE_ENV or `YOACTIV_MODE` override.

## PT packages
- Member "Book your PT sessions" screen (`book-pt-sessions.tsx`) shows /api/trainer-packages filtered to PT (YoActiv `PT===1` flag OR name matching /pt|personal train/i — branches often forget the flag).
- Packages are hidden-by-default in admin curation; a branch shows prices only when YoActiv has PT-named packages AND admin unhides them. As of Jul 2026 no branch had any PT package in YoActiv — flow falls back to enquiry until the gym creates them.
