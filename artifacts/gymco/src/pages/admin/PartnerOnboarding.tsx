import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";

export default function AdminPartnerOnboarding() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminApi.partners.create(form);
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

  return (
    <AdminLayout title="Partner Onboarding">
      <AdminCard className="p-6 max-w-2xl">
        <p className="text-sm text-slate-400 mb-6">
          Create a new partner gym account. They'll be able to log in to a
          partner dashboard with the credentials below.
        </p>
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
            {busy ? "Creating…" : "Create Partner"}
          </button>
        </form>
      </AdminCard>
    </AdminLayout>
  );
}
