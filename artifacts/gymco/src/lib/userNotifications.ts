const BASE = "/api";

export type UserNotification = {
  id: number;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  readAt: string | null;
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

export const userNotificationsApi = {
  list: () => request<UserNotification[]>("/notifications/mine"),
  markRead: (id: number) =>
    request<{ ok: true }>(`/notifications/mine/${id}/read`, {
      method: "POST",
    }),
  markAllRead: () =>
    request<{ ok: true }>("/notifications/mine/read-all", {
      method: "POST",
    }),
};
