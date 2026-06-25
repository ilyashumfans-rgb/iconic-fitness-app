import { useEffect, useState } from "react";
import { VendorLayout, VendorCard } from "@/components/vendor/VendorLayout";
import { vendorApi, type VendorProduct } from "@/lib/vendorApi";
import { storeApi, type StoreCategory } from "@/lib/storeApi";
import FileUpload from "@/components/FileUpload";
import { Plus, Trash2, X, Package, Pencil } from "lucide-react";

const INPUT =
  "w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

type FormState = {
  name: string;
  description: string;
  category: string;
  priceInr: number;
  originalPriceInr: number;
  imageUrl: string;
  gallery: string[];
  sizes: string;
  colors: string;
  stock: number;
  status: string;
};

const blank = (category: string): FormState => ({
  name: "",
  description: "",
  category,
  priceInr: 0,
  originalPriceInr: 0,
  imageUrl: "",
  gallery: [],
  sizes: "",
  colors: "",
  stock: 0,
  status: "active",
});

function toList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function VendorProducts() {
  const [rows, setRows] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [editing, setEditing] = useState<VendorProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(blank("apparel"));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    vendorApi.products.list().then(setRows).catch(() => setRows([]));
  };
  useEffect(load, []);
  useEffect(() => {
    storeApi.listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const defaultCat = categories[0]?.slug ?? "apparel";

  const openCreate = () => {
    setForm(blank(defaultCat));
    setEditing(null);
    setCreating(true);
    setErr(null);
  };
  const openEdit = (p: VendorProduct) => {
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      priceInr: p.priceInr,
      originalPriceInr: p.originalPriceInr,
      imageUrl: p.imageUrl,
      gallery: p.gallery ?? [],
      sizes: (p.sizes ?? []).join(", "),
      colors: (p.colors ?? []).join(", "),
      stock: p.stock,
      status: p.status,
    });
    setEditing(p);
    setCreating(false);
    setErr(null);
  };
  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        ...form,
        sizes: toList(form.sizes),
        colors: toList(form.colors),
      };
      if (editing) {
        await vendorApi.products.update(editing.id, payload);
      } else {
        await vendorApi.products.create(payload);
      }
      close();
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await vendorApi.products.remove(id);
    load();
  };

  const isOpen = creating || editing !== null;

  return (
    <VendorLayout
      title="Products & Stock"
      actions={
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-semibold shadow-md shadow-lime-500/20"
        >
          <Plus className="h-4 w-4" />
          New product
        </button>
      }
    >
      <VendorCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-lime-100 flex items-center gap-2">
          <Package className="h-4 w-4 text-lime-500" />
          <div className="text-sm font-bold">Your catalog</div>
          <div className="text-xs text-slate-500">({rows.length})</div>
        </div>
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No products yet. Add your first product to start selling.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-lime-100">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Variants</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-lime-100/60 hover:bg-lime-50/50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-10 w-10 rounded-md object-cover border border-lime-100"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-lime-50 border border-lime-100" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {p.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600">
                    {p.category}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {(p.sizes?.length ?? 0) === 0 &&
                    (p.colors?.length ?? 0) === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {p.sizes?.length ? (
                          <div>Sizes: {p.sizes.join(", ")}</div>
                        ) : null}
                        {p.colors?.length ? (
                          <div>Colours: {p.colors.join(", ")}</div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-bold">{inr.format(p.priceInr)}</div>
                    {p.originalPriceInr > p.priceInr && (
                      <div className="text-[11px] text-slate-400 line-through">
                        {inr.format(p.originalPriceInr)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-md ${
                        p.stock === 0
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : p.stock < 5
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded uppercase tracking-wide font-bold ${
                        p.status === "active"
                          ? "bg-lime-100 text-lime-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-lime-50 text-lime-700 border border-lime-200 hover:bg-lime-100 mr-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </VendorCard>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-lime-100 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-5 py-4 border-b border-lime-100 flex items-center justify-between">
              <div className="text-sm font-bold">
                {editing ? "Edit product" : "New product"}
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-md hover:bg-lime-50 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Name
                  </label>
                  <input
                    className={INPUT}
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Category
                  </label>
                  <select
                    className={INPUT}
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    {categories.length === 0 ? (
                      <option value={form.category}>{form.category}</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Status
                  </label>
                  <select
                    className={INPUT}
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    className={INPUT}
                    value={form.priceInr}
                    onChange={(e) =>
                      setForm({ ...form, priceInr: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Original Price (INR)
                  </label>
                  <input
                    type="number"
                    className={INPUT}
                    value={form.originalPriceInr}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        originalPriceInr: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Stock
                  </label>
                  <input
                    type="number"
                    className={INPUT}
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Sizes (comma separated)
                  </label>
                  <input
                    className={INPUT}
                    value={form.sizes}
                    onChange={(e) =>
                      setForm({ ...form, sizes: e.target.value })
                    }
                    placeholder="S, M, L, XL"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Colours (comma separated)
                  </label>
                  <input
                    className={INPUT}
                    value={form.colors}
                    onChange={(e) =>
                      setForm({ ...form, colors: e.target.value })
                    }
                    placeholder="Black, White, Lime"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Main image
                  </label>
                  <div className="flex items-center gap-3">
                    {form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover border border-lime-100"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-lime-50 border border-lime-100" />
                    )}
                    <FileUpload
                      label="Upload image"
                      onUploaded={(urls) =>
                        urls[0] && setForm((f) => ({ ...f, imageUrl: urls[0] }))
                      }
                    />
                  </div>
                  <input
                    className={`${INPUT} mt-2`}
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                    placeholder="…or paste an image URL"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Gallery images
                  </label>
                  {form.gallery.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.gallery.map((g, i) => (
                        <div key={`${g}-${i}`} className="relative">
                          <img
                            src={g}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover border border-lime-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                gallery: f.gallery.filter((_, j) => j !== i),
                              }))
                            }
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <FileUpload
                    label="Add gallery images"
                    multiple
                    onUploaded={(urls) =>
                      setForm((f) => ({
                        ...f,
                        gallery: [...f.gallery, ...urls],
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-bold">
                    Description
                  </label>
                  <textarea
                    className={`${INPUT} h-24 resize-none`}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>
              {err && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {err}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-lime-100 flex items-center justify-end gap-2">
              <button
                onClick={close}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-lime-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-semibold shadow-md shadow-lime-500/20 disabled:opacity-60"
              >
                {busy ? "Saving…" : editing ? "Save changes" : "Create product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
