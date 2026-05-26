import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import FileUpload from "@/components/FileUpload";
import {
  partnerApi,
  type PartnerAttendee,
  type PartnerClass,
  type PartnerClassInput,
  type PartnerGym,
  type PartnerTrainer,
} from "@/lib/partnerApi";
import {
  Dumbbell,
  Clock,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Calendar,
  CheckCircle2,
  Ban,
  Mail,
  Phone,
} from "lucide-react";

const INPUT =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60";

const CATEGORIES = [
  "Strength",
  "HIIT",
  "Yoga",
  "Pilates",
  "Cardio",
  "CrossFit",
  "Boxing",
  "Dance",
  "Zumba",
  "Spin",
  "Mobility",
];

type EditState = {
  id?: number;
  title: string;
  category: string;
  gymId: number | "";
  trainerId: number | "";
  startsAt: string; // datetime-local value
  durationMin: number;
  capacity: number;
  intensity: "low" | "medium" | "high";
  coverImage: string;
  description: string;
  calorieEstimate: number;
};

const blank = (): EditState => ({
  title: "",
  category: "Strength",
  gymId: "",
  trainerId: "",
  startsAt: toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
  durationMin: 60,
  capacity: 20,
  intensity: "medium",
  coverImage: "",
  description: "",
  calorieEstimate: 300,
});

function toLocalInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PartnerClasses() {
  const [rows, setRows] = useState<PartnerClass[]>([]);
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [trainers, setTrainers] = useState<PartnerTrainer[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [attendeesFor, setAttendeesFor] = useState<PartnerClass | null>(null);
  const [attendees, setAttendees] = useState<PartnerAttendee[]>([]);
  const [attendeesBusy, setAttendeesBusy] = useState(false);

  const openAttendees = async (c: PartnerClass) => {
    setAttendeesFor(c);
    setAttendees([]);
    setAttendeesBusy(true);
    try {
      const rows = await partnerApi.classes.attendees(c.id);
      setAttendees(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load attendees");
    } finally {
      setAttendeesBusy(false);
    }
  };

  const setBookingStatus = async (
    bookingId: number,
    status: "confirmed" | "completed" | "cancelled",
  ) => {
    try {
      await partnerApi.updateBookingStatus(bookingId, status);
      setAttendees((prev) =>
        prev.map((a) => (a.id === bookingId ? { ...a, status } : a)),
      );
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  };

  const load = () => {
    Promise.all([
      partnerApi.classes.list(),
      partnerApi.gyms.list(),
      partnerApi.trainers(),
    ])
      .then(([c, g, t]) => {
        setRows(c);
        setGyms(g);
        setTrainers(t);
      })
      .catch((e) => setErr(String(e)));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => {
      const t = new Date(r.startsAt).getTime();
      if (filter === "upcoming") return t >= now;
      if (filter === "past") return t < now;
      return true;
    });
  }, [rows, filter]);

  const openNew = () => {
    const state = blank();
    if (gyms[0]) state.gymId = gyms[0].id;
    const firstTrainer = trainers.find((t) => t.gymId === state.gymId);
    if (firstTrainer) state.trainerId = firstTrainer.id;
    setEditing(state);
  };

  const openEdit = (c: PartnerClass) => {
    setEditing({
      id: c.id,
      title: c.title,
      category: c.category,
      gymId: c.gymId,
      trainerId: c.trainerId,
      startsAt: toLocalInput(new Date(c.startsAt)),
      durationMin: c.durationMin,
      capacity: c.capacity,
      intensity: (c.intensity as "low" | "medium" | "high") ?? "medium",
      coverImage: c.coverImage ?? "",
      description: c.description ?? "",
      calorieEstimate: c.calorieEstimate ?? 300,
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.gymId || !editing.trainerId) {
      setErr("Pick a gym and a trainer.");
      return;
    }
    const body: PartnerClassInput = {
      title: editing.title,
      category: editing.category,
      gymId: Number(editing.gymId),
      trainerId: Number(editing.trainerId),
      startsAt: new Date(editing.startsAt).toISOString(),
      durationMin: editing.durationMin,
      capacity: editing.capacity,
      intensity: editing.intensity,
      coverImage: editing.coverImage,
      description: editing.description,
      calorieEstimate: editing.calorieEstimate,
    };
    try {
      if (editing.id) await partnerApi.classes.update(editing.id, body);
      else await partnerApi.classes.create(body);
      setEditing(null);
      setErr(null);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this scheduled class?")) return;
    await partnerApi.classes.remove(id);
    load();
  };

  const trainersForGym = (gymId: number | "") =>
    trainers.filter((t) => !gymId || t.gymId === Number(gymId));

  return (
    <PartnerLayout
      title="Workout Schedule"
      actions={
        <button
          onClick={openNew}
          disabled={gyms.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/20 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> New class
        </button>
      }
    >
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
              filter === f
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="text-xs text-slate-500 ml-2">
          {filtered.length} class{filtered.length === 1 ? "" : "es"}
        </div>
      </div>

      {gyms.length === 0 ? (
        <PartnerCard className="p-10 text-center">
          <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400">
            You need at least one gym assigned before you can schedule classes.
          </div>
        </PartnerCard>
      ) : filtered.length === 0 ? (
        <PartnerCard className="p-10 text-center">
          <Dumbbell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400">
            No {filter === "all" ? "" : filter} classes yet.
          </div>
        </PartnerCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <PartnerCard key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-orange-600 font-semibold">
                    {c.category}
                  </div>
                  <h3 className="text-white font-semibold mt-1 truncate">
                    {c.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">{c.gymName}</div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-md ${
                    c.intensity === "high"
                      ? "bg-red-500/15 text-red-300"
                      : c.intensity === "medium"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {c.intensity}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(c.startsAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {c.bookedCount}/{c.capacity} booked · {c.durationMin}m
                </div>
              </div>
              <CapacityBar
                booked={c.bookedCount}
                capacity={c.capacity}
              />
              {c.trainerName && (
                <div className="mt-3 text-xs text-slate-500">
                  Trainer:{" "}
                  <span className="text-slate-300">{c.trainerName}</span>
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => openAttendees(c)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                >
                  <Users className="h-3.5 w-3.5" />
                  Attendees ({c.bookedCount})
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </PartnerCard>
          ))}
        </div>
      )}

      {attendeesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-orange-500 font-semibold">
                  {attendeesFor.category} ·{" "}
                  {new Date(attendeesFor.startsAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <h3 className="text-lg font-semibold text-white truncate">
                  Attendees · {attendeesFor.title}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {attendees.filter((a) => a.status !== "cancelled").length}/
                  {attendeesFor.capacity} booked · {attendeesFor.gymName}
                </div>
              </div>
              <button
                onClick={() => setAttendeesFor(null)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              {attendeesBusy ? (
                <div className="p-10 text-center text-sm text-slate-400">
                  Loading attendees…
                </div>
              ) : attendees.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <div className="text-slate-400 text-sm">
                    No one has booked this class yet.
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {attendees.map((a) => (
                    <li
                      key={a.id}
                      className="py-3 flex items-center gap-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-bold">
                        {a.userAvatar ? (
                          <img
                            src={a.userAvatar}
                            alt={a.userName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          a.userName?.[0]?.toUpperCase() ?? "U"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-medium truncate">
                            {a.userName}
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {a.userEmail}
                          </span>
                          {a.userPhone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {a.userPhone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.status !== "completed" && (
                          <button
                            onClick={() =>
                              setBookingStatus(a.id, "completed")
                            }
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            title="Mark attended"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Attended
                          </button>
                        )}
                        {a.status !== "cancelled" && (
                          <button
                            onClick={() =>
                              setBookingStatus(a.id, "cancelled")
                            }
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            title="Cancel booking"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                        {a.status === "cancelled" && (
                          <button
                            onClick={() =>
                              setBookingStatus(a.id, "confirmed")
                            }
                            className="text-xs px-2.5 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900">
              <h3 className="text-lg font-semibold text-white">
                {editing.id ? "Edit class" : "Schedule a new class"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <input
                  className={INPUT}
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className={INPUT}
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Intensity</Label>
                <select
                  className={INPUT}
                  value={editing.intensity}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      intensity: e.target.value as
                        | "low"
                        | "medium"
                        | "high",
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <Label>Gym</Label>
                <select
                  className={INPUT}
                  value={editing.gymId}
                  onChange={(e) => {
                    const gymId = e.target.value
                      ? Number(e.target.value)
                      : ("" as const);
                    const first = trainers.find(
                      (t) => t.gymId === Number(gymId),
                    );
                    setEditing({
                      ...editing,
                      gymId,
                      trainerId: first?.id ?? "",
                    });
                  }}
                >
                  <option value="">— Pick a gym —</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Trainer</Label>
                <select
                  className={INPUT}
                  value={editing.trainerId}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      trainerId: e.target.value
                        ? Number(e.target.value)
                        : ("" as const),
                    })
                  }
                >
                  <option value="">— Pick a trainer —</option>
                  {trainersForGym(editing.gymId).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.specialty}
                    </option>
                  ))}
                </select>
                {editing.gymId && trainersForGym(editing.gymId).length === 0 && (
                  <div className="text-[11px] text-amber-400 mt-1">
                    No trainers attached to this gym yet. Ask GYMCO admin to
                    add one.
                  </div>
                )}
              </div>
              <div>
                <Label>Date &amp; time</Label>
                <input
                  type="datetime-local"
                  className={INPUT}
                  value={editing.startsAt}
                  onChange={(e) =>
                    setEditing({ ...editing, startsAt: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <input
                  type="number"
                  min={5}
                  className={INPUT}
                  value={editing.durationMin}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      durationMin: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <input
                  type="number"
                  min={1}
                  className={INPUT}
                  value={editing.capacity}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      capacity: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Calories estimate</Label>
                <input
                  type="number"
                  min={0}
                  className={INPUT}
                  value={editing.calorieEstimate}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      calorieEstimate: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Cover image</Label>
                <div className="flex items-start gap-3">
                  {editing.coverImage ? (
                    <img
                      src={editing.coverImage}
                      alt="Cover preview"
                      className="h-20 w-28 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-28 rounded-lg border border-dashed border-slate-700 bg-slate-800/40 flex items-center justify-center text-[10px] text-slate-500 uppercase tracking-wider shrink-0">
                      No image
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      className={INPUT}
                      value={editing.coverImage}
                      onChange={(e) =>
                        setEditing({ ...editing, coverImage: e.target.value })
                      }
                      placeholder="Paste an image URL or upload below"
                    />
                    <div className="flex items-center gap-2">
                      <FileUpload
                        label="Upload image"
                        accept="image/*"
                        onUploaded={(urls) => {
                          if (urls[0]) {
                            setEditing((prev) =>
                              prev ? { ...prev, coverImage: urls[0] } : prev,
                            );
                          }
                        }}
                      />
                      {editing.coverImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({ ...editing, coverImage: "" })
                          }
                          className="text-[11px] font-semibold text-slate-400 hover:text-rose-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <textarea
                  rows={3}
                  className={INPUT}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      description: e.target.value,
                    })
                  }
                />
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
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold"
              >
                {editing.id ? "Save changes" : "Schedule class"}
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

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "cancelled"
        ? "bg-red-500/15 text-red-300"
        : "bg-orange-500/15 text-orange-300";
  return (
    <span
      className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded ${tone}`}
    >
      {status}
    </span>
  );
}

function CapacityBar({
  booked,
  capacity,
}: {
  booked: number;
  capacity: number;
}) {
  const pct = capacity > 0 ? Math.min(100, (booked / capacity) * 100) : 0;
  const tone =
    pct >= 100
      ? "bg-red-500"
      : pct >= 75
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${tone} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
