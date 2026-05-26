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
  openNow: boolean;
  rating: number;
  lat: number | null;
  lng: number | null;
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
    update: (id: number, body: Partial<StaffGym>) =>
      request<StaffGym>(`/staff/gyms/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },

  partners: {
    list: () => request<StaffPartner[]>("/staff/partners"),
    create: (body: Record<string, unknown>) =>
      request<StaffPartner>("/staff/partners", {
        method: "POST",
        body: JSON.stringify(body),
      }),
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
};

export const PERMISSION_LABELS: Record<string, string> = {
  "partner.onboard": "Partner Onboarding",
  "partner.view": "View Partners",
  "partner.document_upload": "Partner Documents",
  "partner.assign_login": "Reset Partner Password",
  "gym.manage": "Gym Management",
};
