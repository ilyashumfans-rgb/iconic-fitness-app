const BASE = "/api";

export type City = {
  id: number;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
};

export type Area = {
  id: number;
  cityId: number;
  name: string;
  isActive: boolean;
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

export const locationsApi = {
  listCities: () => request<City[]>("/locations/cities"),
  getDefaultCity: () => request<City | null>("/locations/cities/default"),
  listAreas: () => request<Area[]>("/locations/areas"),
  listAreasByCity: (cityId: number) =>
    request<Area[]>(`/locations/cities/${cityId}/areas`),
  createCity: (name: string) =>
    request<City>("/locations/cities", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateCity: (
    id: number,
    body: Partial<Pick<City, "name" | "isActive" | "isDefault">>,
  ) =>
    request<City>(`/locations/cities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  removeCity: (id: number) =>
    request<{ ok: true }>(`/locations/cities/${id}`, { method: "DELETE" }),
  createArea: (cityId: number, name: string) =>
    request<Area>("/locations/areas", {
      method: "POST",
      body: JSON.stringify({ cityId, name }),
    }),
  updateArea: (
    id: number,
    body: Partial<Pick<Area, "name" | "isActive" | "cityId">>,
  ) =>
    request<Area>(`/locations/areas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  removeArea: (id: number) =>
    request<{ ok: true }>(`/locations/areas/${id}`, { method: "DELETE" }),
};
