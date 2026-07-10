import { useEffect, useMemo, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type YoactivBranchOption } from "@/lib/adminApi";
import { locationsApi, type City, type Area } from "@/lib/locationsApi";
import { Plus, Trash2, X, Users, ChevronDown, ChevronUp, Check } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

function GymForm({
  initial,
  partners,
  cities,
  areas,
  onSave,
  onCancel,
}: {
  initial?: any;
  partners: { id: number; name: string; email: string; status: string }[];
  cities: City[];
  areas: Area[];
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
    videoUrl: initial?.videoUrl ?? "",
    categories: (initial?.categories ?? ["gym"]).join(", "),
    amenities: (initial?.amenities ?? []).join(", "),
    about: initial?.about ?? "",
    hours: initial?.hours ?? "5am – 11pm",
    payoutPerVisitInr: initial?.payoutPerVisitInr ?? 100,
    payoutTaxPct: initial?.payoutTaxPct ?? 18,
    ownerPartnerId:
      initial?.ownerPartnerId === undefined || initial?.ownerPartnerId === null
        ? ""
        : String(initial.ownerPartnerId),
    yoactivBranchId:
      initial?.yoactivBranchId === undefined || initial?.yoactivBranchId === null
        ? ""
        : String(initial.yoactivBranchId),
  });
  const [busy, setBusy] = useState(false);
  const [yoactivBranches, setYoactivBranches] = useState<YoactivBranchOption[]>([]);

  useEffect(() => {
    adminApi.yoactiv
      .branches()
      .then(setYoactivBranches)
      .catch(() => setYoactivBranches([]));
  }, []);

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
        yoactivBranchId:
          f.yoactivBranchId.trim() === "" ? null : Number(f.yoactivBranchId),
        videoUrl: f.videoUrl.trim() === "" ? null : f.videoUrl.trim(),
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
        <CityAreaPicker
          cities={cities}
          areas={areas}
          city={f.city}
          area={f.area}
          onChange={(city, area) => setF({ ...f, city, area })}
        />
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
          {yoactivBranches.length > 0 ? (
            <>
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                YoActiv branch (for PT bookings & live trainers)
              </label>
              <select
                value={f.yoactivBranchId}
                onChange={(e) => setF({ ...f, yoactivBranchId: e.target.value })}
                className={inputCls}
              >
                <option value="">— Not connected —</option>
                {f.yoactivBranchId !== "" &&
                  !yoactivBranches.some(
                    (b) => String(b.branchId) === f.yoactivBranchId,
                  ) && (
                    <option value={f.yoactivBranchId}>
                      {f.yoactivBranchId} — (not in configured branch list)
                    </option>
                  )}
                {yoactivBranches.map((b) => (
                  <option key={b.branchId} value={String(b.branchId)}>
                    {b.branchId} — {b.branchName ?? "Unnamed branch"}
                    {b.gymLabel ? ` · mapped to ${b.gymLabel}` : ""}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <Input
              label="YoActiv branch ID (for PT bookings & live trainers)"
              value={f.yoactivBranchId}
              onChange={(v) => setF({ ...f, yoactivBranchId: v })}
            />
          )}
          <div className="text-[11px] text-slate-500 mt-1">
            The branch in the YoActiv gym-management system this gym maps to.
            Needed so members can see this branch's live trainer roster and pay
            for PT packages online. Leave as "Not connected" if not on YoActiv.
          </div>
        </div>
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
            "My Gyms" and can manage bookings, classes, and products
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
          <Input
            label="Hero video URL (optional — YouTube, Vimeo or .mp4)"
            value={f.videoUrl}
            onChange={(v) => setF({ ...f, videoUrl: v })}
          />
          <div className="text-[11px] text-slate-500 mt-1">
            If set, this video autoplays as the first slide of the gym's photo
            slider. Leave blank to show only photos.
          </div>
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

function CityAreaPicker({
  cities,
  areas,
  city,
  area,
  onChange,
}: {
  cities: City[];
  areas: Area[];
  city: string;
  area: string;
  onChange: (city: string, area: string) => void;
}) {
  const activeCities = useMemo(
    () => cities.filter((c) => c.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [cities],
  );
  const selectedCity = cities.find(
    (c) => c.name.toLowerCase() === city.toLowerCase(),
  );
  const areasForCity = useMemo(() => {
    if (!selectedCity) return [];
    return areas
      .filter((a) => a.cityId === selectedCity.id && a.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [areas, selectedCity]);

  return (
    <>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
          City
        </label>
        <select
          required
          value={selectedCity ? selectedCity.name : city ? "__custom" : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || v === "__custom") {
              onChange("", "");
            } else {
              onChange(v, "");
            }
          }}
          className={inputCls}
        >
          <option value="">— Select city —</option>
          {activeCities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
          {city && !selectedCity && (
            <option value="__custom">{city} (legacy)</option>
          )}
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
          Area
        </label>
        <select
          required
          value={area}
          disabled={!selectedCity}
          onChange={(e) => onChange(city, e.target.value)}
          className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <option value="">
            {selectedCity ? "— Select area —" : "Pick a city first"}
          </option>
          {areasForCity.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
          {area &&
            !areasForCity.some(
              (a) => a.name.toLowerCase() === area.toLowerCase(),
            ) && <option value={area}>{area} (legacy)</option>}
        </select>
        {selectedCity && areasForCity.length === 0 && (
          <div className="text-[11px] text-green-400/80 mt-1">
            No areas configured for {selectedCity.name}. Add them in Admin →
            Cities & Areas.
          </div>
        )}
      </div>
    </>
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
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [prefillOwnerPartnerId, setPrefillOwnerPartnerId] = useState<
    number | null
  >(null);

  const load = () => adminApi.gyms.list().then(setRows).catch(() => {});
  useEffect(() => {
    load();
    adminApi.partners.list().then(setPartners).catch(() => {});
    locationsApi.listCities().then(setCities).catch(() => {});
    locationsApi.listAreas().then(setAreas).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("ownerPartnerId");
    if (pid && /^\d+$/.test(pid)) {
      setPrefillOwnerPartnerId(Number(pid));
      setCreating(true);
      setEditing(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("ownerPartnerId");
      window.history.replaceState({}, "", url.toString());
    }
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-medium"
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
              {editing
                ? `Edit Gym — ${editing.name}`
                : prefillOwnerPartnerId
                  ? `Add gym branch — ${partnerName(prefillOwnerPartnerId) ?? `Partner #${prefillOwnerPartnerId}`}`
                  : "Add Gym"}
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
            initial={
              editing ??
              (prefillOwnerPartnerId
                ? { ownerPartnerId: prefillOwnerPartnerId }
                : undefined)
            }
            partners={partners}
            cities={cities}
            areas={areas}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
              setPrefillOwnerPartnerId(null);
            }}
            onSave={async (body) => {
              if (editing) await adminApi.gyms.update(editing.id, body);
              else await adminApi.gyms.create(body);
              setCreating(false);
              setEditing(null);
              setPrefillOwnerPartnerId(null);
              load();
            }}
          />
        </AdminCard>
      )}

      <AdminCard className="overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
          <Users className="h-4 w-4 text-lime-500" />
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
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-lime-500 to-green-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {p.name[0]?.toUpperCase() ?? "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {p.name}
                        {p.status !== "active" && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30">
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
                                    ? "bg-lime-500/10 border-lime-500/40 text-lime-200"
                                    : "bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700"
                                } disabled:opacity-60`}
                              >
                                <div
                                  className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                    isOwn
                                      ? "bg-lime-500 border-lime-500"
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
                                    <div className="text-[10px] text-green-400/80 mt-0.5">
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
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-500/15 text-lime-400 border border-lime-500/30">
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
        </table></div>
      </AdminCard>
    </AdminLayout>
  );
}
