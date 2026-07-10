import type { Ticket, TicketDetail, NewTicketInput } from "./tickets";

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
  // Present when the signed-in account is a partner-created team member.
  isStaff?: boolean;
  // Areas this session is allowed to access. For the owner this is the full
  // set; for a team member it is whatever the owner granted.
  permissions?: string[];
};

export type PartnerStaff = {
  id: number;
  name: string;
  email: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
};

export const PARTNER_STAFF_PERMISSIONS = [
  "gyms",
  "bookings",
  "classes",
  "products",
] as const;

export const PARTNER_STAFF_PERMISSION_LABELS: Record<string, string> = {
  gyms: "My Gyms",
  bookings: "Bookings",
  classes: "Classes",
  products: "Products",
};

export type PartnerStats = {
  totalGyms: number;
  totalClasses: number;
  totalBookings: number;
  revenueInr: number;
  activitySeries: { day: string; bookings: number }[];
};

export type PartnerGym = {
  id: number;
  name: string;
  slug: string;
  city: string;
  area: string;
  address: string;
  heroImage: string;
  videoUrl?: string | null;
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
  bio?: string;
  photoUrl?: string;
};

export type PartnerTrainerInput = {
  name: string;
  specialty: string;
  gymId: number;
  bio?: string;
  photoUrl?: string;
};

export type PartnerScheduleSlot = {
  id: number;
  gymId: number;
  dayOfWeek: number; // 1 = Mon … 7 = Sun
  startTime: string; // "07:00"
  endTime: string; // "08:00"
  className: string;
  sortOrder: number;
};

export type PartnerScheduleInput = {
  gymId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  className: string;
  sortOrder?: number;
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

export type PartnerGxBooking = {
  id: number;
  gymId: number | null;
  gymName: string;
  className: string;
  name: string;
  phone: string;
  email: string;
  preferredDate: string; // "YYYY-MM-DD"
  preferredTime: string; // "07:00"
  status: string;
  source: string;
  createdAt: string;
};

export type PackageBookingRow = {
  id: number;
  gymId: number;
  gymName: string;
  memberName: string;
  mobile: string;
  packageName: string;
  serviceName: string;
  amountInr: number;
  startDate: string; // "YYYY-MM-DD"
  status: "pending" | "paid" | "failed";
  createdAt: string;
};

export type TrainerBookingRow = {
  id: number;
  gymId: number;
  gymName: string;
  trainerName: string;
  memberName: string;
  mobile: string;
  packageName: string;
  serviceName: string;
  amountInr: number;
  preferredDate: string; // "YYYY-MM-DD"
  status: "pending" | "paid" | "failed";
  createdAt: string;
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
  staff: {
    list: () => request<PartnerStaff[]>("/partner/staff"),
    create: (body: {
      name: string;
      email: string;
      password: string;
      permissions: string[];
    }) =>
      request<PartnerStaff>("/partner/staff", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: Partial<{ name: string; permissions: string[]; isActive: boolean }>,
    ) =>
      request<PartnerStaff>(`/partner/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    resetPassword: (id: number, newPassword: string) =>
      request<{ ok: true }>(`/partner/staff/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/partner/staff/${id}`, { method: "DELETE" }),
  },
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
  trainers: {
    list: () => request<PartnerTrainer[]>("/partner/trainers"),
    create: (body: PartnerTrainerInput) =>
      request<PartnerTrainer>("/partner/trainers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<PartnerTrainerInput>) =>
      request<PartnerTrainer>(`/partner/trainers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/partner/trainers/${id}`, { method: "DELETE" }),
  },
  schedule: {
    list: (gymId?: number) =>
      request<PartnerScheduleSlot[]>(
        gymId ? `/partner/schedule?gymId=${gymId}` : "/partner/schedule",
      ),
    create: (body: PartnerScheduleInput) =>
      request<PartnerScheduleSlot>("/partner/schedule", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<PartnerScheduleInput>) =>
      request<PartnerScheduleSlot>(`/partner/schedule/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/partner/schedule/${id}`, { method: "DELETE" }),
    reset: (gymId: number) =>
      request<PartnerScheduleSlot[]>(`/partner/schedule/reset?gymId=${gymId}`, {
        method: "POST",
      }),
  },
  gxBookings: {
    list: () => request<PartnerGxBooking[]>("/partner/gx-bookings"),
  },
  trainerBookings: {
    list: () => request<TrainerBookingRow[]>("/partner/trainer-bookings"),
  },
  packageBookings: {
    list: () => request<PackageBookingRow[]>("/partner/package-bookings"),
  },
  yoactiv: {
    branches: () =>
      request<import("./adminApi").YoactivBranchOption[]>(
        "/partner/yoactiv/branches",
      ),
    members: (branchId: number) =>
      request<import("./adminApi").YoactivMemberRow[]>(
        `/partner/yoactiv/members?branchId=${branchId}`,
      ),
    memberDetail: (mobile: string) =>
      request<import("./adminApi").YoactivMemberDetail>(
        `/partner/yoactiv/members/detail?mobile=${encodeURIComponent(mobile)}`,
      ),
    trainers: (branchId: number) =>
      request<import("./adminApi").YoactivStaffTrainer[]>(
        `/partner/yoactiv/trainers?branchId=${branchId}`,
      ),
    setTrainerPhoto: (trainerId: string, imageUrl: string, branchId: number) =>
      request<{ ok: boolean }>(
        `/partner/yoactiv/trainers/${encodeURIComponent(trainerId)}/photo`,
        { method: "PUT", body: JSON.stringify({ imageUrl, branchId }) },
      ),
    removeTrainerPhoto: (trainerId: string, branchId: number) =>
      request<{ ok: boolean }>(
        `/partner/yoactiv/trainers/${encodeURIComponent(trainerId)}/photo?branchId=${branchId}`,
        { method: "DELETE" },
      ),
  },
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
  tickets: {
    mine: () => request<Ticket[]>("/partner/tickets/mine"),
    assigned: () => request<Ticket[]>("/partner/tickets/assigned"),
    get: (id: number) => request<TicketDetail>(`/partner/tickets/${id}`),
    create: (body: NewTicketInput) =>
      request<Ticket>("/partner/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    comment: (id: number, text: string) =>
      request<{ id: number }>(`/partner/tickets/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      }),
    setStatus: (id: number, status: string) =>
      request<{ ok: true }>(`/partner/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
};
