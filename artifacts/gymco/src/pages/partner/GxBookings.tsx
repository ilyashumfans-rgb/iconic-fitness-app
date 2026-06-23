import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerGxBooking } from "@/lib/partnerApi";
import { CalendarClock, Users, Phone, Mail, Filter } from "lucide-react";

function fmtTime(t: string): string {
  const [hStr, m] = (t ?? "").split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return t || "—";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

function batchOf(t: string): "morning" | "evening" {
  const h = Number((t ?? "").split(":")[0]);
  return !Number.isNaN(h) && h < 12 ? "morning" : "evening";
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

type Slot = {
  key: string;
  date: string;
  time: string;
  className: string;
  bookings: PartnerGxBooking[];
};

type Branch = {
  gymId: number | null;
  gymName: string;
  total: number;
  slots: Slot[];
};

const ALL = "__all__";

export default function PartnerGxBookings() {
  const [bookings, setBookings] = useState<PartnerGxBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [branchFilter, setBranchFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [dateFilter, setDateFilter] = useState<string>(ALL);
  const [batchFilter, setBatchFilter] = useState<string>(ALL);

  useEffect(() => {
    partnerApi.gxBookings
      .list()
      .then((b) => setBookings(b))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const branchOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const b of bookings) set.add(b.gymName || "Unassigned");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  const categoryOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const b of bookings) set.add(b.className?.trim() || "Group Class");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  const dateOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const b of bookings) if (b.preferredDate) set.add(b.preferredDate);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [bookings]);

  const filtered = useMemo<PartnerGxBooking[]>(() => {
    return bookings.filter((b) => {
      const branch = b.gymName || "Unassigned";
      const category = b.className?.trim() || "Group Class";
      if (branchFilter !== ALL && branch !== branchFilter) return false;
      if (categoryFilter !== ALL && category !== categoryFilter) return false;
      if (dateFilter !== ALL && b.preferredDate !== dateFilter) return false;
      if (batchFilter !== ALL && batchOf(b.preferredTime) !== batchFilter)
        return false;
      return true;
    });
  }, [bookings, branchFilter, categoryFilter, dateFilter, batchFilter]);

  const branches = useMemo<Branch[]>(() => {
    const branchMap = new Map<string, Branch>();
    for (const b of filtered) {
      const branchKey = b.gymId != null ? `g${b.gymId}` : `n:${b.gymName}`;
      let branch = branchMap.get(branchKey);
      if (!branch) {
        branch = {
          gymId: b.gymId,
          gymName: b.gymName || "Unassigned",
          total: 0,
          slots: [],
        };
        branchMap.set(branchKey, branch);
      }
      branch.total += 1;
    }

    const slotMap = new Map<string, Slot>();
    for (const b of filtered) {
      const branchKey = b.gymId != null ? `g${b.gymId}` : `n:${b.gymName}`;
      const slotKey = `${branchKey}|${b.preferredDate}|${b.preferredTime}|${b.className}`;
      let slot = slotMap.get(slotKey);
      if (!slot) {
        slot = {
          key: slotKey,
          date: b.preferredDate,
          time: b.preferredTime,
          className: b.className,
          bookings: [],
        };
        slotMap.set(slotKey, slot);
        branchMap.get(branchKey)!.slots.push(slot);
      }
      slot.bookings.push(b);
    }

    const list = Array.from(branchMap.values());
    for (const branch of list) {
      branch.slots.sort((a, b) => {
        const d = (b.date || "").localeCompare(a.date || "");
        if (d !== 0) return d;
        return (a.time || "").localeCompare(b.time || "");
      });
    }
    list.sort((a, b) => a.gymName.localeCompare(b.gymName));
    return list;
  }, [filtered]);

  const hasFilter =
    branchFilter !== ALL ||
    categoryFilter !== ALL ||
    dateFilter !== ALL ||
    batchFilter !== ALL;

  return (
    <PartnerLayout title="GX Class Bookings">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}

      <p className="mb-5 text-sm text-slate-500">
        Everyone who has booked a group-class (GX) slot at your branches, grouped
        by day and time. Use this to see how many people to expect for each
        session.
      </p>

      {loading ? (
        <PartnerCard className="p-10 text-center text-slate-400">
          Loading bookings…
        </PartnerCard>
      ) : (
        <>
          {/* Filters */}
          <PartnerCard className="p-4 mb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <Filter className="h-4 w-4 text-lime-600" /> Filters
              </div>
              {hasFilter && (
                <button
                  onClick={() => {
                    setBranchFilter(ALL);
                    setCategoryFilter(ALL);
                    setDateFilter(ALL);
                    setBatchFilter(ALL);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="min-w-0">
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
              <div className="min-w-0">
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
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Date
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  <option value={ALL}>All dates</option>
                  {dateOptions.map((d) => (
                    <option key={d} value={d}>
                      {fmtDate(d)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Batch
                </label>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  <option value={ALL}>All batches</option>
                  <option value="morning">Morning (AM)</option>
                  <option value="evening">Evening (PM)</option>
                </select>
              </div>
            </div>
          </PartnerCard>

          {branches.length === 0 ? (
            <PartnerCard className="p-10 text-center">
              <CalendarClock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <div className="text-slate-500">
                {hasFilter
                  ? "No bookings match the selected filters."
                  : "No GX class bookings yet. When members book a group class on your gym page, they'll show up here."}
              </div>
            </PartnerCard>
          ) : (
            <div className="space-y-6">
              {branches.map((branch) => (
                <div key={branch.gymId ?? branch.gymName}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-slate-900">
                      {branch.gymName}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-lime-50 text-lime-700">
                      <Users className="h-3.5 w-3.5" />
                      {branch.total} booking{branch.total === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {branch.slots.map((slot) => (
                      <PartnerCard key={slot.key} className="overflow-hidden">
                        <div className="px-5 py-3 border-b border-lime-100 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {slot.className || "Group Class"}
                            </h3>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {fmtDate(slot.date)} · {fmtTime(slot.time)}
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-lime-500 to-lime-600 text-white shrink-0">
                            <Users className="h-3.5 w-3.5" />
                            {slot.bookings.length} booked
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {slot.bookings.map((b) => (
                            <li
                              key={b.id}
                              className="px-5 py-3 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-slate-900 font-semibold truncate">
                                  {b.name || "Guest"}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0 text-sm text-slate-500">
                                {b.phone && (
                                  <a
                                    href={`tel:${b.phone}`}
                                    className="inline-flex items-center gap-1.5 hover:text-lime-600"
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                    <span className="tabular-nums">
                                      {b.phone}
                                    </span>
                                  </a>
                                )}
                                {b.email && (
                                  <a
                                    href={`mailto:${b.email}`}
                                    className="inline-flex items-center gap-1.5 hover:text-lime-600 max-w-[12rem] truncate"
                                  >
                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{b.email}</span>
                                  </a>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </PartnerCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PartnerLayout>
  );
}
