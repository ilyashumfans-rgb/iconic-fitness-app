// Self-contained printable invoice document for a single YoActiv payment.
// Kept in sync with the web version (artifacts/gymco/src/lib/invoiceHtml.ts) —
// artifacts can't share code without a lib, and this is presentation-only.

export type InvoiceData = {
  billId: string;
  planName: string;
  serviceName: string;
  branchName: string;
  status: string;
  invoiceDate: string | null; // ISO date
  startDate: string | null;
  expiryDate: string | null;
  amountInr: number | null;
  discountInr: number | null;
  memberName: string;
  memberMobile: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function istLabel(iso: string | null): string {
  if (!iso) return "—";
  // Anchor at midday UTC so the IST calendar day is unambiguous on any device.
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function inr(n: number | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function buildInvoiceHtml(inv: InvoiceData): string {
  const paid =
    typeof inv.amountInr === "number" && Number.isFinite(inv.amountInr)
      ? Math.round(inv.amountInr)
      : null;
  const discount =
    typeof inv.discountInr === "number" &&
    Number.isFinite(inv.discountInr) &&
    inv.discountInr > 0
      ? Math.round(inv.discountInr)
      : null;
  const plan = inv.serviceName
    ? `${inv.serviceName} — ${inv.planName}`
    : inv.planName;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(inv.billId || "")}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 40px 36px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 18px; }
  .brand { font-size: 24px; font-weight: 900; letter-spacing: 1px; }
  .brand small { display: block; font-size: 11px; font-weight: 600; color: #666; letter-spacing: 2px; margin-top: 4px; }
  .inv-title { text-align: right; }
  .inv-title h1 { font-size: 20px; letter-spacing: 3px; font-weight: 800; }
  .inv-title p { font-size: 12px; color: #555; margin-top: 4px; }
  .meta { display: flex; justify-content: space-between; margin-top: 24px; font-size: 13px; }
  .meta h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 6px; }
  .meta p { margin-top: 2px; }
  .meta .right { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; border-bottom: 2px solid #111; padding: 8px 4px; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 12px 4px; border-bottom: 1px solid #e5e5e5; }
  .totals { margin-top: 18px; margin-left: auto; width: 260px; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 4px; }
  .totals .grand { border-top: 2px solid #111; font-weight: 800; font-size: 16px; padding-top: 10px; margin-top: 4px; }
  .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 10px; border-radius: 999px; background: #eef7d8; color: #4d7c0f; }
  .badge.expired { background: #fee2e2; color: #b91c1c; }
  .badge.paused { background: #fef3c7; color: #b45309; }
  .foot { margin-top: 48px; padding-top: 14px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">ICONIC FITNESS<small>GYMCO NETWORK</small></div>
    <div class="inv-title">
      <h1>INVOICE</h1>
      <p>Bill no. ${esc(inv.billId || "—")}</p>
      <p>Invoice date: ${istLabel(inv.invoiceDate)}</p>
    </div>
  </div>
  <div class="meta">
    <div>
      <h3>Billed to</h3>
      <p><strong>${esc(inv.memberName || "Member")}</strong></p>
      ${inv.memberMobile ? `<p>${esc(inv.memberMobile)}</p>` : ""}
    </div>
    <div class="right">
      <h3>Branch</h3>
      <p><strong>${esc(inv.branchName || "—")}</strong></p>
      <p style="margin-top:8px"><span class="badge ${esc(inv.status)}">${esc(inv.status)}</span></p>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>Description</th><th>Membership period</th><th>Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${esc(plan)}</strong></td>
        <td>${istLabel(inv.startDate)} – ${istLabel(inv.expiryDate)}</td>
        <td>${inr(paid)}</td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    ${discount ? `<div class="row"><span>Discount applied</span><span>${inr(discount)}</span></div>` : ""}
    <div class="row grand"><span>Total paid</span><span>${inr(paid)}</span></div>
  </div>
  <div class="foot">
    Generated by the Iconic Fitness app from the gym billing system. For any billing
    questions, please contact your branch${inv.branchName ? ` (${esc(inv.branchName)})` : ""}.
  </div>
</body>
</html>`;
}
