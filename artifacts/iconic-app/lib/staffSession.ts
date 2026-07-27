import AsyncStorage from "@react-native-async-storage/async-storage";

import { websiteUrl } from "@/lib/links";

/**
 * Studio (staff) login session — separate from the Clerk member auth.
 *
 * The API's staff auth is cookie/session based (`POST /api/staff/login`).
 * Native fetch keeps the session cookie in the OS cookie jar automatically;
 * on web we send `credentials: "include"` so the browser does the same.
 * We additionally persist the staff profile in AsyncStorage so the studio
 * area can render instantly and survive app restarts (the cookie is the
 * actual source of truth — a dead session shows up as a 401 and bounces
 * back to the studio login screen).
 */

export type StaffProfile = {
  id: number;
  name: string;
  email: string;
  permissions: string[];
};

const STORE_KEY = "staffSession:v1";

export async function staffFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${websiteUrl}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function saveStaffProfile(profile: StaffProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(profile));
  } catch {
    // Non-fatal — the session cookie still works for this run.
  }
}

export async function loadStaffProfile(): Promise<StaffProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StaffProfile>;
    if (
      typeof parsed?.id !== "number" ||
      typeof parsed?.name !== "string" ||
      typeof parsed?.email !== "string"
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      permissions: Array.isArray(parsed.permissions)
        ? parsed.permissions.filter((p): p is string => typeof p === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export async function clearStaffProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
}
