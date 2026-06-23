import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerGxBooking } from "@/lib/partnerApi";
import { CalendarClock, Users, Phone, Mail } from "lucide-react";

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

export default function PartnerGxBookings() {
  const [bookings, setBookings] = useState<PartnerGxBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    partnerApi.gxBookings
      .list()
      .then((b) => setBookings(b))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const branches = useMemo<Branch[]>(() => {
    const branchMap = new Map<string, Branch>();
    for (const b of bookings) {
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
    for (const b of bookings) {
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
  }, [bookings]);

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
      ) : branches.length === 0 ? (
        <PartnerCard className="p-10 text-center">
          <CalendarClock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">
            No GX class bookings yet. When members book a group class on your gym
            page, they'll show up here.
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
                                <span className="tabular-nums">{b.phone}</span>
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
    </PartnerLayout>
  );
}
