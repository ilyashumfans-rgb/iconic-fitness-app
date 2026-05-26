const BASE = "/api";

export type Partner = {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  status: string;
  avatarUrl?: string;
  kind?: "gym" | "vendor" | "both";
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
  logoUrl?: string;
  lat?: number;
  lng?: number;
};

export type PartnerTrainer = {
  id: number;
  name: string;
  specialty: string;
  gymId: number | null;
};

export type PartnerClassInput = {
  title: string;
  category: string;
  gymId: number;
  trainerId: number;
  startsAt: string; // ISO
  durationMin: number;
  capacity: number;
  intensity: "low" | "medium" | "high";
  coverImage?: string;
  description?: string;
  calorieEstimate?: number;
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
  baseInr: number;
  taxPct: number;
  taxInr: number;
  payoutInr: number;
};

export type PartnerEarnings = {
  today: { visits: number; payoutInr: number };
  week: { visits: number; payoutInr: number };
  month: { visits: number; payoutInr: number };
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
  trainerId: number;
  trainerName: string | null;
  coverImage: string;
  description: string;
  calorieEstimate: number;
  bookedCount: number;
  completedCount: number;
  totalBookings: number;
};

export type PartnerAttendee = {
  id: number;
  status: "confirmed" | "completed" | "cancelled" | string;
  createdAt: string;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAvatar: string;
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
  qrLogin: (token: string) =>
    request<Partner>("/partner/qr-login", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  logout: () => request<{ ok: true }>("/partner/logout", { method: "POST" }),
  me: () => request<Partner>("/partner/me"),
  updateMe: (
    body: Partial<Pick<Partner, "name" | "phone" | "city" | "avatarUrl">>,
  ) =>
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
  earnings: () => request<PartnerEarnings>("/partner/earnings"),
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
  scanCheckin: (token: string, gymId: number) =>
    request<{
      id: number;
      gymId: number;
      gymName: string;
      memberCode: string;
      userName: string;
      checkedInAt: string;
    }>("/partner/checkins/scan", {
      method: "POST",
      body: JSON.stringify({ token, gymId }),
    }),
  trainers: () => request<PartnerTrainer[]>("/partner/trainers"),
  classes: {
    list: () => request<PartnerClass[]>("/partner/classes"),
    create: (body: PartnerClassInput) =>
      request<any>("/partner/classes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<PartnerClassInput>) =>
      request<any>(`/partner/classes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/partner/classes/${id}`, { method: "DELETE" }),
    attendees: (id: number) =>
      request<PartnerAttendee[]>(`/partner/classes/${id}/attendees`),
  },
  updateBookingStatus: (
    id: number,
    status: "confirmed" | "completed" | "cancelled",
  ) =>
    request<any>(`/partner/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  products: {
    list: () => request<any[]>("/partner/products"),
    create: (body: Record<string, unknown>) =>
      request<any>("/partner/products", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/partner/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/partner/products/${id}`, { method: "DELETE" }),
  },
  orders: () => request<any[]>("/partner/orders"),
  documents: {
    list: () =>
      request<{
        id: number;
        name: string;
        url: string;
        notes: string;
        uploadedAt: string;
        uploadedByKind: string;
      }[]>("/partner/documents"),
    create: (body: { name: string; url: string; notes?: string }) =>
      request<{ id: number }>("/partner/documents", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/partner/documents/${id}`, { method: "DELETE" }),
  },
  amenityCatalog: () => request<any[]>("/partner/amenities/catalog"),
  getGymAmenities: (gymId: number) =>
    request<{
      catalogIds: number[];
      custom: { id: number; name: string; description: string; icon: string }[];
    }>(`/partner/gyms/${gymId}/amenities`),
  saveGymAmenities: (
    gymId: number,
    body: {
      catalogIds: number[];
      custom: { name: string; description?: string; icon?: string }[];
    },
  ) =>
    request<{ ok: true }>(`/partner/gyms/${gymId}/amenities`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  getGymHours: (gymId: number) =>
    request<
      {
        dayOfWeek: number;
        isClosed: boolean;
        openMinute: number;
        closeMinute: number;
      }[]
    >(`/partner/gyms/${gymId}/hours`),
  workoutCatalog: () =>
    request<
      {
        id: number;
        name: string;
        slug: string;
        description: string;
        icon: string;
        color: string;
        imageUrl: string;
      }[]
    >("/partner/workouts/catalog"),
  getGymWorkouts: (gymId: number) =>
    request<{ workoutIds: number[] }>(`/partner/gyms/${gymId}/workouts`),
  saveGymWorkouts: (gymId: number, workoutIds: number[]) =>
    request<{ ok: true }>(`/partner/gyms/${gymId}/workouts`, {
      method: "PUT",
      body: JSON.stringify({ workoutIds }),
    }),
  getGymWorkoutSessions: (gymId: number) =>
    request<
      {
        id: number;
        gymId: number;
        workoutId: number;
        dayOfWeek: number;
        startMinute: number;
        endMinute: number;
        instructor: string;
      }[]
    >(`/partner/gyms/${gymId}/workouts/sessions`),
  saveGymWorkoutSessions: (
    gymId: number,
    sessions: {
      workoutId: number;
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      instructor?: string;
    }[],
  ) =>
    request<{ ok: true }>(`/partner/gyms/${gymId}/workouts/sessions`, {
      method: "PUT",
      body: JSON.stringify({ sessions }),
    }),
  saveGymHours: (
    gymId: number,
    hours: {
      dayOfWeek: number;
      isClosed: boolean;
      openMinute: number;
      closeMinute: number;
    }[],
  ) =>
    request<{ ok: true }>(`/partner/gyms/${gymId}/hours`, {
      method: "PUT",
      body: JSON.stringify({ hours }),
    }),
  notifications: {
    list: () =>
      request<
        {
          id: number;
          title: string;
          body: string;
          link: string;
          createdAt: string;
          readAt: string | null;
        }[]
      >("/partner/notifications"),
    markRead: (id: number) =>
      request<{ ok: true }>(`/partner/notifications/${id}/read`, {
        method: "POST",
      }),
    markAllRead: () =>
      request<{ ok: true }>("/partner/notifications/read-all", {
        method: "POST",
      }),
  },
};
