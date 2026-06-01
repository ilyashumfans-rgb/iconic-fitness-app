import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Check, Plus, Tag, Trash2, X } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

function PlanForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: any;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    tagline: initial?.tagline ?? "",
    billingPeriod: initial?.billingPeriod ?? "monthly",
    priceInr: initial?.priceInr ?? 1499,
    originalPriceInr: initial?.originalPriceInr ?? 1999,
    gymsIncluded: initial?.gymsIncluded ?? 50,
    classesPerMonth: initial?.classesPerMonth ?? 12,
    perks: (initial?.perks ?? []).join(", "),
    badge: initial?.badge ?? "",
    popular: initial?.popular ?? false,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...f,
        priceInr: Number(f.priceInr),
        originalPriceInr: Number(f.originalPriceInr),
        gymsIncluded: Number(f.gymsIncluded),
        classesPerMonth: Number(f.classesPerMonth),
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
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Billing Period</label>
          <select
            value={f.billingPeriod}
            onChange={(e) => setF({ ...f, billingPeriod: e.target.value })}
            className={inputCls}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (3 months)</option>
            <option value="annual">Annual (yearly)</option>
          </select>
        </div>
        <Field label="Badge" v={f.badge} on={(v) => setF({ ...f, badge: v })} />
        <Field type="number" label="Price (₹)" v={f.priceInr} on={(v) => setF({ ...f, priceInr: v as any })} />
        <Field type="number" label="Original Price (₹)" v={f.originalPriceInr} on={(v) => setF({ ...f, originalPriceInr: v as any })} />
        <Field type="number" label="Gyms Included" v={f.gymsIncluded} on={(v) => setF({ ...f, gymsIncluded: v as any })} />
        <Field type="number" label="Classes/Month" v={f.classesPerMonth} on={(v) => setF({ ...f, classesPerMonth: v as any })} />
        <div className="sm:col-span-2">
          <Field label="Perks (comma)" v={f.perks} on={(v) => setF({ ...f, perks: v })} />
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

export default function AdminMemberships() {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => adminApi.memberships.list().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  const remove = async (id: number) => {
    if (!confirm("Delete plan?")) return;
    await adminApi.memberships.remove(id);
    load();
  };

  return (
    <AdminLayout
      title="Memberships"
      actions={
        <button
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Plan
        </button>
      }
    >
      {(creating || editing) && (
        <AdminCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              {editing ? `Edit Plan — ${editing.name}` : "Add Plan"}
            </h3>
            <button
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <PlanForm
            initial={editing ?? undefined}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((p) => (
          <AdminCard key={p.id} className="p-5 relative">
            {p.popular && (
              <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded bg-lime-500/20 text-lime-300 border border-lime-500/40">
                POPULAR
              </span>
            )}
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {p.billingPeriod}
            </div>
            <div className="mt-1 text-lg font-bold text-white">{p.name}</div>
            <div className="text-xs text-slate-400">{p.tagline}</div>
            <div className="mt-3 text-3xl font-extrabold text-white">
              ₹{p.priceInr.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-500 line-through">
              ₹{p.originalPriceInr.toLocaleString("en-IN")}
            </div>
            <InlinePrice plan={p} onSaved={load} />
            <div className="text-xs text-slate-400 mt-3 space-y-1">
              <div>{p.gymsIncluded} gyms included</div>
              <div>{p.classesPerMonth} classes/month</div>
              {p.perks?.length > 0 && (
                <div className="text-slate-500 line-clamp-2">
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
                className="flex-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => remove(p.id)}
                className="p-2 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminLayout>
  );
}
