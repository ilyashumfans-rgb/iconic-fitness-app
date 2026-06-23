import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { agencyApi, type AgencyGxBooking, type AgencyUser } from "@/lib/agencyApi";
import {
  BarChart3,
  Building2,
  CalendarClock,
  Dumbbell,
  LogOut,
  Users,
  Loader2,
  Filter,
} from "lucide-react";

function fmtTime(t: string): string {
  const [hStr, m] = (t ?? "").split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return t || "—";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

function fmtDate(d: string): string {
  if (!d) return "No date";
  const parsed = new Date(`${d}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Tally = { label: string; count: number };

type Slot = {
  key: string;
  gymName: string;
  className: string;
  date: string;
  time: string;
  count: number;
};

const ALL = "__all__";

export default function AgencyDashboard() {
  const [, navigate] = useLocation();
  const [bookings, setBookings] = useState<AgencyGxBooking[]>([]);
  const [me, setMe] = useState<AgencyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [branchFilter, setBranchFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);

  useEffect(() => {
    let cancelled = false;
    agencyApi
      .me()
      .then((u) => {
        if (!cancelled) setMe(u);
        return agencyApi.gxBookings.list();
      })
      .then((b) => {
        if (!cancelled) setBookings(b);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("401") || /unauthor/i.test(msg)) {
          navigate("/agency/login");
          return;
        }
        setErr(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const logout = async () => {
    try {
      await agencyApi.logout();
    } catch {
      // ignore
    }
    navigate("/agency/login");
  };

  // Branch options: prefer the account's assigned branches; fall back to any
  // branch present in the data.
  const branchOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const b of me?.branches ?? []) set.add(b.name);
    for (const b of bookings) set.add(b.gymName || "Unassigned");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [me, bookings]);

  const categoryOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const b of bookings) set.add(b.className?.trim() || "Group Class");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  const filtered = useMemo<AgencyGxBooking[]>(() => {
    return bookings.filter((b) => {
      const branch = b.gymName || "Unassigned";
      const category = b.className?.trim() || "Group Class";
      if (branchFilter !== ALL && branch !== branchFilter) return false;
      if (categoryFilter !== ALL && category !== categoryFilter) return false;
      return true;
    });
  }, [bookings, branchFilter, categoryFilter]);

  const byBranch = useMemo<Tally[]>(() => {
    const map = new Map<string, number>();
    for (const b of filtered) {
      const key = b.gymName || "Unassigned";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const byCategory = useMemo<Tally[]>(() => {
    const map = new Map<string, number>();
    for (const b of filtered) {
      const key = b.className?.trim() || "Group Class";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const slots = useMemo<Slot[]>(() => {
    const map = new Map<string, Slot>();
    for (const b of filtered) {
      const branchKey = b.gymId != null ? `g${b.gymId}` : `n:${b.gymName}`;
      const key = `${branchKey}|${b.preferredDate}|${b.preferredTime}|${b.className}`;
      let slot = map.get(key);
      if (!slot) {
        slot = {
          key,
          gymName: b.gymName || "Unassigned",
          className: b.className || "Group Class",
          date: b.preferredDate,
          time: b.preferredTime,
          count: 0,
        };
        map.set(key, slot);
      }
      slot.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => {
      const d = (b.date || "").localeCompare(a.date || "");
      if (d !== 0) return d;
      const t = (a.time || "").localeCompare(b.time || "");
      if (t !== 0) return t;
      return a.gymName.localeCompare(b.gymName);
    });
  }, [filtered]);

  const total = filtered.length;
  const maxBranch = byBranch[0]?.count ?? 1;
  const maxCategory = byCategory[0]?.count ?? 1;
  const hasFilter = branchFilter !== ALL || categoryFilter !== ALL;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-lime-500 to-green-500 shadow-md shadow-lime-500/30">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 leading-tight">
                {me?.name || "Iconic Fitness"}
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-lime-600 font-bold">
                Agency Portal
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            GX Class Bookings
          </h1>
          <p className="text-slate-500 mt-1">
            How many people have booked group classes
            {me && me.branches.length > 0
              ? ` across ${me.branches.map((b) => b.name).join(", ")}`
              : " across your assigned branches"}
            . Filter by branch or class category below.
          </p>
        </div>

        {err && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {err}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-16 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading bookings…
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider shrink-0 sm:pb-2">
                  <Filter className="h-4 w-4 text-lime-600" /> Filters
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Branch
                  </label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value={ALL}>All branches</option>
                    {branchOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Class category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500"
                  >
                    <option value={ALL}>All categories</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {hasFilter && (
                  <button
                    onClick={() => {
                      setBranchFilter(ALL);
                      setCategoryFilter(ALL);
                    }}
                    className="shrink-0 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Users className="h-4 w-4 text-lime-600" /> People booked
                </div>
                <div className="text-3xl font-black text-slate-900 mt-2">
                  {total}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Building2 className="h-4 w-4 text-lime-600" /> Branches
                </div>
                <div className="text-3xl font-black text-slate-900 mt-2">
                  {byBranch.length}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Dumbbell className="h-4 w-4 text-lime-600" /> Class categories
                </div>
                <div className="text-3xl font-black text-slate-900 mt-2">
                  {byCategory.length}
                </div>
              </div>
            </div>

            {total === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <CalendarClock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <div className="text-slate-500">
                  {hasFilter
                    ? "No bookings match the selected filters."
                    : "No GX class bookings yet. When members book a group class, they'll show up here."}
                </div>
              </div>
            ) : (
              <>
                {/* Breakdowns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
                      <Building2 className="h-4 w-4 text-lime-600" /> Bookings by
                      branch
                    </h2>
                    <ul className="space-y-3">
                      {byBranch.map((row) => (
                        <li key={row.label}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold text-slate-700 truncate pr-3">
                              {row.label}
                            </span>
                            <span className="tabular-nums font-bold text-slate-900">
                              {row.count} booked
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-lime-500 to-green-500"
                              style={{
                                width: `${Math.max(6, (row.count / maxBranch) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
                      <Dumbbell className="h-4 w-4 text-lime-600" /> Bookings by
                      class category
                    </h2>
                    <ul className="space-y-3">
                      {byCategory.map((row) => (
                        <li key={row.label}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold text-slate-700 truncate pr-3">
                              {row.label}
                            </span>
                            <span className="tabular-nums font-bold text-slate-900">
                              {row.count} booked
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-lime-500 to-green-500"
                              style={{
                                width: `${Math.max(6, (row.count / maxCategory) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Per-slot detail (counts only — no personal contact info) */}
                <h2 className="text-sm font-bold text-slate-900 mb-3">
                  Every slot ({slots.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {slots.map((slot) => (
                    <div
                      key={slot.key}
                      className="bg-white rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {slot.className}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-lime-500 to-lime-600 text-white shrink-0">
                          <Users className="h-3.5 w-3.5" />
                          {slot.count} booked
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2 space-y-1">
                        <div className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {slot.gymName}
                        </div>
                        <div>{fmtDate(slot.date)}</div>
                        <div>{fmtTime(slot.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
