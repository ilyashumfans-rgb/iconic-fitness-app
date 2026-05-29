import type { Ticket, TicketDetail, NewTicketInput } from "./tickets";

const BASE = "/api";

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

export const ticketsApi = {
  mine: () => request<Ticket[]>("/tickets/mine"),
  get: (id: number) => request<TicketDetail>(`/tickets/${id}`),
  create: (body: NewTicketInput) =>
    request<Ticket>("/tickets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  comment: (id: number, text: string) =>
    request<{ id: number }>(`/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    }),
};
