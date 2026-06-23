const BASE = "/api";

export type AgencyUser = {
  username: string;
};

export type AgencyGxBooking = {
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

export const agencyApi = {
  login: (username: string, password: string) =>
    request<AgencyUser>("/agency/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: true }>("/agency/logout", { method: "POST" }),
  me: () => request<AgencyUser>("/agency/me"),
  gxBookings: {
    list: () => request<AgencyGxBooking[]>("/agency/gx-bookings"),
  },
};
