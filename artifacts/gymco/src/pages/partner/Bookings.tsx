import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerBooking } from "@/lib/partnerApi";
import { Search, Calendar } from "lucide-react";

export default function PartnerBookings() {
  const [rows, setRows] = useState<PartnerBooking[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    partnerApi.bookings().then(setRows).catch((e) => setErr(String(e)));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      return [r.userName, r.userEmail, r.classTitle, r.gymName]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(needle));
    });
  }, [rows, q, status]);

  return (
    <PartnerLayout title="Bookings">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by user, class, or gym…"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <PartnerCard className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-400">No bookings to show.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3">Booked</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Gym</th>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Starts</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-medium text-white">{b.classTitle}</td>
                  <td className="px-5 py-3 text-slate-300">{b.gymName}</td>
                  <td className="px-5 py-3">
                    <div className="text-slate-200">{b.userName}</div>
                    <div className="text-xs text-slate-500">{b.userEmail}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {new Date(b.startsAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={b.status} />
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    completed: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  const cls = map[status] ?? "bg-slate-700/40 text-slate-300 border-slate-600";
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide border ${cls}`}
    >
      {status}
    </span>
  );
}
