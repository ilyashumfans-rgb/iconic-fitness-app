import {
  type TicketStatus,
  type TicketPriority,
  type TicketRole,
  STATUS_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
} from "@/lib/tickets";

const base =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-orange-50 text-orange-700 border-orange-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-300",
  resolved: "bg-orange-500 text-white border-orange-500",
  closed: "bg-orange-50 text-orange-400 border-orange-200",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "bg-orange-50 text-orange-500 border-orange-200",
  medium: "bg-orange-100 text-orange-700 border-orange-300",
  high: "bg-orange-200 text-orange-900 border-orange-400",
  urgent: "bg-orange-600 text-white border-orange-600",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`${base} ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`${base} ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function RoleBadge({ role }: { role: TicketRole }) {
  return (
    <span className={`${base} bg-orange-50 text-orange-600 border-orange-200`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
