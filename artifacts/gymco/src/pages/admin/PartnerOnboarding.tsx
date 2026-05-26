import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import * as LucideIcons from "lucide-react";
import { Dot, Sparkles, Building2, ArrowRight } from "lucide-react";

type ExistingPartner = {
  id: number;
  name: string;
  email: string;
  city?: string | null;
  phone?: string | null;
};

type Amenity = {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
};

function AmenityIcon({
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

export default function AdminPartnerOnboarding() {
  const [, navigate] = useLocation();
  const initialForm = useMemo(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const rawKind = params.get("kind");
    const kind: "gym" | "vendor" | "both" =
      rawKind === "vendor" || rawKind === "both" ? rawKind : "gym";
    return {
      name: params.get("name") ?? "",
      email: "",
      phone: params.get("phone") ?? "",
      city: params.get("city") ?? "",
      password: "",
      notes: params.get("notes") ?? "",
      kind,
    };
  }, []);
  const duplicatedFromName = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("duplicateOf")) return null;
    const n = params.get("name") ?? "";
    return n.replace(/\s*\(copy\)\s*$/, "") || null;
  }, []);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [partners, setPartners] = useState<ExistingPartner[]>([]);

  useEffect(() => {
    adminApi.amenities
      .list()
      .then((list) => {
        const active = (list as Amenity[]).filter((a) => a.isActive);
        setAmenities(active);
        setSelectedIds(new Set(active.map((a) => a.id)));
      })
      .catch(() => {
        // soft-fail: form still works without amenities
      });
    adminApi.partners
      .list()
      .then((list) => setPartners(list as ExistingPartner[]))
      .catch(() => {});
  }, []);

  const existingPartner = useMemo<ExistingPartner | null>(() => {
    const e = form.email.trim().toLowerCase();
    if (!e) return null;
    return partners.find((p) => p.email.toLowerCase() === e) ?? null;
  }, [form.email, partners]);

  const phoneMatchesExisting = useMemo(() => {
    if (!existingPartner) return false;
    const normalize = (s: string | null | undefined) =>
      (s ?? "").replace(/\D+/g, "");
    return (
      normalize(form.phone) !== "" &&
      normalize(form.phone) === normalize(existingPartner.phone)
    );
  }, [existingPartner, form.phone]);

  const verifiedSamePartner = !!existingPartner && phoneMatchesExisting;

  const toggleAmenity = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (existingPartner) {
      navigate(`/admin/gyms?ownerPartnerId=${existingPartner.id}`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await adminApi.partners.create({
        ...form,
        amenityIds: Array.from(selectedIds),
      });
      setOk(true);
      setTimeout(() => navigate("/admin/partners"), 700);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

  const showAmenitiesSection =
    form.kind === "gym" || form.kind === "both";

  return (
    <AdminLayout title="Partner Onboarding">
      <AdminCard className="p-6 max-w-3xl">
        <p className="text-sm text-slate-400 mb-4">
          Create a new partner gym account. They'll be able to log in to a
          partner dashboard with the credentials below.
        </p>
        {duplicatedFromName && (
          <div className="mb-6 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
            Duplicated from{" "}
            <span className="font-semibold text-white">
              {duplicatedFromName}
            </span>
            . Enter a new email and password — everything else is pre-filled
            and editable.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                Partner Name
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
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
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
              <div className="text-[11px] text-slate-500 mt-1">
                One email = multiple partner logins allowed. The same partner
                can own many gym branches.
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
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
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                City
              </label>
              <input
                required
                className={inputCls}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Bengaluru"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
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
                <option value="vendor">
                  Store vendor (vendor portal only)
                </option>
                <option value="both">
                  Both — gym partner + store vendor
                </option>
              </select>
              <div className="text-[11px] text-slate-500 mt-1">
                Vendors sign in at <code>/vendor/login</code> to manage store
                products, stock and bills. Gym partners sign in at{" "}
                <code>/partner/login</code>.
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                Initial Password
                {verifiedSamePartner && (
                  <span className="ml-2 text-emerald-300 normal-case tracking-normal">
                    not needed — existing login will be reused
                  </span>
                )}
              </label>
              <input
                required={!verifiedSamePartner}
                minLength={verifiedSamePartner ? 0 : 6}
                disabled={verifiedSamePartner}
                type="text"
                className={`${inputCls} ${verifiedSamePartner ? "opacity-50 cursor-not-allowed" : ""}`}
                value={verifiedSamePartner ? "" : form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="At least 6 characters"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
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

          {showAmenitiesSection && (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">
                  Gym Amenities
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Select the amenities this partner's gyms will offer. They will
                be pre-applied to the first gym this partner creates.
              </p>
              {amenities.length === 0 ? (
                <div className="text-xs text-slate-500">
                  No active amenities in the catalog yet. Add some in{" "}
                  <code>/admin/amenities</code>.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {amenities.map((a) => {
                    const active = selectedIds.has(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                          active
                            ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-orange-500/60"
                            : "bg-slate-800 border-slate-700 hover:border-orange-500/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleAmenity(a.id)}
                          className="rounded border-slate-600 bg-slate-900 text-orange-500 focus:ring-orange-500/60"
                        />
                        <span
                          className={`h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 ${
                            active
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-slate-700/60 text-slate-300"
                          }`}
                        >
                          <AmenityIcon name={a.icon} className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-slate-100 truncate">
                          {a.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {amenities.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    {selectedIds.size} of {amenities.length} selected
                    {selectedIds.size === amenities.length
                      ? " (all)"
                      : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIds(new Set(amenities.map((a) => a.id)))
                      }
                      className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {existingPartner && verifiedSamePartner && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-3">
              <Building2 className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-emerald-200">
                  Verified branch of{" "}
                  <span className="text-white">{existingPartner.name}</span>
                </div>
                <div className="text-xs text-emerald-200/80 mt-1">
                  Email and mobile number both match an existing partner —
                  this is the same brand. You can add as many gym branches as
                  you like under this single partner login.
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/admin/gyms?ownerPartnerId=${existingPartner.id}`,
                    )
                  }
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-semibold"
                >
                  Add another branch to {existingPartner.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          {existingPartner && !verifiedSamePartner && (
            <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3">
              <Building2 className="h-5 w-5 text-orange-300 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-orange-200">
                  This email already belongs to{" "}
                  <span className="text-white">{existingPartner.name}</span>
                </div>
                <div className="text-xs text-orange-200/80 mt-1">
                  One email = one partner login. To confirm this is the same
                  brand, also enter their registered mobile number{" "}
                  <span className="text-orange-100 font-mono">
                    {existingPartner.phone}
                  </span>
                  . Or open another branch under this partner directly:
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/admin/gyms?ownerPartnerId=${existingPartner.id}`,
                    )
                  }
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-xs font-semibold"
                >
                  Add a gym branch to {existingPartner.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {err && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {err}
            </div>
          )}
          {ok && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              Partner created. Redirecting…
            </div>
          )}

          <button
            disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {busy
              ? "Creating…"
              : verifiedSamePartner
                ? "Add another branch to this partner"
                : existingPartner
                  ? "Add gym branch to this partner"
                  : "Create Partner"}
          </button>
        </form>
      </AdminCard>
    </AdminLayout>
  );
}
