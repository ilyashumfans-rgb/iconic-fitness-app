const BASE = "/api";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: string;
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
      activitySeries: { day: string; checkins: number; bookings: number }[];
      membershipTypes: { name: string; value: number }[];
      recentCheckins: {
        id: number;
        userId: number;
        gymId: number;
        checkedInAt: string;
        method: string;
      }[];
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
};
