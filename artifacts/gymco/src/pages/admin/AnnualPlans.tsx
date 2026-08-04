import { useEffect, useRef, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type PackageCategoryRow } from "@/lib/adminApi";
import {
  Check,
  Image as ImageIcon,
  Plus,
  Tag,
  Trash2,
  Upload,
  RefreshCw,
  X,
  CalendarClock,
} from "lucide-react";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Compress raster images so uploads stay small/reliable; GIFs pass through raw.
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const type = keepAlpha ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, type, 0.85),
  );
  bitmap.close?.();
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${keepAlpha ? "png" : "jpg"}`, { type });
}

async function uploadInline(file: File): Promise<string> {
  const res = await fetch("/api/storage/uploads/inline", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Filename": encodeURIComponent(file.name),
    },
    body: file,
  });
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      // keep status message
    }
    throw new Error(msg);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

function PlanForm({
  initial,
  categories,
  onSave,
  onCancel,
}: {
  initial?: any;
  categories: PackageCategoryRow[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    tagline: initial?.tagline ?? "",
    priceInr: initial?.priceInr ?? 14999,
    originalPriceInr: initial?.originalPriceInr ?? 19999,
    gymsIncluded: initial?.gymsIncluded ?? 50,
    classesPerMonth: initial?.classesPerMonth ?? 12,
    perks: (initial?.perks ?? []).join(", "),
    badge: initial?.badge ?? "",
    popular: initial?.popular ?? false,
    imageUrl: initial?.imageUrl ?? "",
    categoryId: initial?.categoryId ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploadErr(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadErr("Image is too large. Please pick one under 15MB.");
      return;
    }
    setUploading(true);
    try {
      const isGif = file.type === "image/gif";
      const toUpload = isGif ? file : await compressImage(file);
      const url = await uploadInline(toUpload);
      setF((prev) => ({ ...prev, imageUrl: url }));
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...f,
        // Annual Plans tab always manages yearly-billed plans.
        billingPeriod: "annual",
        priceInr: Number(f.priceInr),
        originalPriceInr: Number(f.originalPriceInr),
        gymsIncluded: Number(f.gymsIncluded),
        classesPerMonth: Number(f.classesPerMonth),
        categoryId: Number(f.categoryId) || 0,
        perks: String(f.perks)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" v={f.name} on={(v) => setF({ ...f, name: v })} required />
        <Field label="Tagline" v={f.tagline} on={(v) => setF({ ...f, tagline: v })} />
        <Field label="Badge" v={f.badge} on={(v) => setF({ ...f, badge: v })} />
        <Field type="number" label="Price / year (₹)" v={f.priceInr} on={(v) => setF({ ...f, priceInr: v as any })} />
        <Field type="number" label="Original Price (₹)" v={f.originalPriceInr} on={(v) => setF({ ...f, originalPriceInr: v as any })} />
        <Field type="number" label="Gyms Included" v={f.gymsIncluded} on={(v) => setF({ ...f, gymsIncluded: v as any })} />
        <Field type="number" label="Classes/Month" v={f.classesPerMonth} on={(v) => setF({ ...f, classesPerMonth: v as any })} />
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
            Category
          </label>
          <select
            value={f.categoryId}
            onChange={(e) => setF({ ...f, categoryId: Number(e.target.value) })}
            className={inputCls}
          >
            <option value={0}>No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isActive ? "" : " (hidden)"}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Field label="Perks (comma)" v={f.perks} on={(v) => setF({ ...f, perks: v })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
            Package image
          </label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-28 shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
              {f.imageUrl ? (
                <img
                  src={f.imageUrl}
                  alt="Package"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <div className="flex flex-col items-start gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : f.imageUrl ? "Replace image" : "Upload image"}
              </button>
              {f.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setF((prev) => ({ ...prev, imageUrl: "" }))}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Remove image
                </button>
              ) : null}
              {uploadErr ? (
                <span className="text-xs text-red-400">{uploadErr}</span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Shown on the app’s Packages cards. JPG/PNG/WebP.
                </span>
              )}
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={f.popular}
            onChange={(e) => setF({ ...f, popular: e.target.checked })}
            className="h-4 w-4 accent-lime-500"
          />
          Mark as popular
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          disabled={busy}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white font-semibold disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  v,
  on,
  type = "text",
  required,
}: {
  label: string;
  v: string | number;
  on: (s: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
        {label}
      </label>
      <input
        required={required}
        type={type}
        value={v}
        onChange={(e) => on(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

function InlinePrice({
  plan,
  onSaved,
}: {
  plan: any;
  onSaved: () => void;
}) {
  const [price, setPrice] = useState<number>(plan.priceInr);
  const [orig, setOrig] = useState<number>(plan.originalPriceInr);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const dirty = price !== plan.priceInr || orig !== plan.originalPriceInr;
  const discount =
    orig > 0 && price < orig
      ? Math.round(((orig - price) / orig) * 100)
      : 0;

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    setOk(false);
    try {
      await adminApi.memberships.update(plan.id, {
        priceInr: Number(price),
        originalPriceInr: Number(orig),
      });
      setOk(true);
      onSaved();
      setTimeout(() => setOk(false), 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-slate-900/70 border border-slate-800">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 mb-2">
        <Tag className="h-3 w-3" /> Quick price
        {discount > 0 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {discount}% off
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-slate-500">
          Sell ₹
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full mt-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          />
        </label>
        <label className="text-[10px] text-slate-500">
          MRP ₹
          <input
            type="number"
            value={orig}
            onChange={(e) => setOrig(Number(e.target.value))}
            className="w-full mt-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          />
        </label>
      </div>
      <button
        onClick={save}
        disabled={!dirty || busy}
        className="mt-2 w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-gradient-to-r from-lime-500 to-lime-600 text-white text-xs font-semibold disabled:opacity-40"
      >
        {ok ? <Check className="h-3.5 w-3.5" /> : null}
        {busy ? "Saving…" : ok ? "Saved" : "Save price"}
      </button>
    </div>
  );
}

function CategoriesPanel({
  categories,
  onChanged,
}: {
  categories: PackageCategoryRow[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState(false);
  const imgFileRef = useRef<HTMLInputElement>(null);
  const imgTargetRef = useRef<number | null>(null);

  const pickImage = (id: number) => {
    imgTargetRef.current = id;
    imgFileRef.current?.click();
  };

  const handleImageFile = async (file: File) => {
    const id = imgTargetRef.current;
    if (id == null) return;
    setImgErr(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setImgErr("Image is too large. Please pick one under 15MB.");
      return;
    }
    setUploadingId(id);
    try {
      const isGif = file.type === "image/gif";
      const toUpload = isGif ? file : await compressImage(file);
      const url = await uploadInline(toUpload);
      await adminApi.packageCategories.update(id, { imageUrl: url });
      onChanged();
    } catch (e) {
      setImgErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingId(null);
      imgTargetRef.current = null;
      if (imgFileRef.current) imgFileRef.current.value = "";
    }
  };

  const add = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const maxSort = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
      await adminApi.packageCategories.create({ name, sortOrder: maxSort + 1 });
      setNewName("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async (id: number) => {
    const name = editName.trim();
    if (!name) return;
    await adminApi.packageCategories.update(id, { name });
    setEditId(null);
    onChanged();
  };

  const syncFromWorkspace = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    setSyncErr(false);
    try {
      const res = await adminApi.syncPackageCatalog();
      const added = res.categoriesAdded ?? [];
      if (added.length === 0) {
        setSyncMsg("Already up to date — no missing categories found.");
      } else {
        setSyncMsg(
          `Added ${added.length} categor${added.length === 1 ? "y" : "ies"}: ${added.join(
            ", ",
          )}${res.imagesAdded ? ` (+${res.imagesAdded} image${res.imagesAdded === 1 ? "" : "s"})` : ""}. Existing categories were left untouched.`,
        );
        onChanged();
      }
    } catch (e) {
      setSyncErr(true);
      setSyncMsg(
        `Sync failed: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = categories[idx];
    const b = categories[idx + dir];
    if (!a || !b) return;
    await Promise.all([
      adminApi.packageCategories.update(a.id, { sortOrder: b.sortOrder }),
      adminApi.packageCategories.update(b.id, { sortOrder: a.sortOrder }),
    ]);
    onChanged();
  };

  return (
    <AdminCard className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-lime-600" />
        <h3 className="font-semibold text-slate-900">Package Categories</h3>
        <button
          type="button"
          onClick={() => void syncFromWorkspace()}
          disabled={syncing}
          title="Copies package categories (and their images) that exist in the workspace but are missing here. Never changes or removes existing categories."
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-200 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Copying…" : "Copy missing from workspace"}
        </button>
      </div>
      {syncMsg ? (
        <div
          className={`text-xs mb-3 rounded-lg border p-2.5 ${
            syncErr
              ? "text-red-600 bg-red-500/10 border-red-500/30"
              : "text-emerald-700 bg-emerald-500/10 border-emerald-500/30"
          }`}
        >
          {syncMsg}
        </div>
      ) : null}
      <p className="text-xs text-slate-500 mb-4">
        Categories appear as filter chips on the app’s Packages tab. Hidden
        categories (and their packages) stay under “All”. Add an image to show
        it on the category chip in the app.
      </p>
      <input
        ref={imgFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageFile(file);
        }}
      />
      {imgErr ? (
        <div className="text-xs text-red-500 mb-3">{imgErr}</div>
      ) : null}
      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          placeholder="New category name"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
        />
        <button
          onClick={add}
          disabled={!newName.trim() || busy}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {categories.length === 0 ? (
        <div className="text-sm text-slate-400">No categories yet.</div>
      ) : (
        <div className="space-y-2">
          {categories.map((c, idx) => (
            <div
              key={c.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50"
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === categories.length - 1}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              {editId === c.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveRename(c.id);
                      }
                    }}
                    className="flex-1 px-2 py-1 rounded border border-slate-200 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => saveRename(c.id)}
                    className="text-xs px-2 py-1 rounded bg-lime-500/15 text-lime-700 font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="text-xs px-2 py-1 rounded text-slate-500"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => pickImage(c.id)}
                    disabled={uploadingId === c.id}
                    title={c.imageUrl ? "Replace image" : "Add image"}
                    className="h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center hover:ring-2 hover:ring-lime-500/60 disabled:opacity-60"
                  >
                    {uploadingId === c.id ? (
                      <span className="text-[9px] text-slate-500">…</span>
                    ) : c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm font-medium ${c.isActive ? "text-slate-900" : "text-slate-400 line-through"}`}
                  >
                    {c.name}
                  </span>
                  {c.imageUrl ? (
                    <button
                      onClick={() =>
                        adminApi.packageCategories
                          .update(c.id, { imageUrl: "" })
                          .then(onChanged)
                      }
                      className="text-[11px] px-2 py-1 rounded text-slate-400 hover:text-red-500"
                    >
                      Remove image
                    </button>
                  ) : null}
                  <button
                    onClick={() =>
                      adminApi.packageCategories
                        .update(c.id, { isActive: !c.isActive })
                        .then(onChanged)
                    }
                    className={`text-[11px] px-2 py-1 rounded border ${
                      c.isActive
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {c.isActive ? "Visible" : "Hidden"}
                  </button>
                  <button
                    onClick={() => {
                      setEditId(c.id);
                      setEditName(c.name);
                    }}
                    className="text-xs px-2 py-1 rounded text-slate-500 hover:text-slate-900"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (
                        !confirm(
                          `Delete category “${c.name}”? Its packages move to “All”.`,
                        )
                      )
                        return;
                      void adminApi.packageCategories
                        .remove(c.id)
                        .then(onChanged);
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}

export default function AdminAnnualPlans() {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<PackageCategoryRow[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    adminApi.memberships.list().then(setRows).catch(() => {});
    adminApi.packageCategories.list().then(setCategories).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // This tab manages yearly-billed plans only.
  const annualPlans = rows.filter((p) => p.billingPeriod === "annual");

  const remove = async (id: number) => {
    if (!confirm("Delete plan?")) return;
    await adminApi.memberships.remove(id);
    load();
  };

  return (
    <AdminLayout
      title="Packages"
      actions={
        <button
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Package
        </button>
      }
    >
      <AdminCard className="p-4 mb-6 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-lime-500/15 text-lime-600 flex items-center justify-center shrink-0">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="text-sm text-slate-600">
          <div className="font-semibold text-slate-900">Packages</div>
          Packages created here are billed annually and appear under the “Offers”
          tab on the website and mobile app. Monthly & quarterly plans are
          managed under <span className="font-medium">Memberships</span>.
        </div>
      </AdminCard>

      <CategoriesPanel categories={categories} onChanged={load} />

      {(creating || editing) && (
        <AdminCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">
              {editing ? `Edit Package — ${editing.name}` : "Add Package"}
            </h3>
            <button
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="text-slate-400 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <PlanForm
            key={editing?.id ?? "new"}
            initial={editing ?? undefined}
            categories={categories}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSave={async (body) => {
              if (editing) await adminApi.memberships.update(editing.id, body);
              else await adminApi.memberships.create(body);
              setCreating(false);
              setEditing(null);
              load();
            }}
          />
        </AdminCard>
      )}

      {annualPlans.length === 0 && !creating && !editing ? (
        <AdminCard className="p-10 text-center text-slate-500">
          No packages yet. Click “Add Package” to create your first one.
        </AdminCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {annualPlans.map((p) => (
            <AdminCard key={p.id} className="p-5 relative">
              {p.popular && (
                <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded bg-lime-500/20 text-lime-600 border border-lime-500/40">
                  POPULAR
                </span>
              )}
              <div className="text-xs uppercase tracking-wider text-slate-400">
                {categories.find((c) => c.id === p.categoryId)?.name ??
                  "Package"}
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500">{p.tagline}</div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">
                ₹{p.priceInr.toLocaleString("en-IN")}
                <span className="text-sm font-medium text-slate-400">/yr</span>
              </div>
              <div className="text-xs text-slate-400 line-through">
                ₹{p.originalPriceInr.toLocaleString("en-IN")}
              </div>
              <InlinePrice plan={p} onSaved={load} />
              <div className="text-xs text-slate-500 mt-3 space-y-1">
                <div>{p.gymsIncluded} gyms included</div>
                <div>{p.classesPerMonth} classes/month</div>
                {p.perks?.length > 0 && (
                  <div className="text-slate-400 line-clamp-2">
                    {p.perks.join(" • ")}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setEditing(p);
                    setCreating(false);
                  }}
                  className="flex-1 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="p-2 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
