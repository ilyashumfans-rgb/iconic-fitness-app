import { staffFetch } from "@/lib/staffSession";

/** Staff leads CRM API — needs the `lead.manage` permission. */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: number;
  kind: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  className: string;
  gymName: string;
  planName: string;
  planPriceInr: number;
  preferredDate: string;
  preferredTime: string;
  message: string;
  source: string;
  status: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

async function toJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export async function fetchLeads(status?: LeadStatus | null): Promise<Lead[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return toJson<Lead[]>(await staffFetch(`/staff/leads${qs}`));
}

export async function updateLead(
  id: number,
  patch: Partial<Pick<Lead, "status" | "notes" | "assignedTo">>,
): Promise<Lead> {
  return toJson<Lead>(
    await staffFetch(`/staff/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}
