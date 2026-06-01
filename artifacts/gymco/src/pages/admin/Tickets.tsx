import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import {
  type Ticket,
  type TicketDetail,
  type TicketStatus,
  type TicketPriority,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  formatTicketDate,
} from "@/lib/tickets";
import { TicketThread } from "@/components/tickets/TicketThread";
import { StatusBadge, PriorityBadge, RoleBadge } from "@/components/tickets/TicketBadges";
import { ArrowLeft } from "lucide-react";

type Assignees = {
  staff: { id: number; name: string; email: string }[];
  partners: { id: number; name: string; email: string }[];
  admins: { id: number; name: string; email: string }[];
};

const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-100";

export default function AdminTickets() {
  const [location, navigate] = useLocation();
  const qs = location.includes("?") ? location.split("?")[1] : "";
  const initialId = new URLSearchParams(qs).get("ticket");

  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [assignees, setAssignees] = useState<Assignees | null>(null);

  const [openId, setOpenId] = useState<number | null>(
    initialId ? Number(initialId) : null,
  );
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.tickets
      .list({ status, priority, assignee })
      .then(setRows)
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, priority, assignee]);

  useEffect(() => {
    adminApi.tickets
      .assignees()
      .then(setAssignees)
      .catch(() => {});
  }, []);

  const openDetail = (id: number) => {
    setOpenId(id);
    setDetailLoading(true);
    adminApi.tickets
      .get(id)
      .then(setDetail)
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    if (openId != null) openDetail(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDetail = async () => {
    if (openId == null) return;
    setDetail(await adminApi.tickets.get(openId));
  };

  const comment = async (text: string) => {
    if (openId == null) return;
    setCommenting(true);
    try {
      await adminApi.tickets.comment(openId, text);
      await refreshDetail();
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setCommenting(false);
    }
  };

  const setTicketStatus = async (s: string) => {
    if (openId == null) return;
    setBusy(true);
    try {
      await adminApi.tickets.setStatus(openId, s);
      await refreshDetail();
      load();
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const setTicketPriority = async (p: string) => {
    if (openId == null) return;
    setBusy(true);
    try {
      await adminApi.tickets.setPriority(openId, p);
      await refreshDetail();
      load();
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const assign = async (value: string) => {
    if (openId == null) return;
    setBusy(true);
    try {
      if (!value) {
        await adminApi.tickets.assign(openId, {
          assigneeRole: null,
          assigneeId: null,
        });
      } else {
        const [role, id] = value.split(":");
        await adminApi.tickets.assign(openId, {
          assigneeRole: role,
          assigneeId: Number(id),
        });
      }
      await refreshDetail();
      load();
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const currentAssignValue =
    detail?.ticket.assigneeRole && detail.ticket.assigneeId != null
      ? `${detail.ticket.assigneeRole}:${detail.ticket.assigneeId}`
      : "";

  return (
    <AdminLayout title="Tickets">
      {err && (
        <div className="mb-4 rounded-xl border border-lime-200 bg-lime-50 px-3.5 py-2.5 text-sm text-lime-700">
          {err}
        </div>
      )}

      {openId != null ? (
        <AdminCard className="p-5">
          <button
            onClick={() => {
              setOpenId(null);
              setDetail(null);
              navigate("/admin/tickets");
              load();
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-lime-600 hover:text-lime-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to tickets
          </button>
          {detailLoading || !detail ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : (
            <TicketThread
              detail={detail}
              onComment={comment}
              commenting={commenting}
              headerExtra={
                <div className="grid gap-3 rounded-xl border border-lime-100 bg-lime-50/50 p-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Status
                    </label>
                    <select
                      className={`${selectCls} w-full`}
                      value={detail.ticket.status}
                      disabled={busy}
                      onChange={(e) => setTicketStatus(e.target.value)}
                    >
                      {TICKET_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Priority
                    </label>
                    <select
                      className={`${selectCls} w-full`}
                      value={detail.ticket.priority}
                      disabled={busy}
                      onChange={(e) => setTicketPriority(e.target.value)}
                    >
                      {TICKET_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Assignee
                    </label>
                    <select
                      className={`${selectCls} w-full`}
                      value={currentAssignValue}
                      disabled={busy}
                      onChange={(e) => assign(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {assignees && (
                        <>
                          <optgroup label="Staff">
                            {assignees.staff.map((a) => (
                              <option key={`staff:${a.id}`} value={`staff:${a.id}`}>
                                {a.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Partners">
                            {assignees.partners.map((a) => (
                              <option
                                key={`partner:${a.id}`}
                                value={`partner:${a.id}`}
                              >
                                {a.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Admins">
                            {assignees.admins.map((a) => (
                              <option key={`admin:${a.id}`} value={`admin:${a.id}`}>
                                {a.name}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              }
            />
          )}
        </AdminCard>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Status
              </label>
              <select
                className={selectCls}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Priority
              </label>
              <select
                className={selectCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">All</option>
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Assignee
              </label>
              <select
                className={selectCls}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                {assignees && (
                  <>
                    <optgroup label="Staff">
                      {assignees.staff.map((a) => (
                        <option key={`staff:${a.id}`} value={`staff:${a.id}`}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Partners">
                      {assignees.partners.map((a) => (
                        <option key={`partner:${a.id}`} value={`partner:${a.id}`}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Admins">
                      {assignees.admins.map((a) => (
                        <option key={`admin:${a.id}`} value={`admin:${a.id}`}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-lime-200 bg-lime-50/40 p-10 text-center text-sm text-slate-600">
              No tickets match these filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-lime-100 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-lime-50/60 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Requester</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openDetail(t.id)}
                      className="cursor-pointer transition hover:bg-lime-50/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{t.subject}</p>
                        <p className="text-xs text-slate-400">#{t.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <RoleBadge role={t.requesterRole} />
                          <span className="text-slate-600">
                            {t.requesterName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {t.assigneeRole ? (
                          <div className="flex items-center gap-1.5">
                            <RoleBadge role={t.assigneeRole} />
                            <span className="text-slate-600">
                              {t.assigneeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatTicketDate(t.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
