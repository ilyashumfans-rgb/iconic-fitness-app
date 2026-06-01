import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import {
  StaffLayout,
  StaffCard,
  PermissionGate,
} from "@/components/staff/StaffLayout";
import { staffApi } from "@/lib/staffApi";
import { locationsApi, type City } from "@/lib/locationsApi";

type Amenity = {
  id: number;
  name: string;
  isActive: boolean;
};

function Form() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const dupKind = params.get("kind");
  const [form, setForm] = useState({
    name: params.get("name") ?? "",
    email: "",
    phone: params.get("phone") ?? "",
    city: params.get("city") ?? "",
    password: "",
    notes: params.get("notes") ?? "",
    kind: (dupKind === "vendor" || dupKind === "both" ? dupKind : "gym") as
      | "gym"
      | "vendor"
      | "both",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    staffApi
      .amenities()
      .then((list) => {
        const active = (list as Amenity[]).filter((a) => a.isActive);
        setAmenities(active);
      })
      .catch(() => {});
    locationsApi
      .listCities()
      .then((list) => {
        const active = list.filter((c) => c.isActive);
        setCities(active);
        setForm((prev) => {
          if (prev.city && active.some((c) => c.name === prev.city)) {
            return prev;
          }
          const def = active.find((c) => c.isDefault) ?? active[0];
          return { ...prev, city: def ? def.name : "" };
        });
      })
      .catch(() => {});
  }, []);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await staffApi.partners.create({
        ...form,
        amenityIds: Array.from(selectedIds),
      });
      setOk(true);
      setTimeout(() => navigate("/staff/partners"), 800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60";
  const showAmenities = form.kind === "gym" || form.kind === "both";

  return (
    <StaffLayout title="Partner Onboarding">
      <StaffCard className="p-6 max-w-3xl">
        <p className="text-sm text-slate-500 mb-6">
          Create a new partner gym account. They'll be able to log in to the
          partner dashboard with the credentials below.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5">
                Studio Name
              </label>
              <input
                required
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="GoldFit Indiranagar"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5">
                Email
              </label>
              <input
                required
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="owner@goldfit.in"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5">
                Phone
              </label>
              <input
                required
                className={inputCls}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 90000 00000"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5">
                City
              </label>
              <select
                required
                className={inputCls}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              >
                <option value="" disabled>
                  Select a city
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {cities.length === 0 && (
                <p className="text-xs text-amber-500 mt-1.5">
                  No cities available yet. Ask an admin to add one under
                  Locations first.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5">
                Account type
              </label>
              <select
                className={inputCls}
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value as "gym" | "vendor" | "both",
                  })
                }
              >
                <option value="gym">Gym partner (partner portal only)</option>
                <option value="vendor">Store vendor (vendor portal only)</option>
                <option value="both">Both — gym partner + store vendor</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5">
                Initial Password
              </label>
              <input
                required
                minLength={6}
                type="text"
                className={inputCls}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="At least 6 characters"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5">
                Notes
              </label>
              <textarea
                className={`${inputCls} h-24 resize-none`}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Equipment available, contract details…"
              />
            </div>
          </div>

          {showAmenities && amenities.length > 0 && (
            <div className="rounded-2xl border border-slate-300 bg-white/40 p-5">
              <div className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-3">
                Gym Amenities
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Select amenities to pre-apply to the first gym this partner
                creates.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {amenities.map((a) => {
                  const active = selectedIds.has(a.id);
                  return (
                    <label
                      key={a.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                        active
                          ? "bg-gradient-to-r from-orange-500/15 to-orange-600/10 border-orange-500/60"
                          : "bg-white border-slate-300 hover:border-orange-500/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggle(a.id)}
                        className="rounded border-slate-300 bg-white text-orange-500 focus:ring-orange-500/60"
                      />
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {a.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {err && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {err}
            </div>
          )}
          {ok && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              Partner created. Redirecting…
            </div>
          )}

          <button
            disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create Partner"}
          </button>
        </form>
      </StaffCard>
    </StaffLayout>
  );
}

export default function StaffPartnerOnboarding() {
  return (
    <PermissionGate perm="partner.onboard">
      <Form />
    </PermissionGate>
  );
}
