import type { Ticket, TicketDetail, NewTicketInput } from "./tickets";

const BASE = "/api";

export type StaffUser = {
  id: number;
  email: string;
  name: string;
  permissions: string[];
};

export type StaffPartner = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  city: string;
  kind: string;
  notes?: string;
  createdAt: string;
};

export type StaffGym = {
  id: number;
  name: string;
  slug: string;
  city: string;
  area: string;
  address: string;
  heroImage: string;
  logoUrl: string | null;
  priceFrom: number;
  payoutPerVisitInr: number;
  payoutTaxPct: number;
  openNow: boolean;
  rating: number;
  lat: number | null;
  lng: number | null;
  isVerified: boolean;
  ownerPartnerId: number | null;
  partnerName: string | null;
};

export type PartnerDocument = {
  id: number;
  partnerId: number;
  name: string;
  url: string;
  notes: string;
  uploadedByKind: string;
  uploadedByEmail: string;
  uploadedAt: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const staffApi = {
  login: (email: string, password: string) =>
    request<StaffUser>("/staff/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>("/staff/logout", { method: "POST" }),
  me: () => request<StaffUser>("/staff/me"),

  amenities: () => request<any[]>("/staff/amenities"),

  gyms: {
    list: (partnerId?: number) =>
      request<StaffGym[]>(
        partnerId ? `/staff/gyms?partnerId=${partnerId}` : "/staff/gyms",
      ),
    create: (body: Record<string, unknown>) =>
      request<StaffGym>("/staff/gyms", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<StaffGym>) =>
      request<StaffGym>(`/staff/gyms/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },

  partners: {
    list: () => request<StaffPartner[]>("/staff/partners"),
    listForGymAssignment: () =>
      request<StaffPartner[]>("/staff/gym-partners"),
    create: (body: Record<string, unknown>) =>
      request<StaffPartner>("/staff/partners", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: { name?: string; phone?: string; city?: string; status?: string },
    ) =>
      request<StaffPartner>(`/staff/partners/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    impersonate: (id: number) =>
      request<{ ok: true; redirectTo: string }>(
        `/staff/partners/${id}/impersonate`,
        { method: "POST" },
      ),
    remove: (id: number) =>
      request<{ ok: true }>(`/staff/partners/${id}`, { method: "DELETE" }),
    resetPassword: (id: number, password: string) =>
      request<{ ok: true }>(`/staff/partners/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    listDocuments: (id: number) =>
      request<{ partner: { id: number; name: string }; documents: PartnerDocument[] }>(
        `/staff/partners/${id}/documents`,
      ),
    addDocument: (
      id: number,
      body: { name: string; url: string; notes?: string },
    ) =>
      request<PartnerDocument>(`/staff/partners/${id}/documents`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    removeDocument: (id: number, docId: number) =>
      request<{ ok: true }>(`/staff/partners/${id}/documents/${docId}`, {
        method: "DELETE",
      }),
  },
  leads: {
    list: (status?: string) =>
      request<any[]>(
        `/staff/leads${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      ),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/staff/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/staff/leads/${id}`, { method: "DELETE" }),
  },
  blogs: {
    list: () => request<any[]>("/staff/blogs"),
    create: (body: Record<string, unknown>) =>
      request<any>("/staff/blogs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/staff/blogs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/staff/blogs/${id}`, { method: "DELETE" }),
  },
  pt: {
    summary: (month?: string) =>
      request<any>(
        `/staff/pt/summary${month ? `?month=${encodeURIComponent(month)}` : ""}`,
      ),
    members: (filter?: "active" | "expired") =>
      request<{ rows: any[] }>(
        `/staff/pt/members${filter ? `?filter=${filter}` : ""}`,
      ),
    createMember: (body: Record<string, unknown>) =>
      request<any>("/staff/pt/members", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateMember: (id: number, body: Record<string, unknown>) =>
      request<any>(`/staff/pt/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    markAttendance: (id: number) =>
      request<{ ok: true; date: string }>(
        `/staff/pt/members/${id}/attendance`,
        { method: "POST" },
      ),
    renewMember: (id: number, body: Record<string, unknown>) =>
      request<any>(`/staff/pt/members/${id}/renew`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  tickets: {
    mine: () => request<Ticket[]>("/staff/tickets/mine"),
    assigned: () => request<Ticket[]>("/staff/tickets/assigned"),
    get: (id: number) => request<TicketDetail>(`/staff/tickets/${id}`),
    create: (body: NewTicketInput) =>
      request<Ticket>("/staff/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    comment: (id: number, text: string) =>
      request<{ id: number }>(`/staff/tickets/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      }),
    setStatus: (id: number, status: string) =>
      request<{ ok: true }>(`/staff/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
};

export const PERMISSION_LABELS: Record<string, string> = {
  "partner.onboard": "Partner Onboarding",
  "partner.view": "View Partners",
  "partner.document_upload": "Partner Documents",
  "partner.assign_login": "Reset Partner Password",
  "gym.manage": "Gym Management",
  "blog.manage": "Blog Management",
  "lead.manage": "Leads (CRM)",
  "pt.manage": "PT Training (mobile trainer workspace)",
};
