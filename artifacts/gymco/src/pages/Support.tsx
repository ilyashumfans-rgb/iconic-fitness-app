import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ticketsApi } from "@/lib/ticketsApi";
import {
  type Ticket,
  type TicketDetail,
  type NewTicketInput,
  formatTicketDate,
} from "@/lib/tickets";
import { NewTicketForm } from "@/components/tickets/NewTicketForm";
import { TicketThread } from "@/components/tickets/TicketThread";
import { StatusBadge, PriorityBadge } from "@/components/tickets/TicketBadges";
import { LifeBuoy, Plus, ArrowLeft } from "lucide-react";

function useQueryTicketId(): number | null {
  const [location] = useLocation();
  const qs = location.includes("?") ? location.split("?")[1] : "";
  const id = new URLSearchParams(qs).get("ticket");
  return id ? Number(id) : null;
}

export default function Support() {
  const [, navigate] = useLocation();
  const initialId = useQueryTicketId();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [openId, setOpenId] = useState<number | null>(initialId);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);

  const load = () => {
    setLoading(true);
    ticketsApi
      .mine()
      .then(setRows)
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (openId == null) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    ticketsApi
      .get(openId)
      .then(setDetail)
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setDetailLoading(false));
  }, [openId]);

  const create = async (input: NewTicketInput) => {
    setSubmitting(true);
    try {
      await ticketsApi.create(input);
      setCreating(false);
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
      await ticketsApi.comment(openId, text);
      const d = await ticketsApi.get(openId);
      setDetail(d);
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setCommenting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Support</h1>
            <p className="text-sm text-slate-500">
              Raise a ticket and track its progress.
            </p>
          </div>
        </div>
        {!creating && openId == null && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" /> New ticket
          </button>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-sm text-orange-700">
          {err}
        </div>
      )}

      {creating ? (
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            New support ticket
          </h2>
          <NewTicketForm
            onSubmit={create}
            onCancel={() => setCreating(false)}
            submitting={submitting}
          />
        </div>
      ) : openId != null ? (
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <button
            onClick={() => {
              setOpenId(null);
              navigate("/support");
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
            />
          )}
        </div>
      ) : loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-10 text-center">
          <p className="text-sm text-slate-600">
            You haven't raised any tickets yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setOpenId(t.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-orange-300 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {t.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    #{t.id} · updated {formatTicketDate(t.updatedAt)}
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
      )}
    </div>
  );
}
