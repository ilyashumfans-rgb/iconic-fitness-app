import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import {
  partnerApi,
  type PartnerCheckin,
  type PartnerEarnings,
} from "@/lib/partnerApi";
import { Search, CheckCircle2, IndianRupee } from "lucide-react";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

function EarningStat({
  label,
  visits,
  payoutInr,
}: {
  label: string;
  visits: number;
  payoutInr: number;
}) {
  return (
    <PartnerCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-400 font-medium">
          {label}
        </div>
        <div className="h-8 w-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center">
          <IndianRupee className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-white">{inr(payoutInr)}</div>
      <div className="mt-1 text-xs text-slate-500">
        {visits} {visits === 1 ? "visit" : "visits"}
      </div>
    </PartnerCard>
  );
}

export default function PartnerCheckins() {
  const [rows, setRows] = useState<PartnerCheckin[]>([]);
  const [earnings, setEarnings] = useState<PartnerEarnings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    partnerApi.checkins().then(setRows).catch((e) => setErr(String(e)));
    partnerApi.earnings().then(setEarnings).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.userName, r.userEmail, r.gymName]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  return (
    <PartnerLayout title="Check-ins">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <EarningStat
          label="Today"
          visits={earnings?.today.visits ?? 0}
          payoutInr={earnings?.today.payoutInr ?? 0}
        />
        <EarningStat
          label="Last 7 days"
          visits={earnings?.week.visits ?? 0}
          payoutInr={earnings?.week.payoutInr ?? 0}
        />
        <EarningStat
          label="This month"
          visits={earnings?.month.visits ?? 0}
          payoutInr={earnings?.month.payoutInr ?? 0}
        />
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by member or gym…"
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
        />
      </div>

      <PartnerCard className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-400">No check-ins to show.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Gym</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30"
                >
                  <td className="px-5 py-3 text-slate-300">
                    {new Date(c.checkedInAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-200">{c.userName}</div>
                    <div className="text-xs text-slate-500">{c.userEmail}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{c.gymName}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs uppercase tracking-wide">
                      {c.method}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="text-orange-400 font-semibold">
                      {inr(c.payoutInr)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {inr(c.baseInr)} + {c.taxPct}% GST
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PartnerCard>
    </PartnerLayout>
  );
}
