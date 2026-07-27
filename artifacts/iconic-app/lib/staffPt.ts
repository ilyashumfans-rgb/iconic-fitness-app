import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

import {
  ensureAndroidChannel,
  ensureNotificationPermission,
  presentLocalNotification,
} from "@/lib/notifications";
import { staffFetch } from "@/lib/staffSession";

/**
 * Trainer workspace API (studio side). All calls ride the staff session
 * cookie via staffFetch.
 */

export type PtRequest = {
  refType: "booking" | "enquiry";
  refId: number;
  memberName: string;
  mobile: string;
  gymName: string;
  trainerName: string;
  packageName: string;
  preferredDate: string;
  createdAt: string | null;
  paid: boolean;
};

export type PtProgram = {
  id: number;
  refType: "booking" | "enquiry";
  refId: number;
  staffId: number;
  staffName: string;
  memberName: string;
  memberPhone: string;
  userId: number | null;
  gymId: number | null;
  gymName: string;
  status: "accepted" | "ongoing" | "completed";
  session1DoneAt: string | null;
  session2DoneAt: string | null;
  acceptedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type BmiRecord = {
  id: number;
  programId: number | null;
  staffName: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  note: string;
  createdAt: string;
};

export type DietPlan = {
  id: number;
  programId: number | null;
  staffName: string;
  title: string;
  content: string;
  createdAt: string;
};

async function asJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok) {
    throw new Error(
      (body as { error?: string } | null)?.error ?? "Request failed",
    );
  }
  return body as T;
}

