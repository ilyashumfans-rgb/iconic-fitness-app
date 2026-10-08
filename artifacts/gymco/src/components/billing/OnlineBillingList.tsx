import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Search, X, Receipt, AlertTriangle } from "lucide-react";
import type { OnlineBill } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Query = {
  data?: OnlineBill[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
};

const errorMessage = (e: unknown) =>
  (e as { data?: { error?: string } } | null)?.data?.error ?? (e instanceof Error ? e.message : "Unable to load billing records.");
const istDT = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const istD = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

type Charge = "paid" | "covered" | "unpaid" | "refund_pending" | "refunded";
export function chargeState(b: OnlineBill): Charge {
  if (b.refundStatus === "pending_admin") return "refund_pending";
  if (b.refundStatus) return "refunded";
  if (b.planCovered) return "covered";
  return b.paid ? "paid" : "unpaid";
}
const CHARGE: Record<Charge, { label: string; tone: string }> = {
  paid: { label: "Paid", tone: "bg-lime-100 text-lime-800" },
  covered: { label: "Plan-covered · ₹0 extra", tone: "bg-sky-100 text-sky-800" },
  unpaid: { label: "Unpaid", tone: "bg-amber-100 text-amber-800" },
  refund_pending: { label: "Refund pending", tone: "bg-red-100 text-red-700" },
  refunded: { label: "Refunded", tone: "bg-slate-200 text-slate-700" },
};
const STATUS_LABEL: Record<string, string> = {
  held: "Awaiting payment", paid: "Confirmed", completed: "Completed", cancelled: "Cancelled", expired: "Expired",
  payment_failed: "Payment failed", paid_conflict: "Paid · conflict", active: "Active",
};
const refundLabel = (r: string | null) => (r == null ? "None" : r === "pending_admin" ? "Refund pending (manual, via Airpay)" : "Refunded (manual)");

export function OnlineBillingList({ query, scopeNote }: { query: Query; scopeNote: string }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "session" | "plan">("all");
  const [charge, setCharge] = useState<"all" | Charge>("all");
  const [open, setOpen] = useState<OnlineBill | null>(null);
  const list = query.data ?? [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter(b =>
      (kind === "all" || b.kind === kind) &&
      (charge === "all" || chargeState(b) === charge) &&
      (!s || [b.memberName, b.trainerName, b.branchName, b.description, b.invoiceNumber ?? "", b.paymentReference ?? ""].some(v => v.toLowerCase().includes(s))));
  }, [list, q, kind, charge]);

  // Collected = actually paid, not plan-covered (avoids double counting), not refunded.
  const totals = useMemo(() => {
    let collected = 0, refunded = 0, pending = 0, covered = 0;
    for (const b of filtered) {
      const c = chargeState(b);
      if (c === "paid") collected += b.amountInr;
      else if (c === "refunded") refunded += b.amountInr;
      else if (c === "refund_pending") pending += b.amountInr;
      else if (c === "covered") covered += 1;
    }
    return { collected, refunded, pending, covered };
  }, [filtered]);

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Collected (net)" value={inr(totals.collected)} hint="Paid sessions + plan terms" accent />
      <Stat label="Plan-covered sessions" value={String(totals.covered)} hint="₹0 extra — counted in plan term" />
      <Stat label="Refund pending" value={inr(totals.pending)} hint="Needs manual Airpay refund" warn={totals.pending > 0} />
      <Stat label="Refunded" value={inr(totals.refunded)} hint="Excluded from collected" />
    </div>

    <div className="rounded-2xl border border-lime-100 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-lime-100 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search member, coach, branch, receipt no. or payment ref" className="pl-9" data-testid="input-billing-search" />
        </div>
        <Seg value={kind} onChange={v => setKind(v as typeof kind)} options={[["all", "All"], ["session", "Sessions"], ["plan", "Plans"]]} />
        <select value={charge} onChange={e => setCharge(e.target.value as typeof charge)} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Payment filter" data-testid="select-billing-charge">
          <option value="all">All payment states</option>
          {(Object.keys(CHARGE) as Charge[]).map(k => <option key={k} value={k}>{CHARGE[k].label}</option>)}
        </select>
        <Button variant="outline" size="icon" aria-label="Refresh" onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button>
      </div>
      <p className="border-b border-lime-50 bg-lime-50/50 px-4 py-2 text-xs text-slate-600">{scopeNote} Auto-refreshes every 30 seconds.</p>

      {query.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        : query.isError ? <div className="space-y-3 p-10 text-center"><AlertTriangle className="mx-auto h-7 w-7 text-red-500" /><p role="alert" className="text-sm text-red-700">{errorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>
        : list.length === 0 ? <div className="flex flex-col items-center gap-2 p-14 text-center"><Receipt className="h-9 w-9 text-lime-600" /><p className="font-semibold">No online coaching bills yet</p><p className="max-w-sm text-sm text-slate-500">Paid sessions and prepaid plan terms appear here once members book through Network Coach.</p></div>
        : filtered.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No bills match these filters. <button className="font-semibold text-lime-700 underline" onClick={() => { setQ(""); setKind("all"); setCharge("all"); }}>Clear filters</button></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><tr>
            <th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5">Member</th><th className="px-4 py-2.5">Coach · Branch</th><th className="px-4 py-2.5">Booked dates (IST)</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Amount</th><th className="px-4 py-2.5">Payment</th><th className="px-4 py-2.5" />
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map(b => {
            const c = chargeState(b);
            return <tr key={`${b.kind}-${b.id}`} className={c === "refund_pending" ? "bg-red-50/40" : "hover:bg-lime-50/30"} data-testid={`row-bill-${b.kind}-${b.id}`}>
              <td className="px-4 py-3"><span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${b.kind === "plan" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"}`}>{b.kind}</span><span className="font-medium">{b.description}</span>
                {b.invoiceNumber && <div className="mt-0.5 font-mono text-[11px] text-slate-500">{b.invoiceNumber}</div>}</td>
              <td className="px-4 py-3">{b.memberName}</td>
              <td className="px-4 py-3">{b.trainerName}<div className="text-xs text-slate-500">{b.branchName}</div></td>
              <td className="px-4 py-3 whitespace-nowrap text-xs">{b.startsAt ? (b.kind === "plan" ? istD(b.startsAt) : istDT(b.startsAt)) : "—"}{b.endsAt && b.kind === "plan" ? ` – ${istD(b.endsAt)}` : ""}</td>
              <td className="px-4 py-3 text-xs">{STATUS_LABEL[b.status] ?? b.status}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{c === "covered" ? <span className="text-sky-700">₹0</span> : <span className={c === "refunded" ? "text-slate-400 line-through" : ""}>{inr(b.amountInr)}</span>}</td>
              <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${CHARGE[c].tone}`}>{CHARGE[c].label}</span></td>
              <td className="px-4 py-3 text-right">{b.invoiceNumber != null && <Button size="sm" variant="outline" onClick={() => setOpen(b)} data-testid={`button-view-invoice-${b.kind}-${b.id}`}><FileText className="mr-1.5 h-3.5 w-3.5" />View invoice</Button>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
    </div>
    {open && <InvoiceModal bill={open} onClose={() => setOpen(null)} />}
  </div>;
}

function Stat({ label, value, hint, accent, warn }: { label: string; value: string; hint: string; accent?: boolean; warn?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? "border-lime-300 bg-gradient-to-br from-lime-50 to-white" : warn ? "border-red-200 bg-red-50/50" : "border-lime-100 bg-white"}`}>
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-extrabold tabular-nums ${warn ? "text-red-700" : "text-slate-900"}`}>{value}</p>
    <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
  </div>;
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <div className="inline-flex rounded-lg border bg-slate-50 p-0.5" role="group">
    {options.map(([v, l]) => <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${value === v ? "bg-white text-lime-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{l}</button>)}
  </div>;
}

function InvoiceModal({ bill: b, onClose }: { bill: OnlineBill; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const c = chargeState(b);
  const Row = ({ l, v, mono }: { l: string; v: string; mono?: boolean }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-500">{l}</span><span className={`text-right font-medium ${mono ? "font-mono text-xs" : ""}`}>{v}</span></div>;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between bg-slate-900 p-5 text-white">
        <div>
          <img src={`${import.meta.env.BASE_URL}media/iconic-fitness-logo-transparent.png`} alt="Iconic Fitness" className="h-10 w-auto" />
          <p id="receipt-title" className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-lime-300">Payment receipt · Online coaching</p>
          <p className="mt-1 font-mono text-sm">{b.invoiceNumber}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-4 p-5">
        <section className="divide-y rounded-xl border px-4 py-1">
          <Row l="Member" v={b.memberName} /><Row l="Coach" v={b.trainerName} /><Row l="Branch" v={b.branchName} />
        </section>
        <section className="divide-y rounded-xl border px-4 py-1">
          <Row l="Description" v={b.description} />
          <Row l="Type" v={b.kind === "plan" ? "Prepaid plan term" : "Live 1:1 session"} />
          {b.kind === "plan"
            ? <Row l="Term" v={b.startsAt ? `${istD(b.startsAt)}${b.endsAt ? ` – ${istD(b.endsAt)}` : ""}` : "—"} />
            : <Row l="Session" v={b.startsAt ? `${istDT(b.startsAt)}${b.endsAt ? ` – ${new Date(b.endsAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}` : ""}` : "—"} />}
          <Row l="Paid at" v={b.paidAt ? istDT(b.paidAt) : "—"} />
          <Row l="Payment reference" v={b.paymentReference ?? "—"} mono />
          <Row l="Refund status" v={refundLabel(b.refundStatus)} />
          <Row l="Base price" v={inr(b.subtotalInr ?? b.amountInr)} />
          <Row l={`CGST (${b.cgstPercent ?? 0}%)`} v={inr(b.cgstInr ?? 0)} />
          <Row l={`SGST (${b.sgstPercent ?? 0}%)`} v={inr(b.sgstInr ?? 0)} />
        </section>
        <div className="flex items-center justify-between rounded-xl bg-lime-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-600">{c === "covered" ? "Extra charge (plan-covered)" : "Total including GST (INR)"}</span>
          <span className={`text-2xl font-extrabold tabular-nums ${c === "refunded" ? "text-slate-400 line-through" : ""}`}>{c === "covered" ? "₹0" : inr(b.amountInr)}</span>
        </div>
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${CHARGE[c].tone}`}>{CHARGE[c].label}</span>
        <p className="text-xs leading-relaxed text-slate-500">App-generated payment receipt for an Iconic Network Coach online purchase. This is not an official GST tax invoice. For billing questions contact the branch listed above.</p>
      </div>
    </div>
  </div>;
}
