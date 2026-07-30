import { useEffect, useMemo, useState } from "react";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerComplaintRow } from "@/lib/partnerApi";
import { Inbox, Loader2, MapPin, Phone, RotateCcw, Search } from "lucide-react";

const STATUS_OPTIONS = ["open", "in_progress", "resolved"] as const;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-700 border-red-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

function isReopened(r: PartnerComplaintRow) {
  const last = r.followUps?.[r.followUps.length - 1];
  return Boolean(last?.reopened) && r.status !== "resolved";
}

function lastActivityAt(r: PartnerComplaintRow) {
  const last = r.followUps?.[r.followUps.length - 1];
  const created = new Date(r.createdAt).getTime() || 0;
  const followed = last ? new Date(last.at).getTime() || 0 : 0;
  return Math.max(created, followed);
}

export default function PartnerComplaints() {
  const [rows, setRows] = useState<PartnerComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    partnerApi.complaints
      .list()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const changeStatus = (id: number, status: string) => {
    const prev = rows;
    setSavingId(id);
    setErr(null);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    partnerApi.complaints
      .update(id, { status })
      .catch((e) => {
        setRows(prev);
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setSavingId((s) => (s === id ? null : s)));
  };

  const saveResponse = (id: number) => {
    setSavingId(id);
    setErr(null);
    partnerApi.complaints
      .update(id, { response: draft })
      .then((updated) =>
        setRows((rs) => rs.map((r) => (r.id === id ? updated : r))),
      )
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setSavingId((s) => (s === id ? null : s)));
  };

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    const list = rows.filter((r) => {
      if (statusFilter === "reopened") {
        if (!isReopened(r)) return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      if (!ql) return true;
      return (
        r.memberName.toLowerCase().includes(ql) ||
        r.mobile.includes(ql) ||
        r.subject.toLowerCase().includes(ql) ||
        r.gymName.toLowerCase().includes(ql)
      );
    });
    return [...list].sort((a, b) => {
      const ra = isReopened(a) ? 1 : 0;
      const rb = isReopened(b) ? 1 : 0;
      if (ra !== rb) return rb - ra;
      return lastActivityAt(b) - lastActivityAt(a);
    });
  }, [rows, q, statusFilter]);

  return (
    <PartnerLayout title="Complaints">
      <div className="space-y-4">
        <div className="bg-white border border-lime-100 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by member, phone, subject..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-lime-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-lime-100 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          >
            <option value="all">All statuses</option>
            <option value="reopened">Reopened</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {err}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-lime-100 rounded-2xl p-10 text-center text-slate-500">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No complaints yet. Member complaints for your branches will appear
            here.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const expanded = openId === r.id;
              return (
                <div
                  key={r.id}
                  className="bg-white border border-lime-100 rounded-2xl shadow-sm overflow-hidden"
                >
                  <button
                    className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-2"
                    onClick={() => {
                      setOpenId(expanded ? null : r.id);
                      setDraft(r.response);
                    }}
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-semibold text-slate-900 text-sm">
                        {r.subject}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-3">
                        <span>{r.memberName || "Member"}</span>
                        {r.mobile && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {r.mobile}
                          </span>
                        )}
                        {r.gymName && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {r.gymName}
                          </span>
                        )}
                        <span>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    {isReopened(r) && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2.5 py-1 bg-orange-100 text-orange-700 border-orange-200">
                        <RotateCcw className="h-3 w-3" /> Reopened
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </button>
                  {expanded && (
                    <div className="border-t border-lime-100 px-4 py-3 space-y-3 bg-lime-50/30">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {r.message}
                      </p>
                      {(r.followUps ?? []).map((f, i) => (
                        <div
                          key={i}
                          className="border-l-2 border-slate-300 pl-3 text-sm"
                        >
                          <div className="text-xs font-medium text-slate-500">
                            {f.reopened
                              ? "Member reopened this ticket"
                              : "Member follow-up"}
                            {" · "}
                            {new Date(f.at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          {f.message && (
                            <p className="text-slate-700 whitespace-pre-wrap mt-0.5">
                              {f.message}
                            </p>
                          )}
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            disabled={savingId === r.id || r.status === s}
                            onClick={() => changeStatus(r.id, s)}
                            className={`text-xs font-medium rounded-full px-3 py-1.5 border transition ${
                              r.status === s
                                ? STATUS_STYLES[s]
                                : "bg-white text-slate-600 border-slate-200 hover:border-lime-300"
                            }`}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Reply to member (shown in their app)
                        </label>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          className="mt-1 w-full rounded-xl border border-lime-100 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                          placeholder="Write a short reply..."
                        />
                        <button
                          disabled={savingId === r.id}
                          onClick={() => saveResponse(r.id)}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-lime-600 text-white text-xs font-semibold px-4 py-2 hover:bg-lime-700 disabled:opacity-50"
                        >
                          {savingId === r.id && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          Save reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
