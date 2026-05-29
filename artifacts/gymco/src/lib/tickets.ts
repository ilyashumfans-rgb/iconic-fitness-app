export type TicketRole = "user" | "partner" | "staff" | "admin";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type Ticket = {
  id: number;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterRole: TicketRole;
  requesterId: number;
  requesterName: string;
  assigneeRole: TicketRole | null;
  assigneeId: number | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
};

export type TicketComment = {
  id: number;
  authorRole: TicketRole;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
};

export type TicketDetail = {
  ticket: Ticket;
  comments: TicketComment[];
};

export type NewTicketInput = {
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
};

export const TICKET_CATEGORIES = [
  "general",
  "billing",
  "technical",
  "account",
  "gym",
  "booking",
  "other",
] as const;

export const TICKET_PRIORITIES: TicketPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const ROLE_LABELS: Record<TicketRole, string> = {
  user: "Member",
  partner: "Partner",
  staff: "Staff",
  admin: "Admin",
};

export function formatCategory(c: string): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function formatTicketDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
