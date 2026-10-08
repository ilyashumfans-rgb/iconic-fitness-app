import type { Request } from "express";
import { z } from "zod";

/** Billing details the buyer types in themselves — never invented server-side. */
export const billingInput = z.object({
  address: z.string().trim().min(5, "Enter your billing address.").max(200, "Billing address is too long.")
    .regex(/^[\p{L}\p{N}\s,./#'()&-]+$/u, "Billing address has unsupported characters."),
  city: z.string().trim().min(2, "Enter your city.").max(60, "City is too long.").regex(/^[\p{L}\s.'-]+$/u, "Enter a valid city."),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
});
export type BillingInput = z.infer<typeof billingInput>;

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const HOST_RE = /^[a-z0-9.-]+(:\d{1,5})?$/i;
/**
 * Public origin for payment URLs. Prefers an explicitly configured canonical origin
 * (PUBLIC_APP_ORIGIN, if the deployment sets one); otherwise uses the request origin as seen
 * through the trusted proxy (app.set("trust proxy", 1) → req.protocol honours X-Forwarded-Proto).
 * Never falls back to development domains.
 */
export function publicOrigin(req: Request): string {
  const configured = process.env.PUBLIC_APP_ORIGIN?.trim();
  if (configured) {
    const u = new URL(configured);
    if (u.protocol !== "https:" && u.hostname !== "localhost") throw new Error("PUBLIC_APP_ORIGIN must be https");
    return u.origin;
  }
  // req.hostname honours X-Forwarded-Host only from the trusted proxy hop (trust proxy = 1).
  const hostname = req.hostname ?? "";
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const host = local ? (req.get("host") ?? hostname) : hostname;
  if (!host || !HOST_RE.test(host)) throw new Error("Invalid Host header");
  return `${local ? req.protocol : "https"}://${host}`;
}

const shell = (title: string, inner: string) =>
  // Airpay validates the merchant origin. Send only the origin, never the private
  // payment-token path, and suppress the header entirely on HTTPS downgrades.
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin"><title>${escapeHtml(title)}</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;box-sizing:border-box">${inner}</body></html>`;

const field = (name: string, label: string, value: string, attrs: string) =>
  `<label style="display:block;text-align:left;font-size:13px;color:#cfd3c8;margin-top:14px">${label}<input name="${name}" value="${escapeHtml(value)}" ${attrs} required style="display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:12px;border:1px solid #3a3f33;background:#15180f;color:#fff;font-size:16px"></label>`;

export function billingFormHtml(opts: { action: string; amountInr: number; expiresAt?: string | Date; tax?: { subtotalInr?: number; cgstInr?: number; sgstInr?: number; cgstPercent?: number; sgstPercent?: number }; values?: Partial<BillingInput>; error?: string }) {
  const v = opts.values ?? {};
  return shell("Billing details", `<form method="POST" action="${escapeHtml(opts.action)}" style="width:100%;max-width:380px">
<h1 style="font-size:20px;margin:0 0 6px">Billing details</h1>
${opts.expiresAt ? `<p>Complete payment before your reservation expires.</p><div id="countdown" role="timer" style="background:#60c600;color:#fff;border-radius:14px;padding:16px;text-align:center;font-size:38px;font-weight:800;font-variant-numeric:tabular-nums"></div><script>
window.addEventListener("DOMContentLoaded",function(){const end=${new Date(opts.expiresAt).getTime()};const timer=document.getElementById("countdown");function tick(){const n=Math.max(0,Math.ceil((end-Date.now())/1000));timer.textContent=n?String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"):"Time expired — return to the app to book again";if(!n){document.querySelector('button[type="submit"]').disabled=true;clearInterval(interval);}}const interval=setInterval(tick,1000);tick();});
</script>` : ""}
<p style="color:#aaa;font-size:13px;margin:0">Required by the payment gateway for your ₹${escapeHtml(opts.amountInr.toLocaleString("en-IN"))} online session. Used only for this payment.</p>
<dl style="text-align:left;font-size:14px;line-height:1.8"><dt>Base price: ₹${opts.tax?.subtotalInr ?? opts.amountInr}</dt><dt>CGST (${opts.tax?.cgstPercent ?? 0}%): ₹${opts.tax?.cgstInr ?? 0}</dt><dt>SGST (${opts.tax?.sgstPercent ?? 0}%): ₹${opts.tax?.sgstInr ?? 0}</dt><dt><strong>Total payable: ₹${opts.amountInr}</strong></dt></dl>
${opts.error ? `<p role="alert" style="color:#ff8a7a;font-size:13px;margin:12px 0 0">${escapeHtml(opts.error)}</p>` : ""}
${field("address", "Billing address", v.address ?? "", 'maxlength="200" autocomplete="street-address"')}
${field("city", "City", v.city ?? "", 'maxlength="60" autocomplete="address-level2"')}
${field("pincode", "PIN code", v.pincode ?? "", 'inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" autocomplete="postal-code"')}
<button type="submit" style="margin-top:18px;width:100%;padding:14px;border-radius:999px;border:0;background:#C7F000;color:#0A0C08;font-weight:700;font-size:15px">Continue to secure payment</button>
</form>`);
}

export function autoPostHtml(action: string, fields: Record<string, string>) {
  const inputs = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(String(v))}">`).join("");
  return shell("Redirecting to payment…", `<div style="text-align:center"><p style="color:#aaa">Taking you to the secure payment page…</p><form id="pay" method="POST" action="${escapeHtml(action)}">${inputs}<button type="submit" style="margin-top:12px;padding:12px 24px;border-radius:999px;border:0;background:#C7F000;color:#0A0C08;font-weight:700">Continue to payment</button></form><script>document.getElementById("pay").submit()</script></div>`);
}
