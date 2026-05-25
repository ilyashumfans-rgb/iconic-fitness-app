const BASE = "/api";

export type Partner = {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  status: string;
  notes?: string;
  createdAt?: string;
};

export type PartnerStats = {
  totalGyms: number;
  totalClasses: number;
  totalBookings: number;
  totalCheckins: number;
  revenueInr: number;
  activitySeries: { day: string; checkins: number; bookings: number }[];
  topGyms: { gymId: number; name: string; checkins: number }[];
  recentCheckins: {
    id: number;
    userId: number;
    gymId: number;
    checkedInAt: string;
    method: string;
  }[];
};

export type PartnerGym = {
  id: number;
  name: string;
  slug: string;
  city: string;
  area: string;
  address: string;
  heroImage: string;
  rating: number;
  reviewsCount: number;
  priceFrom: number;
  categories: string[];
  amenities: string[];
  about: string;
  hours: string;
  openNow: boolean;
  featured: boolean;
  ownerPartnerId: number | null;
  gallery: string[];
};

export type PartnerBooking = {
  id: number;
  status: string;
  createdAt: string;
  classTitle: string;
  startsAt: string;
  gymId: number;
  gymName: string;
  userName: string;
  userEmail: string;
};

export type PartnerCheckin = {
  id: number;
  checkedInAt: string;
  method: string;
  gymId: number;
  gymName: string;
  userName: string;
  userEmail: string;
};

export type PartnerClass = {
  id: number;
  title: string;
  category: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  intensity: string;
  gymId: number;
  gymName: string;
  trainerName: string | null;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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

export const partnerApi = {
  login: (email: string, password: string) =>
    request<Partner>("/partner/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>("/partner/logout", { method: "POST" }),
  me: () => request<Partner>("/partner/me"),
  updateMe: (body: Partial<Pick<Partner, "name" | "phone" | "city">>) =>
    request<Partner>("/partner/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>("/partner/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  stats: () => request<PartnerStats>("/partner/stats"),
  gyms: {
    list: () => request<PartnerGym[]>("/partner/gyms"),
    update: (id: number, body: Partial<PartnerGym>) =>
      request<PartnerGym>(`/partner/gyms/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  bookings: () => request<PartnerBooking[]>("/partner/bookings"),
  checkins: () => request<PartnerCheckin[]>("/partner/checkins"),
  classes: () => request<PartnerClass[]>("/partner/classes"),
};
