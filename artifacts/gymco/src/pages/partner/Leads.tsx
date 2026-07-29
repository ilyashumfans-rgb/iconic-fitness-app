import { useEffect, useMemo, useState } from "react";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { partnerApi } from "@/lib/partnerApi";
import { Inbox, Loader2, Mail, MapPin, Phone, Search } from "lucide-react";

type PartnerLead = Awaited<ReturnType<typeof partnerApi.leads.list>>[number];

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-green-100 text-green-700 border-green-200",
  qualified: "bg-purple-100 text-purple-700 border-purple-200",
  converted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lost: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PartnerLeads() {
  const [rows, setRows] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<string>("all");
  const [savingId, setSavingId] = useState<number | null>(null);

  const changeStatus = (id: number, status: string) => {
    const prev = rows;
    setSavingId(id);
    setErr(null);
    // Optimistic update; roll back on failure.
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    partnerApi.leads
      .setStatus(id, status)
      .catch((e) => {
        setRows(prev);
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setSavingId((s) => (s === id ? null : s)));
  };

  useEffect(() => {
    partnerApi.leads
      .list()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const branches = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of rows) {
      if (r.gymId != null) m.set(r.gymId, r.gymName || `Branch ${r.gymId}`);
    }
    return [...m.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (branch !== "all" && String(r.gymId) !== branch) return false;
      if (!ql) return true;
      return (
        r.name.toLowerCase().includes(ql) ||
        r.phone.toLowerCase().includes(ql) ||
        r.email.toLowerCase().includes(ql) ||
        r.city.toLowerCase().includes(ql)
      );
    });
  }, [rows, q, branch]);

  return (
    <PartnerLayout title="Leads">
      <div className="space-y-4">
        <div className="bg-white border border-lime-100 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, phone, email, city..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-lime-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 text-sm"
            />
          </div>
          {branches.length > 1 && (
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white border border-lime-100 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            >
              <option value="all">All branches</option>
              {branches.map(([id, name]) => (
                <option key={id} value={String(id)}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {err}
          </div>
        )}

        <div className="bg-white border border-lime-100 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin inline-block" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Inbox className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              No leads for your branches yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-lime-50/60 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Lead</th>
                    <th className="text-left px-4 py-2 font-semibold">
                      Contact
                    </th>
                    <th className="text-left px-4 py-2 font-semibold">
                      Branch
                    </th>
                    <th className="text-left px-4 py-2 font-semibold">
                      Source
                    </th>
                    <th className="text-left px-4 py-2 font-semibold">
                      Assigned to
                    </th>
                    <th className="text-left px-4 py-2 font-semibold">
                      Status
                    </th>
                    <th className="text-left px-4 py-2 font-semibold">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-lime-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">
                          {r.name}
                        </div>
                        {r.city ? (
                          <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {r.city}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {r.phone}
                        </div>
                        {r.email ? (
                          <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {r.email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.gymName || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.source}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.assignedTo || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.status}
                          disabled={savingId === r.id}
                          onChange={(e) => changeStatus(r.id, e.target.value)}
                          className={`px-2 py-1 rounded-full border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-500/60 disabled:opacity-50 ${
                            STATUS_STYLES[r.status] ??
                            "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {STATUS_OPTIONS.includes(
                            r.status as (typeof STATUS_OPTIONS)[number],
                          ) ? null : (
                            <option value={r.status}>{r.status}</option>
                          )}
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PartnerLayout>
  );
}
