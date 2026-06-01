import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Plus, Trash2, Save, X, Sparkles } from "lucide-react";

type Amenity = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY: Omit<Amenity, "id"> = {
  name: "",
  slug: "",
  description: "",
  icon: "Dot",
  category: "general",
  isActive: true,
  sortOrder: 0,
};

export default function AmenityCatalog() {
  const [rows, setRows] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<Amenity, "id">>(EMPTY);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await adminApi.amenities.list();
      setRows(list as Amenity[]);
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
  const startEdit = (a: Amenity) => {
    setDraft({
      name: a.name,
      slug: a.slug,
      description: a.description ?? "",
      icon: a.icon ?? "Dot",
      category: a.category ?? "general",
      isActive: a.isActive,
      sortOrder: a.sortOrder ?? 0,
    });
    setEditing(a);
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
        await adminApi.amenities.update(editing.id, draft);
      } else {
        await adminApi.amenities.create(draft);
      }
      await load();
      cancel();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  };
  const remove = async (a: Amenity) => {
    if (!confirm(`Delete amenity "${a.name}"?`)) return;
    await adminApi.amenities.remove(a.id);
    await load();
  };

  return (
    <AdminLayout
      title="Amenities Catalog"
      actions={
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white text-sm font-semibold shadow"
        >
          <Plus className="h-4 w-4" /> New amenity
        </button>
      }
    >
      <div className="space-y-4">
        {(creating || editing) && (
          <div className="bg-white border border-lime-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Sparkles className="h-4 w-4 text-lime-500" />
                {editing ? `Edit "${editing.name}"` : "Create amenity"}
              </div>
              <button
                onClick={cancel}
                className="p-1.5 rounded-md hover:bg-lime-50 text-slate-500"
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
                  className="w-full px-3 py-2 rounded-lg bg-lime-50/60 border border-lime-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
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
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-lime-100 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No amenities yet. Click "New amenity" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead className="bg-lime-50/60 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Name</th>
                  <th className="text-left px-4 py-2 font-semibold">Slug</th>
                  <th className="text-left px-4 py-2 font-semibold">Icon</th>
                  <th className="text-left px-4 py-2 font-semibold">Active</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-lime-50">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {a.name}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{a.slug}</td>
                    <td className="px-4 py-2 text-slate-500">{a.icon}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          a.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {a.isActive ? "ACTIVE" : "OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => startEdit(a)}
                        className="px-2 py-1 rounded-md text-lime-600 hover:bg-lime-50 text-xs font-semibold mr-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(a)}
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
        className="w-full px-3 py-2 rounded-lg bg-lime-50/60 border border-lime-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
      />
    </div>
  );
}
