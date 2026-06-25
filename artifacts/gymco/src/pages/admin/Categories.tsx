import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Plus, Trash2, X, Tags, Pencil } from "lucide-react";

type Category = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

const INPUT =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

type FormState = {
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

const blank = (): FormState => ({
  name: "",
  slug: "",
  sortOrder: 0,
  isActive: true,
});

export default function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(blank());
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminApi.categories.list().then(setRows).catch(() => setRows([]));
  };
  useEffect(load, []);

  const startCreate = () => {
    setForm(blank());
    setCreating(true);
    setEditing(null);
    setErr(null);
  };
  const startEdit = (c: Category) => {
    setForm({
      name: c.name,
      slug: c.slug,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    });
    setEditing(c);
    setCreating(false);
    setErr(null);
  };
  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        await adminApi.categories.update(editing.id, form);
      } else {
        await adminApi.categories.create(form);
      }
      cancel();
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    await adminApi.categories.remove(id);
    load();
  };

  const showForm = creating || !!editing;

  return (
    <AdminLayout
      title="Categories"
      actions={
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-medium shadow"
        >
          <Plus className="h-3.5 w-3.5" /> New Category
        </button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-lime-500/10 border border-lime-500/30 px-4 py-3 text-sm text-lime-200 flex items-start gap-2">
          <Tags className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Categories power the product forms (admin &amp; vendor) and the
            storefront filter. Inactive categories stay assigned to existing
            products but are hidden from new selections and the storefront.
          </span>
        </div>

        {showForm && (
          <AdminCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">
                {creating ? "Add category" : `Edit: ${editing?.name}`}
              </h3>
              <button
                onClick={cancel}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {err && (
              <div className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                {err}
              </div>
            )}
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-slate-400">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={INPUT + " mt-1"}
                  placeholder="Apparel"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400">
                  Slug (optional — auto from name)
                </span>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className={INPUT + " mt-1"}
                  placeholder="apparel"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400">Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) })
                  }
                  className={INPUT + " mt-1"}
                />
              </label>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-lime-500"
                />
                <span className="text-sm text-slate-300">Active</span>
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {busy
                    ? "Saving…"
                    : creating
                      ? "Create category"
                      : "Save changes"}
                </button>
              </div>
            </form>
          </AdminCard>
        )}

        <AdminCard className="overflow-hidden">
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-500">
              <Tags className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No categories yet. Click "New Category" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Slug</th>
                    <th className="px-5 py-3">Sort</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-3 font-medium text-white">
                        {c.name}
                      </td>
                      <td className="px-5 py-3 text-slate-400">{c.slug}</td>
                      <td className="px-5 py-3 text-slate-300">{c.sortOrder}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            c.isActive
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-700/40 text-slate-300 border border-slate-600/40"
                          }`}
                        >
                          {c.isActive ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 mr-1 inline-flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
