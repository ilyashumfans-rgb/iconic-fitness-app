import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Plus, Trash2, X, Users, ChevronDown, ChevronUp, Check } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

function GymForm({
  initial,
  partners,
  onSave,
  onCancel,
}: {
  initial?: any;
  partners: { id: number; name: string; email: string; status: string }[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    area: initial?.area ?? "",
    address: initial?.address ?? "",
    rating: initial?.rating ?? 4.5,
    heroImage:
      initial?.heroImage ??
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
    categories: (initial?.categories ?? ["gym"]).join(", "),
    amenities: (initial?.amenities ?? []).join(", "),
    about: initial?.about ?? "",
    hours: initial?.hours ?? "6am – 11pm",
    payoutPerVisitInr: initial?.payoutPerVisitInr ?? 100,
    payoutTaxPct: initial?.payoutTaxPct ?? 18,
    ownerPartnerId:
      initial?.ownerPartnerId === undefined || initial?.ownerPartnerId === null
        ? ""
        : String(initial.ownerPartnerId),
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...f,
        rating: Number(f.rating),
        payoutPerVisitInr: Number(f.payoutPerVisitInr),
        payoutTaxPct: Number(f.payoutTaxPct),
        ownerPartnerId: f.ownerPartnerId === "" ? null : Number(f.ownerPartnerId),
        categories: String(f.categories)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        amenities: String(f.amenities)
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
        <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
        <Input label="City" value={f.city} onChange={(v) => setF({ ...f, city: v })} required />
        <Input label="Area" value={f.area} onChange={(v) => setF({ ...f, area: v })} required />
        <Input label="Hours" value={f.hours} onChange={(v) => setF({ ...f, hours: v })} />
        <Input label="Rating" type="number" value={f.rating} onChange={(v) => setF({ ...f, rating: v as any })} />
        <Input label="Categories (comma)" value={f.categories} onChange={(v) => setF({ ...f, categories: v })} />
        <Input label="Amenities (comma)" value={f.amenities} onChange={(v) => setF({ ...f, amenities: v })} />
        <Input
          label="Partner Payout per Visit (₹, base)"
          type="number"
          value={f.payoutPerVisitInr}
          onChange={(v) => setF({ ...f, payoutPerVisitInr: v as any })}
        />
        <Input
          label="GST on Payout (%)"
          type="number"
          value={f.payoutTaxPct}
          onChange={(v) => setF({ ...f, payoutTaxPct: v as any })}
        />
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
            Owner partner
          </label>
          <select
            value={f.ownerPartnerId}
            onChange={(e) => setF({ ...f, ownerPartnerId: e.target.value })}
            className={inputCls}
          >
            <option value="">— Unassigned —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.email}){p.status !== "active" ? ` · ${p.status}` : ""}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-500 mt-1">
            The selected partner will see this gym in their Partner Portal under
            "My Gyms" and can manage bookings, check-ins, classes, and products
            for it.
          </div>
        </div>
        <div className="sm:col-span-2">
          <Input label="Address" value={f.address} onChange={(v) => setF({ ...f, address: v })} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Hero image URL" value={f.heroImage} onChange={(v) => setF({ ...f, heroImage: v })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">About</label>
          <textarea
            className={`${inputCls} h-20 resize-none`}
            value={f.about}
            onChange={(e) => setF({ ...f, about: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          disabled={busy}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold disabled:opacity-60"
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

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

export default function AdminGymManagement() {
  const [rows, setRows] = useState<any[]>([]);
  const [partners, setPartners] = useState<
    { id: number; name: string; email: string; status: string }[]
  >([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => adminApi.gyms.list().then(setRows).catch(() => {});
  useEffect(() => {
    load();
    adminApi.partners.list().then(setPartners).catch(() => {});
  }, []);

  const partnerName = (id: number | null | undefined) => {
    if (!id) return null;
    const p = partners.find((x) => x.id === id);
    return p ? p.name : `#${id}`;
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this gym?")) return;
    await adminApi.gyms.remove(id);
    load();
  };

  const [expandedPartner, setExpandedPartner] = useState<number | null>(null);
  const [assignBusy, setAssignBusy] = useState<number | null>(null);

  const toggleAssign = async (gym: any, partnerId: number) => {
    setAssignBusy(gym.id);
    try {
      const next = gym.ownerPartnerId === partnerId ? null : partnerId;
      await adminApi.gyms.update(gym.id, { ownerPartnerId: next });
      await load();
    } finally {
      setAssignBusy(null);
    }
  };

  const gymsForPartner = (pid: number) =>
    rows.filter((g) => g.ownerPartnerId === pid);

  return (
    <AdminLayout
      title="Gym Management"
      actions={
        <button
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Gym
        </button>
      }
    >
      {(creating || editing) && (
        <AdminCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              {editing ? `Edit Gym — ${editing.name}` : "Add Gym"}
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
          <GymForm
            initial={editing ?? undefined}
            partners={partners}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSave={async (body) => {
              if (editing) await adminApi.gyms.update(editing.id, body);
              else await adminApi.gyms.create(body);
              setCreating(false);
              setEditing(null);
              load();
            }}
          />
        </AdminCard>
      )}

      <AdminCard className="overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-white text-sm">Enrolled partners</h3>
          <span className="text-xs text-slate-500">
            {partners.length} total · click a partner to assign gyms
          </span>
        </div>
        {partners.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 text-center">
            No partners enrolled yet. Add one from the Partners page.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {partners.map((p) => {
              const owned = gymsForPartner(p.id);
              const open = expandedPartner === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedPartner(open ? null : p.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {p.name[0]?.toUpperCase() ?? "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {p.name}
                        {p.status !== "active" && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {p.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{p.email}</div>
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {owned.length} {owned.length === 1 ? "gym" : "gyms"} assigned
                    </div>
                    {open ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                  {open && (
                    <div className="px-5 pb-4 pt-1 bg-slate-900/40">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                        Tap a gym to assign or unassign it for this partner
                      </div>
                      {rows.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">
                          No gyms yet. Create one with "Add Gym" above.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {rows.map((g) => {
                            const isOwn = g.ownerPartnerId === p.id;
                            const otherOwner =
                              g.ownerPartnerId &&
                              g.ownerPartnerId !== p.id
                                ? partnerName(g.ownerPartnerId)
                                : null;
                            return (
                              <button
                                key={g.id}
                                type="button"
                                disabled={assignBusy === g.id}
                                onClick={() => toggleAssign(g, p.id)}
                                className={`text-left px-3 py-2 rounded-lg border text-xs flex items-start gap-2 transition ${
                                  isOwn
                                    ? "bg-orange-500/10 border-orange-500/40 text-orange-200"
                                    : "bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700"
                                } disabled:opacity-60`}
                              >
                                <div
                                  className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                    isOwn
                                      ? "bg-orange-500 border-orange-500"
                                      : "border-slate-600"
                                  }`}
                                >
                                  {isOwn && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{g.name}</div>
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {g.city} · {g.area}
                                  </div>
                                  {otherOwner && (
                                    <div className="text-[10px] text-amber-400/80 mt-0.5">
                                      currently owned by {otherOwner} — clicking
                                      will reassign
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">Area</th>
              <th className="px-5 py-3">Owner partner</th>
              <th className="px-5 py-3">Rating</th>
              <th className="px-5 py-3">Flags</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="px-5 py-3 font-medium text-white">{g.name}</td>
                <td className="px-5 py-3 text-slate-300">{g.city}</td>
                <td className="px-5 py-3 text-slate-400">{g.area}</td>
                <td className="px-5 py-3 text-slate-300">
                  {partnerName(g.ownerPartnerId) ?? (
                    <span className="text-slate-600 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-300">{g.rating}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    {g.featured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        Featured
                      </span>
                    )}
                    {g.isPremium && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Verified
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => {
                      setEditing(g);
                      setCreating(false);
                    }}
                    className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(g.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </AdminLayout>
  );
}
