import { useState } from "react";
import {
  type TicketDetail,
  formatCategory,
  formatTicketDate,
  ROLE_LABELS,
} from "@/lib/tickets";
import { StatusBadge, PriorityBadge, RoleBadge } from "./TicketBadges";

export function TicketThread({
  detail,
  onComment,
  commenting,
  headerExtra,
}: {
  detail: TicketDetail;
  onComment?: (text: string) => void | Promise<void>;
  commenting?: boolean;
  headerExtra?: React.ReactNode;
}) {
  const { ticket, comments } = detail;
  const [reply, setReply] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !onComment) return;
    await onComment(reply.trim());
    setReply("");
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {ticket.subject}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              #{ticket.id} · {formatCategory(ticket.category)} · opened{" "}
              {formatTicketDate(ticket.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            Raised by <RoleBadge role={ticket.requesterRole} />
            <span className="font-medium text-slate-700">
              {ticket.requesterName}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            Assigned to{" "}
            {ticket.assigneeRole ? (
              <>
                <RoleBadge role={ticket.assigneeRole} />
                <span className="font-medium text-slate-700">
                  {ticket.assigneeName}
                </span>
              </>
            ) : (
              <span className="font-medium text-slate-400">Unassigned</span>
            )}
          </span>
        </div>
        {headerExtra}
      </div>

      <div className="rounded-2xl border border-lime-100 bg-lime-50/40 p-4">
        <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
          <RoleBadge role={ticket.requesterRole} />
          <span className="font-medium text-slate-700">
            {ticket.requesterName}
          </span>
          <span>· {formatTicketDate(ticket.createdAt)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {ticket.description}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Conversation ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">No replies yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
                  <RoleBadge role={c.authorRole} />
                  <span className="font-medium text-slate-700">
                    {c.authorName}
                  </span>
                  <span>· {formatTicketDate(c.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {c.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onComment && ticket.status !== "closed" && (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            className="min-h-[90px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-100"
            placeholder="Write a reply..."
            maxLength={5000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={commenting || !reply.trim()}
              className="rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-lime-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commenting ? "Sending..." : "Send reply"}
            </button>
          </div>
        </form>
      )}
      {ticket.status === "closed" && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
          This ticket is closed.
        </p>
      )}
    </div>
  );
}

export { ROLE_LABELS };
