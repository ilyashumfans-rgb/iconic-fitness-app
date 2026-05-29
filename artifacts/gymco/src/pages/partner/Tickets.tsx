import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi } from "@/lib/partnerApi";
import {
  type Ticket,
  type TicketDetail,
  type NewTicketInput,
  type TicketStatus,
  TICKET_STATUSES,
  STATUS_LABELS,
  formatTicketDate,
} from "@/lib/tickets";
import { NewTicketForm } from "@/components/tickets/NewTicketForm";
import { TicketThread } from "@/components/tickets/TicketThread";
import { StatusBadge, PriorityBadge } from "@/components/tickets/TicketBadges";
import { Plus, ArrowLeft } from "lucide-react";

type Tab = "assigned" | "raised";

function TicketList({
  rows,
  onOpen,
}: {
  rows: Ticket[];
  onOpen: (id: number) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-10 text-center text-sm text-slate-600">
        No tickets here.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((t) => (
        <li key={t.id}>
          <button
            onClick={() => onOpen(t.id)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-orange-300 hover:shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{t.subject}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                #{t.id} · from {t.requesterName} · updated{" "}
                {formatTicketDate(t.updatedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PartnerTickets() {
  const [location, navigate] = useLocation();
  const qs = location.includes("?") ? location.split("?")[1] : "";
  const initialId = new URLSearchParams(qs).get("ticket");

  const [tab, setTab] = useState<Tab>("assigned");
  const [assigned, setAssigned] = useState<Ticket[]>([]);
  const [raised, setRaised] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [openId, setOpenId] = useState<number | null>(
    initialId ? Number(initialId) : null,
  );
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([partnerApi.tickets.assigned(), partnerApi.tickets.mine()])
      .then(([a, r]) => {
        setAssigned(a);
        setRaised(r);
      })
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openDetail = (id: number) => {
    setOpenId(id);
    setDetailLoading(true);
    partnerApi.tickets
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
    setDetail(await partnerApi.tickets.get(openId));
  };

  const create = async (input: NewTicketInput) => {
    setSubmitting(true);
    try {
      await partnerApi.tickets.create(input);
      setCreating(false);
      setTab("raised");
      load();
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const comment = async (text: string) => {
    if (openId == null) return;
    setCommenting(true);
    try {
      await partnerApi.tickets.comment(openId, text);
      await refreshDetail();
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setCommenting(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (openId == null) return;
    setStatusBusy(true);
    try {
      await partnerApi.tickets.setStatus(openId, status);
      await refreshDetail();
      load();
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setStatusBusy(false);
    }
  };

  const isAssignee = detail?.ticket.assigneeRole === "partner";

  return (
    <PartnerLayout
      title="Tickets"
      actions={
        !creating && openId == null ? (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" /> New ticket
          </button>
        ) : undefined
      }
    >
      {err && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-sm text-orange-700">
          {err}
        </div>
      )}

      {creating ? (
        <PartnerCard className="p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            New ticket
          </h2>
          <NewTicketForm
            onSubmit={create}
            onCancel={() => setCreating(false)}
            submitting={submitting}
          />
        </PartnerCard>
      ) : openId != null ? (
        <PartnerCard className="p-5">
          <button
            onClick={() => {
              setOpenId(null);
              setDetail(null);
              navigate("/partner/tickets");
              load();
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
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
                isAssignee ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                    <span className="text-xs font-medium text-slate-600">
                      Update status:
                    </span>
                    {TICKET_STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={statusBusy || detail.ticket.status === s}
                        onClick={() => changeStatus(s)}
                        className="rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-xs font-medium text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {STATUS_LABELS[s as TicketStatus]}
                      </button>
                    ))}
                  </div>
                ) : null
              }
            />
          )}
        </PartnerCard>
      ) : (
        <>
          <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setTab("assigned")}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                tab === "assigned"
                  ? "bg-orange-500 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Assigned to me ({assigned.length})
            </button>
            <button
              onClick={() => setTab("raised")}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                tab === "raised"
                  ? "bg-orange-500 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Raised by me ({raised.length})
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : (
            <TicketList
              rows={tab === "assigned" ? assigned : raised}
              onOpen={openDetail}
            />
          )}
        </>
      )}
    </PartnerLayout>
  );
}
