import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerCheckin } from "@/lib/partnerApi";
import { Search, CheckCircle2 } from "lucide-react";

export default function PartnerCheckins() {
  const [rows, setRows] = useState<PartnerCheckin[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    partnerApi.checkins().then(setRows).catch((e) => setErr(String(e)));
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PartnerCard>
    </PartnerLayout>
  );
}
