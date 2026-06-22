import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import {
  partnerApi,
  type PartnerGym,
  type PartnerScheduleSlot,
  type PartnerScheduleInput,
} from "@/lib/partnerApi";
import { Plus, Pencil, Trash2, X, CalendarClock, RotateCcw } from "lucide-react";

const INPUT =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60";

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const dayLabel = (d: number) =>
  DAYS.find((x) => x.value === d)?.label ?? `Day ${d}`;

function fmtTime(t: string): string {
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

type EditState = {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  className: string;
};

const blank = (): EditState => ({
  dayOfWeek: 1,
  startTime: "07:00",
  endTime: "08:00",
  className: "",
});

export default function PartnerSchedule() {
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [gymId, setGymId] = useState<number | null>(null);
  const [slots, setSlots] = useState<PartnerScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    partnerApi.gyms
      .list()
      .then((g) => {
        setGyms(g);
        if (g[0]) setGymId(g[0].id);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const loadSlots = (id: number) => {
    setLoading(true);
    partnerApi.schedule
      .list(id)
      .then((s) => setSlots(s))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (gymId != null) loadSlots(gymId);
  }, [gymId]);

  const byDay = useMemo(() => {
    const map = new Map<number, PartnerScheduleSlot[]>();
    for (const s of slots) {
      const arr = map.get(s.dayOfWeek) ?? [];
      arr.push(s);
      map.set(s.dayOfWeek, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.startTime.localeCompare(b.startTime),
      );
    }
    return map;
  }, [slots]);

  const openNew = (day?: number) => {
    const s = blank();
    if (day) s.dayOfWeek = day;
    setEditing(s);
  };

  const openEdit = (s: PartnerScheduleSlot) => {
    setEditing({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      className: s.className,
    });
  };

  const save = async () => {
    if (!editing || gymId == null) return;
    if (!editing.className.trim()) {
      setErr("Class name is required.");
      return;
    }
    if (!editing.startTime || !editing.endTime) {
      setErr("Start and end time are required.");
      return;
    }
    const body: PartnerScheduleInput = {
      gymId,
      dayOfWeek: editing.dayOfWeek,
      startTime: editing.startTime,
      endTime: editing.endTime,
      className: editing.className.trim(),
    };
    setSaving(true);
    try {
      if (editing.id) await partnerApi.schedule.update(editing.id, body);
      else await partnerApi.schedule.create(body);
      setEditing(null);
      setErr(null);
      loadSlots(gymId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (gymId == null) return;
    if (!confirm("Remove this class slot?")) return;
    try {
      await partnerApi.schedule.remove(id);
      loadSlots(gymId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const resetToDefault = async () => {
    if (gymId == null) return;
    if (
      !confirm(
        "Reset this branch's timetable to the standard iconic schedule? Your custom changes for this gym will be replaced.",
      )
    )
      return;
    try {
      const s = await partnerApi.schedule.reset(gymId);
      setSlots(s);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reset failed");
    }
  };

  return (
    <PartnerLayout
      title="Group Class Timetable"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
            disabled={gymId == null}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" /> Reset to default
          </button>
          <button
            onClick={() => openNew()}
            disabled={gymId == null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-semibold shadow-md shadow-lime-500/20 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Add slot
          </button>
        </div>
      }
    >
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}

      {gyms.length === 0 ? (
        <PartnerCard className="p-10 text-center">
          <CalendarClock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">
            You need at least one gym assigned before you can manage a timetable.
          </div>
        </PartnerCard>
      ) : (
        <>
          {gyms.length > 1 && (
            <div className="mb-5 max-w-xs">
              <label className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5 block">
                Branch
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                value={gymId ?? ""}
                onChange={(e) => setGymId(Number(e.target.value))}
              >
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="mb-5 text-sm text-slate-500">
            This weekly group-class timetable is shown to members on your gym
            page. Edit the timings, class names, or days to match what your
            branch actually runs.
          </p>

          {loading ? (
            <PartnerCard className="p-10 text-center text-slate-400">
              Loading timetable…
            </PartnerCard>
          ) : (
            <div className="space-y-4">
              {DAYS.map((day) => {
                const daySlots = byDay.get(day.value) ?? [];
                if (daySlots.length === 0) return null;
                return (
                  <PartnerCard key={day.value} className="overflow-hidden">
                    <div className="px-5 py-3 border-b border-lime-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold tracking-wide uppercase text-lime-600">
                        {day.label}
                      </h3>
                      <button
                        onClick={() => openNew(day.value)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-lime-50 text-lime-700 hover:bg-lime-100 font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {daySlots.map((s) => (
                        <li
                          key={s.id}
                          className="px-5 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-slate-900 font-semibold truncate">
                              {s.className}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm text-slate-500 tabular-nums">
                              {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                            </span>
                            <button
                              onClick={() => openEdit(s)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-lime-600 hover:bg-lime-50"
                              aria-label="Edit slot"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => remove(s.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50"
                              aria-label="Delete slot"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </PartnerCard>
                );
              })}
              {slots.length === 0 && (
                <PartnerCard className="p-10 text-center">
                  <CalendarClock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <div className="text-slate-500">
                    No class slots yet. Add one, or reset to the standard
                    timetable.
                  </div>
                </PartnerCard>
              )}
            </div>
          )}
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editing.id ? "Edit class slot" : "Add class slot"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Class name</Label>
                <input
                  className={INPUT}
                  value={editing.className}
                  onChange={(e) =>
                    setEditing({ ...editing, className: e.target.value })
                  }
                  placeholder="e.g. iconic Zumba"
                />
              </div>
              <div>
                <Label>Day</Label>
                <select
                  className={INPUT}
                  value={editing.dayOfWeek}
                  onChange={(e) =>
                    setEditing({ ...editing, dayOfWeek: Number(e.target.value) })
                  }
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start time</Label>
                  <input
                    type="time"
                    className={INPUT}
                    value={editing.startTime}
                    onChange={(e) =>
                      setEditing({ ...editing, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>End time</Label>
                  <input
                    type="time"
                    className={INPUT}
                    value={editing.endTime}
                    onChange={(e) =>
                      setEditing({ ...editing, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {editing.id ? "Save changes" : "Add slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
      {children}
    </label>
  );
}
