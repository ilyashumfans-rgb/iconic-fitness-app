import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import * as LucideIcons from "lucide-react";
import { Plus, Trash2, Save, X, Activity, Dot } from "lucide-react";

type Workout = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY: Omit<Workout, "id"> = {
  name: "",
  slug: "",
  description: "",
  icon: "Dumbbell",
  color: "from-orange-500 to-amber-500",
  imageUrl: "",
  isActive: true,
  sortOrder: 0,
};

const COLOR_PRESETS = [
  { label: "Orange", value: "from-orange-500 to-amber-500" },
  { label: "Blue", value: "from-blue-500 to-indigo-500" },
  { label: "Violet", value: "from-violet-500 to-purple-500" },
  { label: "Red", value: "from-red-500 to-rose-500" },
  { label: "Yellow", value: "from-yellow-400 to-orange-400" },
  { label: "Pink", value: "from-pink-500 to-rose-500" },
  { label: "Emerald", value: "from-emerald-500 to-teal-500" },
  { label: "Slate", value: "from-slate-700 to-slate-900" },
];

function WorkoutIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const lookup = (LucideIcons as unknown as Record<string, unknown>)[name];
  const Comp =
    typeof lookup === "function" || typeof lookup === "object"
      ? (lookup as React.ComponentType<{ className?: string }>)
      : Dot;
  try {
    return <Comp className={className} />;
  } catch {
    return <Dot className={className} />;
  }
}

export default function WorkoutCatalog() {
  const [rows, setRows] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<Workout, "id">>(EMPTY);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await adminApi.workouts.list();
      setRows(list as Workout[]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setDraft(EMPTY);
    setEditing(null);
    setCreating(true);
    setErr(null);
  };
  const startEdit = (w: Workout) => {
    setDraft({
      name: w.name,
      slug: w.slug,
      description: w.description ?? "",
      icon: w.icon ?? "Dumbbell",
      color: w.color ?? EMPTY.color,
      imageUrl: w.imageUrl ?? "",
      isActive: w.isActive,
      sortOrder: w.sortOrder ?? 0,
    });
    setEditing(w);
    setCreating(false);
    setErr(null);
  };
  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setErr(null);
  };
  const save = async () => {
    setErr(null);
    try {
      if (editing) {
        await adminApi.workouts.update(editing.id, draft);
      } else {
        await adminApi.workouts.create(draft);
      }
      await load();
      cancel();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  };
  const remove = async (w: Workout) => {
    if (!confirm(`Delete workout "${w.name}"?`)) return;
    await adminApi.workouts.remove(w.id);
    await load();
  };

  return (
    <AdminLayout
      title="Workouts Catalog"
      actions={
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold shadow"
        >
          <Plus className="h-4 w-4" /> New workout
        </button>
      }
    >
      <div className="space-y-4">
        {(creating || editing) && (
          <div className="bg-white border border-orange-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Activity className="h-4 w-4 text-orange-500" />
                {editing ? `Edit "${editing.name}"` : "Create workout"}
              </div>
              <button
                onClick={cancel}
                className="p-1.5 rounded-md hover:bg-orange-50 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Name"
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
              />
              <Field
                label="Slug (optional)"
                value={draft.slug}
                onChange={(v) => setDraft({ ...draft, slug: v })}
              />
              <Field
                label="Icon (Lucide name)"
                value={draft.icon}
                onChange={(v) => setDraft({ ...draft, icon: v })}
              />
              <Field
                label="Sort order"
                type="number"
                value={String(draft.sortOrder)}
                onChange={(v) =>
                  setDraft({ ...draft, sortOrder: Number(v) || 0 })
                }
              />
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5 block">
                  Card color (Tailwind gradient classes)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, color: p.value })}
                      className={`px-2 py-2 rounded-lg text-white text-xs font-semibold bg-gradient-to-br ${p.value} ${
                        draft.color === p.value
                          ? "ring-2 ring-offset-2 ring-orange-500"
                          : ""
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  value={draft.color}
                  onChange={(e) =>
                    setDraft({ ...draft, color: e.target.value })
                  }
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-orange-50/60 border border-orange-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 font-mono"
                />
              </div>
              <Field
                label="Image URL (optional)"
                value={draft.imageUrl}
                onChange={(v) => setDraft({ ...draft, imageUrl: v })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) =>
                    setDraft({ ...draft, isActive: e.target.checked })
                  }
                />
                Active
              </label>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-orange-50/60 border border-orange-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5">
                  Live preview
                </div>
                <div className="w-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div
                    className={`h-14 w-14 rounded-xl bg-gradient-to-br ${draft.color} flex items-center justify-center text-white shadow`}
                  >
                    <WorkoutIcon name={draft.icon} className="h-6 w-6" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-slate-800">
                    {draft.name || "Workout name"}
                  </div>
                </div>
              </div>
            </div>

            {err && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {err}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={cancel}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-orange-100 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No workouts yet. Click "New workout" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead className="bg-orange-50/60 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Preview</th>
                  <th className="text-left px-4 py-2 font-semibold">Name</th>
                  <th className="text-left px-4 py-2 font-semibold">Slug</th>
                  <th className="text-left px-4 py-2 font-semibold">Icon</th>
                  <th className="text-left px-4 py-2 font-semibold">Sort</th>
                  <th className="text-left px-4 py-2 font-semibold">Active</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className="border-t border-orange-50">
                    <td className="px-4 py-2">
                      <div
                        className={`h-9 w-9 rounded-lg bg-gradient-to-br ${w.color || EMPTY.color} flex items-center justify-center text-white`}
                      >
                        <WorkoutIcon name={w.icon} className="h-4 w-4" />
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {w.name}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{w.slug}</td>
                    <td className="px-4 py-2 text-slate-500">{w.icon}</td>
                    <td className="px-4 py-2 text-slate-500">{w.sortOrder}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          w.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {w.isActive ? "ACTIVE" : "OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => startEdit(w)}
                        className="px-2 py-1 rounded-md text-orange-600 hover:bg-orange-50 text-xs font-semibold mr-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(w)}
                        className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-orange-50/60 border border-orange-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
      />
    </div>
  );
}
