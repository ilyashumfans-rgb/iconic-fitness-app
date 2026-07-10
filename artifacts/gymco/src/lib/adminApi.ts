import type { Ticket, TicketDetail, NewTicketInput } from "./tickets";

const BASE = "/api";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export type HomeSlide = {
  id: number;
  kind: "image" | "gif" | "youtube";
  mediaUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  audience: "all" | "members" | "customers";
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type YoactivBranchOption = {
  branchId: number;
  branchName: string | null;
  gymLabel: string | null;
};

export type YoactivAdminPackage = {
  id: number;
  serviceName: string;
  name: string;
  amountInr: number;
  sessions: number | null;
  duration: string;
  pt: boolean;
  hidden: boolean;
  displayName: string;
  description: string;
  imageUrl: string;
};

export type YoactivStaffTrainer = {
  id: string;
  name: string;
  mobile: string;
  photoUrl: string | null;
};

export type YoactivMemberRow = {
  memberId: number;
  name: string;
  mobile: string;
  email: string;
  status: string;
  photoUrl: string | null;
};

export type YoactivMemberDetail = {
  memberId: number | null;
  name: string;
  memberships: {
    branchId: number;
    branchName: string;
    planName: string;
    serviceName: string;
    status: string;
    startDate: string | null;
    expiryDate: string | null;
    sessionsTotal: number | null;
    sessionsUsed: number | null;
    amountInr: number | null;
  }[];
};

export type AgencyAccount = {
  id: number;
  username: string;
  name: string;
  gymIds: number[];
  createdAt: string;
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

export const adminApi = {
  login: (email: string, password: string) =>
    request<AdminUser>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  googleLogin: () =>
    request<AdminUser>("/admin/google-login", { method: "POST" }),
  logout: () => request<{ ok: true }>("/admin/logout", { method: "POST" }),
  me: () => request<AdminUser>("/admin/me"),
  stats: () =>
    request<{
      totalPartners: number;
      totalGyms: number;
      activeMemberships: number;
      totalActivities: number;
      activeMembers: number;
      monthlyRevenue: number;
      activitySeries: { day: string; bookings: number }[];
      membershipTypes: { name: string; value: number }[];
    }>("/admin/stats"),
  partners: {
    list: () => request<any[]>("/admin/partners"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/partners", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/partners/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    resetPassword: (id: number, password: string) =>
      request<{ ok: true }>(`/admin/partners/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    impersonate: (id: number) =>
      request<{ ok: true; redirectTo: string }>(
        `/admin/partners/${id}/impersonate`,
        { method: "POST" },
      ),
    qrLogin: (id: number) =>
      request<{
        token: string;
        expiresAt: string;
        partnerName: string;
        partnerEmail: string;
      }>(`/admin/partners/${id}/qr-login`, { method: "POST" }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/partners/${id}`, { method: "DELETE" }),
    documents: (id: number) =>
      request<{
        partner: { id: number; name: string };
        documents: Array<{
          id: number;
          partnerId: number;
          name: string;
          url: string;
          notes: string;
          uploadedByKind: string;
          uploadedByEmail: string;
          uploadedAt: string;
        }>;
      }>(`/admin/partners/${id}/documents`),
  },
  products: {
    list: () => request<any[]>("/admin/products"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/products", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/products/${id}`, { method: "DELETE" }),
  },
  categories: {
    list: () =>
      request<
        {
          id: number;
          name: string;
          slug: string;
          sortOrder: number;
          isActive: boolean;
          createdAt: string;
        }[]
      >("/admin/categories"),
    create: (body: {
      name: string;
      slug?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) =>
      request<any>("/admin/categories", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/categories/${id}`, { method: "DELETE" }),
  },
  orders: {
    list: () => request<any[]>("/admin/orders"),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  gyms: {
    list: () => request<any[]>("/admin/gyms"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/gyms", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/gyms/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/gyms/${id}`, { method: "DELETE" }),
  },
  memberships: {
    list: () => request<any[]>("/admin/memberships"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/memberships", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/memberships/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/memberships/${id}`, { method: "DELETE" }),
  },
  users: {
    list: () => request<any[]>("/admin/users"),
  },
  staff: {
    list: () => request<any[]>("/admin/staff"),
    permissions: () =>
      request<{ permissions: string[] }>("/admin/staff/permissions"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/staff", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    resetPassword: (id: number, password: string) =>
      request<{ ok: true }>(`/admin/staff/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/staff/${id}`, { method: "DELETE" }),
  },
  amenities: {
    list: () => request<any[]>("/admin/amenities"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/amenities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/amenities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/amenities/${id}`, { method: "DELETE" }),
  },
  workouts: {
    list: () => request<any[]>("/admin/workouts"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/workouts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/workouts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/workouts/${id}`, { method: "DELETE" }),
  },
  leads: {
    list: (status?: string) =>
      request<any[]>(
        `/admin/leads${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      ),
    stats: () =>
      request<{ total: number; byStatus: { status: string; count: number }[] }>(
        "/admin/leads/stats",
      ),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/leads/${id}`, { method: "DELETE" }),
  },
  blogs: {
    list: () => request<any[]>("/admin/blogs"),
    create: (body: Record<string, unknown>) =>
      request<any>("/admin/blogs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<any>(`/admin/blogs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/blogs/${id}`, { method: "DELETE" }),
  },
  notifications: {
    send: (body: {
      recipientType: "user" | "partner" | "vendor" | "admin";
      recipientId: number | null;
      title: string;
      body: string;
      link?: string;
    }) =>
      request<{
        ok: true;
        batchId: string;
        recipientType: string;
        broadcast: boolean;
        delivered: number;
      }>("/admin/notifications", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listSent: () =>
      request<
        {
          batchId: string;
          recipientType: string;
          title: string;
          body: string;
          link: string;
          createdByAdminId: number | null;
          createdAt: string;
          delivered: number;
          read: number;
        }[]
      >("/admin/notifications"),
    recipients: (type: "user" | "partner" | "vendor" | "admin") =>
      request<{ id: number; name: string; email: string }[]>(
        `/admin/notifications/recipients?type=${type}`,
      ),
    myInbox: () =>
      request<
        {
          id: number;
          title: string;
          body: string;
          link: string;
          createdAt: string;
          readAt: string | null;
        }[]
      >("/admin/me/notifications"),
    markRead: (id: number) =>
      request<{ ok: true }>(`/admin/me/notifications/${id}/read`, {
        method: "POST",
      }),
    markAllRead: () =>
      request<{ ok: true }>("/admin/me/notifications/read-all", {
        method: "POST",
      }),
  },
  trainerBookings: {
    list: () =>
      request<import("./partnerApi").TrainerBookingRow[]>(
        "/admin/trainer-bookings",
      ),
  },
  packageBookings: {
    list: () =>
      request<import("./partnerApi").PackageBookingRow[]>(
        "/admin/package-bookings",
      ),
  },
  yoactiv: {
    branches: () =>
      request<YoactivBranchOption[]>("/admin/yoactiv/branches"),
    members: (branchId: number) =>
      request<YoactivMemberRow[]>(`/admin/yoactiv/members?branchId=${branchId}`),
    memberDetail: (mobile: string) =>
      request<YoactivMemberDetail>(
        `/admin/yoactiv/members/detail?mobile=${encodeURIComponent(mobile)}`,
      ),
    trainers: (branchId: number) =>
      request<YoactivStaffTrainer[]>(
        `/admin/yoactiv/trainers?branchId=${branchId}`,
      ),
    packages: (branchId: number) =>
      request<YoactivAdminPackage[]>(
        `/admin/yoactiv/packages?branchId=${branchId}`,
      ),
    setPackageVisibility: (packageId: number, branchId: number, hidden: boolean) =>
      request<{ ok: boolean }>(
        `/admin/yoactiv/packages/${packageId}/visibility`,
        { method: "PUT", body: JSON.stringify({ branchId, hidden }) },
      ),
    setPackageContent: (
      packageId: number,
      branchId: number,
      content: { displayName: string; description: string; imageUrl: string },
    ) =>
      request<{ ok: boolean }>(
        `/admin/yoactiv/packages/${packageId}/content`,
        { method: "PUT", body: JSON.stringify({ branchId, ...content }) },
      ),
    setTrainerPhoto: (trainerId: string, imageUrl: string, _branchId: number) =>
      request<{ ok: boolean }>(
        `/admin/yoactiv/trainers/${encodeURIComponent(trainerId)}/photo`,
        { method: "PUT", body: JSON.stringify({ imageUrl }) },
      ),
    removeTrainerPhoto: (trainerId: string, _branchId: number) =>
      request<{ ok: boolean }>(
        `/admin/yoactiv/trainers/${encodeURIComponent(trainerId)}/photo`,
        { method: "DELETE" },
      ),
  },
  agencies: {
    list: () =>
      request<AgencyAccount[]>("/admin/agencies"),
    create: (body: {
      username: string;
      password: string;
      name: string;
      gymIds: number[];
    }) =>
      request<AgencyAccount>("/admin/agencies", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: Partial<{ username: string; name: string; gymIds: number[] }>,
    ) =>
      request<AgencyAccount>(`/admin/agencies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    resetPassword: (id: number, password: string) =>
      request<{ ok: true }>(`/admin/agencies/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/agencies/${id}`, { method: "DELETE" }),
  },
  admins: {
    list: () =>
      request<
        {
          id: number;
          email: string;
          name: string;
          role: string;
          createdAt: string;
        }[]
      >("/admin/admins"),
    create: (body: {
      name: string;
      email: string;
      password: string;
      role: "admin" | "superadmin";
    }) =>
      request<{
        id: number;
        email: string;
        name: string;
        role: string;
        createdAt: string;
      }>("/admin/admins", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateRole: (id: number, role: "admin" | "superadmin") =>
      request<{ id: number; role: string }>(`/admin/admins/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    resetPassword: (id: number, password: string) =>
      request<{ ok: true }>(`/admin/admins/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/admins/${id}`, { method: "DELETE" }),
  },
  userMemberships: {
    list: () => request<any[]>("/admin/user-memberships"),
    updateStatus: (id: number, status: string) =>
      request<any>(`/admin/user-memberships/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
  tickets: {
    list: (params?: {
      status?: string;
      priority?: string;
      assignee?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.priority) q.set("priority", params.priority);
      if (params?.assignee) q.set("assignee", params.assignee);
      const qs = q.toString();
      return request<Ticket[]>(`/admin/tickets${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<TicketDetail>(`/admin/tickets/${id}`),
    create: (body: NewTicketInput) =>
      request<Ticket>("/admin/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    comment: (id: number, text: string) =>
      request<{ id: number }>(`/admin/tickets/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      }),
    setStatus: (id: number, status: string) =>
      request<{ ok: true }>(`/admin/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    setPriority: (id: number, priority: string) =>
      request<{ ok: true }>(`/admin/tickets/${id}/priority`, {
        method: "PATCH",
        body: JSON.stringify({ priority }),
      }),
    assign: (
      id: number,
      assignee: { assigneeRole: string | null; assigneeId: number | null },
    ) =>
      request<{ ok: true }>(`/admin/tickets/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify(assignee),
      }),
    assignees: () =>
      request<{
        staff: { id: number; name: string; email: string }[];
        partners: { id: number; name: string; email: string }[];
        admins: { id: number; name: string; email: string }[];
      }>("/admin/tickets/assignees"),
  },
  homeSlides: {
    list: () => request<HomeSlide[]>("/admin/home-slides"),
    create: (body: Partial<HomeSlide>) =>
      request<HomeSlide>("/admin/home-slides", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<HomeSlide>) =>
      request<HomeSlide>(`/admin/home-slides/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/admin/home-slides/${id}`, { method: "DELETE" }),
  },
  reseedFromSnapshot: () =>
    request<{ ok: true; inserted: Record<string, number> }>(
      "/admin/reseed-from-snapshot",
      { method: "POST" },
    ),
};
