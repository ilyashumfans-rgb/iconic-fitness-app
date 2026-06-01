import { useEffect, useMemo, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import {
  Inbox,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Trash2,
  X,
  Search,
  Filter,
} from "lucide-react";

type Lead = {
  id: number;
  kind: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  classId: number | null;
  gymId: number | null;
  className: string;
  gymName: string;
  preferredDate: string;
  message: string;
  source: string;
  status: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STATUSES = [
  { key: "new", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "contacted", label: "Contacted", color: "bg-green-100 text-green-700 border-green-200" },
  { key: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { key: "converted", label: "Converted", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Lost", color: "bg-slate-100 text-slate-600 border-slate-200" },
];

function statusClass(s: string) {
  return STATUSES.find((x) => x.key === s)?.color ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export default function AdminLeads() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Lead | null>(null);

  const load = () => {
    setBusy(true);
    setErr(null);
    adminApi.leads
      .list()
      .then((r) => setRows(r as Lead[]))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: rows.length };
    for (const s of STATUSES) m[s.key] = 0;
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!ql) return true;
      return (
        r.name.toLowerCase().includes(ql) ||
        r.phone.toLowerCase().includes(ql) ||
        r.email.toLowerCase().includes(ql) ||
        r.className.toLowerCase().includes(ql) ||
        r.gymName.toLowerCase().includes(ql) ||
        r.city.toLowerCase().includes(ql)
      );
    });
  }, [rows, filter, q]);

  const update = async (id: number, patch: Record<string, unknown>) => {
    try {
      const updated = await adminApi.leads.update(id, patch);
      setRows((rs) => rs.map((r) => (r.id === id ? (updated as Lead) : r)));
      if (editing && editing.id === id) setEditing(updated as Lead);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await adminApi.leads.remove(id);
      setRows((rs) => rs.filter((r) => r.id !== id));
      if (editing && editing.id === id) setEditing(null);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  return (
    <AdminLayout title="Leads (CRM)">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`text-left rounded-2xl p-4 border transition ${
              filter === "all"
                ? "bg-gradient-to-br from-lime-500 to-green-500 text-white border-transparent shadow-md"
                : "bg-white border-lime-100 hover:border-lime-300"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              All Leads
            </div>
            <div className="text-2xl font-black mt-1">{counts.all}</div>
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`text-left rounded-2xl p-4 border transition ${
                filter === s.key
                  ? "bg-gradient-to-br from-lime-500 to-green-500 text-white border-transparent shadow-md"
                  : "bg-white border-lime-100 hover:border-lime-300"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {s.label}
              </div>
              <div className="text-2xl font-black mt-1">{counts[s.key] ?? 0}</div>
            </button>
          ))}
        </div>

        {/* Search + filter row */}
        <AdminCard className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, phone, email, gym, class..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-lime-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 text-sm"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-50 border border-lime-100 text-lime-700 text-xs font-bold">
              <Filter className="h-3.5 w-3.5" />
              {filter === "all" ? "All statuses" : STATUSES.find((s) => s.key === filter)?.label}
              <span className="ml-1 text-slate-500">({filtered.length})</span>
            </div>
          </div>
        </AdminCard>

        {err ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </div>
        ) : null}

        {/* Table */}
        <AdminCard>
          {busy ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              Loading leads...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Inbox className="h-10 w-10 mx-auto mb-2 text-lime-400" />
              <div className="font-bold">No leads yet</div>
              <div className="text-sm">
                When visitors book a free class, their enquiry will appear here.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-lime-50/60 text-slate-600">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Lead</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Interested in</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Contact</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Received</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lime-50">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-lime-50/40 cursor-pointer"
                      onClick={() => setEditing(r)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.name}</div>
                        {r.city ? (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {r.city}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {r.className || r.gymName || (
                            <span className="text-slate-400">General enquiry</span>
                          )}
                        </div>
                        {r.className && r.gymName ? (
                          <div className="text-xs text-slate-500 mt-0.5">{r.gymName}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-lime-500" />
                          <a
                            href={`tel:${r.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono hover:text-lime-600"
                          >
                            {r.phone}
                          </a>
                        </div>
                        {r.email ? (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {r.email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={r.status}
                          onChange={(e) => update(r.id, { status: e.target.value })}
                          className={`text-[11px] font-bold uppercase tracking-wider rounded-full border px-2.5 py-1 ${statusClass(r.status)}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => remove(r.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Delete lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {/* Detail drawer */}
      {editing ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-lime-100 p-5 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lead #{editing.id} · {editing.source}
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {editing.name}
                </div>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="p-1 rounded-full hover:bg-lime-50 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`tel:${editing.phone}`}
                  className="rounded-xl border border-lime-100 bg-lime-50/50 p-3 hover:border-lime-300"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Phone
                  </div>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-1">
                    {editing.phone}
                  </div>
                </a>
                {editing.email ? (
                  <a
                    href={`mailto:${editing.email}`}
                    className="rounded-xl border border-lime-100 bg-lime-50/50 p-3 hover:border-lime-300"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Email
                    </div>
                    <div className="font-medium text-slate-900 text-sm mt-1 truncate">
                      {editing.email}
                    </div>
                  </a>
                ) : null}
              </div>

              <div className="rounded-xl border border-lime-100 p-4 space-y-2 text-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Interest
                </div>
                {editing.className ? (
                  <div className="font-bold text-slate-900">{editing.className}</div>
                ) : null}
                {editing.gymName ? (
                  <div className="text-slate-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-lime-500" /> {editing.gymName}
                  </div>
                ) : null}
                {editing.city ? (
                  <div className="text-slate-600">City: {editing.city}</div>
                ) : null}
                {editing.preferredDate ? (
                  <div className="text-slate-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-lime-500" />
                    Preferred: {editing.preferredDate}
                  </div>
                ) : null}
                {editing.message ? (
                  <div className="text-slate-700 italic border-l-2 border-lime-300 pl-3 mt-2">
                    "{editing.message}"
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => update(editing.id, { status: s.key })}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition ${
                        editing.status === s.key
                          ? "bg-gradient-to-r from-lime-500 to-green-500 text-white border-transparent shadow"
                          : `${s.color} hover:opacity-80`
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Assigned To
                </label>
                <input
                  defaultValue={editing.assignedTo}
                  onBlur={(e) =>
                    e.target.value !== editing.assignedTo &&
                    update(editing.id, { assignedTo: e.target.value })
                  }
                  placeholder="Sales rep name or email"
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Internal Notes
                </label>
                <textarea
                  defaultValue={editing.notes}
                  onBlur={(e) =>
                    e.target.value !== editing.notes &&
                    update(editing.id, { notes: e.target.value })
                  }
                  rows={5}
                  placeholder="Call notes, follow-up reminders, deal context..."
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
                <div className="text-[10px] text-slate-400 mt-1">
                  Auto-saves when you click out of the field.
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                Received {new Date(editing.createdAt).toLocaleString("en-IN")} ·
                Last updated {new Date(editing.updatedAt).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