export const staffPtApi = {
  requests: async () =>
    asJson<{
      pending: (PtRequest & { acceptedBy: string | null })[];
      mine: (PtRequest & { program: PtProgram })[];
    }>(await staffFetch("/staff/pt/requests")),
  accept: async (refType: string, refId: number) =>
    asJson<PtProgram>(
      await staffFetch("/staff/pt/requests/accept", {
        method: "POST",
        body: JSON.stringify({ refType, refId }),
      }),
    ),
  start: async (programId: number) =>
    asJson<PtProgram>(
      await staffFetch(`/staff/pt/programs/${programId}/start`, {
        method: "POST",
      }),
    ),
  sessionDone: async (programId: number, n: 1 | 2) =>
    asJson<PtProgram>(
      await staffFetch(`/staff/pt/programs/${programId}/sessions/${n}/done`, {
        method: "POST",
      }),
    ),
  complete: async (programId: number) =>
    asJson<PtProgram>(
      await staffFetch(`/staff/pt/programs/${programId}/complete`, {
        method: "POST",
      }),
    ),
  dashboard: async (month?: string) =>
    asJson<{
      counts: { accepted: number; ongoing: number; completed: number };
      programs: PtProgram[];
    }>(
      await staffFetch(
        `/staff/pt/dashboard${month ? `?month=${month}` : ""}`,
      ),
    ),
  program: async (id: number) =>
    asJson<{ program: PtProgram; bmi: BmiRecord[]; diets: DietPlan[] }>(
      await staffFetch(`/staff/pt/programs/${id}`),
    ),
  addBmi: async (body: {
    programId: number;
    heightCm: number;
    weightKg: number;
    note: string;
  }) =>
    asJson<BmiRecord>(
      await staffFetch("/staff/pt/bmi", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ),
  addDiet: async (body: { programId: number; title: string; content: string }) =>
    asJson<DietPlan>(
      await staffFetch("/staff/pt/diet", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ),
};

// ── PT dashboard (memberships / revenue / targets / incentives) ─────────────

export type PtMembership = {
  id: number;
  source: string;
  memberName: string;
  membershipId: string;
  mobile: string;
  gymId: number | null;
  gymName: string;
  packageName: string;
  durationDays: number;
  originalSessions: number;
  amountPaidInr: number;
  paymentStatus: "paid" | "pending";
  startDate: string;
  endDate: string;
  renewalStatus: "pending" | "renewed" | "lost";
  followUpDate: string;
  notes: string;
  status: "active" | "expired";
  daysCompleted: number;
  remainingDays: number;
  daysLeft: number;
  sessionsAvailable: number;
  sessionsDelivered: number;
  lastSessionDate: string;
  todayAttendance: boolean;
};

export type PtSummary = {
  month: string;
  summary: {
    activeMembers: number;
    expiredMembers: number;
    revenueTodayInr: number;
    revenueMonthInr: number;
    revenueYearInr: number;
    pendingPaymentsInr: number;
    lostRevenueInr: number;
    todaysSessions: number;
    pendingRenewals: number;
    sevenDayExpiry: {
      id: number;
      memberName: string;
      mobile: string;
      endDate: string;
      daysLeft: number;
      amountPaidInr: number;
    }[];
  };
  target: {
    salesInr: number;
    targetInr: number;
    achievementPct: number;
    remainingTargetInr: number;
    incentivePct: number;
    grossIncentiveInr: number;
    adjustmentsInr: number;
    netIncentiveInr: number;
    approvalStatus: string;
  };
  alerts: { kind: string; message: string }[];
};

export type NewMembership = {
  memberName: string;
  membershipId?: string;
  mobile?: string;
  gymId?: number;
  packageName?: string;
  durationDays: number;
  originalSessions: number;
  amountPaidInr: number;
  paymentStatus?: "paid" | "pending";
  startDate?: string;
  notes?: string;
  source?: string;
};

export const ptDashboardApi = {
  summary: async (month?: string) =>
    asJson<PtSummary>(
      await staffFetch(`/staff/pt/summary${month ? `?month=${month}` : ""}`),
    ),
  members: async (filter?: "active" | "expired") =>
    asJson<{ rows: PtMembership[] }>(
      await staffFetch(`/staff/pt/members${filter ? `?filter=${filter}` : ""}`),
    ),
  createMember: async (body: NewMembership) =>
    asJson<PtMembership>(
      await staffFetch("/staff/pt/members", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ),
  patchMember: async (id: number, body: Record<string, unknown>) =>
    asJson<PtMembership>(
      await staffFetch(`/staff/pt/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    ),
  markAttendance: async (id: number) =>
    asJson<{ ok: boolean }>(
      await staffFetch(`/staff/pt/members/${id}/attendance`, { method: "POST" }),
    ),
  renew: async (id: number, body: Omit<NewMembership, "memberName">) =>
    asJson<PtMembership>(
      await staffFetch(`/staff/pt/members/${id}/renew`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ),
  yoactivMembers: async (gymId: number) =>
    asJson<{
      mapped: boolean;
      members: { memberId: number; name: string; mobile: string; status: string }[];
    }>(await staffFetch(`/staff/pt/yoactiv-members?gymId=${gymId}`)),
};

// ── Staff notification polling with sound ───────────────────────────────────

const LAST_SEEN_KEY = "staffNotifyLastSeen:v1";
const POLL_MS = 45_000;

type StaffNotification = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
};

// Module-level singleton state: several studio screens mount the polling
// hook, but only ONE interval may run (stacked screens would otherwise
// poll and ring in duplicate). The notified-id set double-guards against
// re-presenting the same notification within a session.
let activeSubscribers = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const notifiedIds = new Set<number>();

async function pollOnce(): Promise<void> {
  try {
    const res = await staffFetch("/staff/notifications");
    if (!res.ok) return;
    const rows = (await res.json()) as StaffNotification[];
    if (!Array.isArray(rows) || rows.length === 0) return;
    const maxId = Math.max(...rows.map((r) => r.id));
    const rawSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);
    const seen = rawSeen ? Number(rawSeen) : null;
    await AsyncStorage.setItem(LAST_SEEN_KEY, String(maxId));
    // First run just records the watermark — no notification storm.
    if (seen == null || !Number.isFinite(seen)) return;
    const fresh = rows.filter((r) => r.id > seen && !notifiedIds.has(r.id));
    if (fresh.length === 0) return;
    for (const n of fresh) notifiedIds.add(n.id);
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    await ensureAndroidChannel();
    // Cap the burst so a backlog can't spam the tray.
    for (const n of fresh.slice(0, 3)) {
      await presentLocalNotification(n.title, n.body);
    }
  } catch {
    // Polling is best-effort; next tick retries.
  }
}

/**
 * While a studio screen is mounted, poll the staff notification feed and
 * fire a LOCAL notification (with the default tune) for anything new since
 * the last seen id — Expo Go has no real push, so this is the delivery path
 * (same pattern as the member-side poller).
 */
export function useStaffNotificationPolling(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    activeSubscribers += 1;
    if (activeSubscribers === 1) {
      void pollOnce();
      pollTimer = setInterval(() => void pollOnce(), POLL_MS);
    }
    return () => {
      activeSubscribers -= 1;
      if (activeSubscribers === 0 && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  }, [enabled]);
}
