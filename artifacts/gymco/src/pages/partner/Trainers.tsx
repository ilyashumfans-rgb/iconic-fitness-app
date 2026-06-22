import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import FileUpload from "@/components/FileUpload";
import {
  partnerApi,
  type PartnerGym,
  type PartnerTrainer,
  type PartnerTrainerInput,
} from "@/lib/partnerApi";
import { Plus, Pencil, Trash2, X, UserCog, Dumbbell } from "lucide-react";

const INPUT =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60";

type EditState = {
  id?: number;
  name: string;
  specialty: string;
  gymId: number | "";
  bio: string;
  photoUrl: string;
};

const blank = (): EditState => ({
  name: "",
  specialty: "",
  gymId: "",
  bio: "",
  photoUrl: "",
});

export default function PartnerTrainers() {
  const [trainers, setTrainers] = useState<PartnerTrainer[]>([]);
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([partnerApi.trainers.list(), partnerApi.gyms.list()])
      .then(([t, g]) => {
        setTrainers(t);
        setGyms(g);
      })
      .catch((e) => setErr(String(e)));
  };
  useEffect(load, []);

  const gymName = useMemo(() => {
    const map = new Map<number, string>();
    gyms.forEach((g) => map.set(g.id, g.name));
    return (id: number | null) => (id == null ? "—" : (map.get(id) ?? "—"));
  }, [gyms]);

  const openNew = () => {
    const state = blank();
    if (gyms[0]) state.gymId = gyms[0].id;
    setEditing(state);
  };

  const openEdit = (t: PartnerTrainer) => {
    setEditing({
      id: t.id,
      name: t.name,
      specialty: t.specialty,
      gymId: t.gymId ?? "",
      bio: t.bio ?? "",
      photoUrl: t.photoUrl ?? "",
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.specialty.trim() || !editing.gymId) {
      setErr("Name, specialty and gym are required.");
      return;
    }
    const body: PartnerTrainerInput = {
      name: editing.name.trim(),
      specialty: editing.specialty.trim(),
      gymId: Number(editing.gymId),
      bio: editing.bio,
      photoUrl: editing.photoUrl,
    };
    setSaving(true);
    try {
      if (editing.id) await partnerApi.trainers.update(editing.id, body);
      else await partnerApi.trainers.create(body);
      setEditing(null);
      setErr(null);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this trainer?")) return;
    try {
      await partnerApi.trainers.remove(id);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <PartnerLayout
      title="Trainers"
      actions={
        <button
          onClick={openNew}
          disabled={gyms.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-semibold shadow-md shadow-lime-500/20 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> New trainer
        </button>
      }
    >
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}

      {gyms.length === 0 ? (
        <PartnerCard className="p-10 text-center">
          <Dumbbell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">
            You need at least one gym assigned before you can add trainers.
          </div>
        </PartnerCard>
      ) : trainers.length === 0 ? (
        <PartnerCard className="p-10 text-center">
          <UserCog className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">
            No trainers yet. Add your first trainer so you can assign them to
            classes.
          </div>
        </PartnerCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <PartnerCard key={t.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-full overflow-hidden bg-lime-100 shrink-0 flex items-center justify-center text-lime-700 font-bold">
                  {t.photoUrl ? (
                    <img
                      src={t.photoUrl}
                      alt={t.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (t.name?.[0]?.toUpperCase() ?? "T")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-slate-900 font-semibold truncate">
                    {t.name}
                  </h3>
                  <div className="text-xs text-lime-600 font-semibold mt-0.5 truncate">
                    {t.specialty}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {gymName(t.gymId)}
                  </div>
                </div>
              </div>
              {t.bio && (
                <p className="mt-3 text-xs text-slate-500 line-clamp-3">
                  {t.bio}
                </p>
              )}
              <div className="mt-4 pt-3 border-t border-lime-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEdit(t)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-lime-50 text-lime-700 hover:bg-lime-100 font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </PartnerCard>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900">
              <h3 className="text-lg font-semibold text-white">
                {editing.id ? "Edit trainer" : "Add a trainer"}
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
                <Label>Name</Label>
                <input
                  className={INPUT}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="e.g. Priya Sharma"
                />
              </div>
              <div>
                <Label>Specialty</Label>
                <input
                  className={INPUT}
                  value={editing.specialty}
                  onChange={(e) =>
                    setEditing({ ...editing, specialty: e.target.value })
                  }
                  placeholder="e.g. Strength &amp; Conditioning"
                />
              </div>
              <div>
                <Label>Gym</Label>
                <select
                  className={INPUT}
                  value={editing.gymId}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      gymId: e.target.value
                        ? Number(e.target.value)
                        : ("" as const),
                    })
                  }
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
                <Label>Photo</Label>
                <div className="flex items-start gap-3">
                  {editing.photoUrl ? (
                    <img
                      src={editing.photoUrl}
                      alt="Trainer preview"
                      className="h-20 w-20 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed border-slate-700 bg-slate-800/40 flex items-center justify-center text-[10px] text-slate-500 uppercase tracking-wider shrink-0">
                      No image
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      className={INPUT}
                      value={editing.photoUrl}
                      onChange={(e) =>
                        setEditing({ ...editing, photoUrl: e.target.value })
                      }
                      placeholder="Paste an image URL or upload below"
                    />
                    <div className="flex items-center gap-2">
                      <FileUpload
                        label="Upload photo"
                        accept="image/*"
                        onUploaded={(urls) => {
                          if (urls[0]) {
                            setEditing((prev) =>
                              prev ? { ...prev, photoUrl: urls[0] } : prev,
                            );
                          }
                        }}
                      />
                      {editing.photoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({ ...editing, photoUrl: "" })
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
              <div>
                <Label>Bio</Label>
                <textarea
                  rows={3}
                  className={INPUT}
                  value={editing.bio}
                  onChange={(e) =>
                    setEditing({ ...editing, bio: e.target.value })
                  }
                  placeholder="Short bio shown to members (optional)"
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
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {editing.id ? "Save changes" : "Add trainer"}
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
