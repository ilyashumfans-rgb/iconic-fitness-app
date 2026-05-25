import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { KeyRound, LogIn, Trash2, UserPlus, X } from "lucide-react";

export default function AdminPartners() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetting, setResetting] = useState<any | null>(null);
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setBusy(true);
    adminApi.partners
      .list()
      .then(setRows)
      .catch((e) => setErr(String(e)))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const updateStatus = async (id: number, status: string) => {
    await adminApi.partners.update(id, { status });
    load();
  };
  const remove = async (id: number) => {
    if (!confirm("Delete this partner?")) return;
    await adminApi.partners.remove(id);
    load();
  };
  const impersonate = async (p: any) => {
    setMsg(null);
    setErr(null);
    try {
      const r = await adminApi.partners.impersonate(p.id);
      // Open the partner portal in a new tab — admin stays signed in here.
      window.open(r.redirectTo, "_blank", "noopener");
      setMsg(`Signed in as ${p.name}. Opened partner portal in a new tab.`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };
  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setErr(null);
    try {
      await adminApi.partners.resetPassword(resetting.id, pwd);
      setMsg(`Password updated for ${resetting.name}.`);
      setResetting(null);
      setPwd("");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  return (
    <AdminLayout
      title="Partners"
      actions={
        <Link
          href="/admin/partner-onboarding"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Onboard Partner
        </Link>
      }
    >
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-4 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
          {msg}
        </div>
      )}

      {resetting && (
        <AdminCard className="p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">
              Reset password — {resetting.name}
            </h3>
            <button
              onClick={() => {
                setResetting(null);
                setPwd("");
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={submitReset} className="flex flex-col sm:flex-row gap-2">
            <input
              autoFocus
              type="text"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="New password (min 6 chars)"
              minLength={6}
              required
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
            <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold">
              Update password
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Share this password securely with the partner. They can change it
            from their settings after signing in.
          </p>
        </AdminCard>
      )}

      <AdminCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                  No partners yet. Use "Onboard Partner" to add one.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-b border-slate-800/60 hover:bg-slate-800/30"
              >
                <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                <td className="px-5 py-3 text-slate-300">{p.email}</td>
                <td className="px-5 py-3 text-slate-400">{p.phone}</td>
                <td className="px-5 py-3 text-slate-400">{p.city}</td>
                <td className="px-5 py-3">
                  <select
                    value={p.status}
                    onChange={(e) => updateStatus(p.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => impersonate(p)}
                    disabled={p.status === "suspended"}
                    title={
                      p.status === "suspended"
                        ? "Suspended partners cannot be signed in"
                        : "Sign in as this partner in a new tab"
                    }
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-500/15 text-purple-200 border border-purple-500/30 hover:bg-purple-500/25 mr-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <LogIn className="h-3.5 w-3.5" /> Sign in as
                  </button>
                  <button
                    onClick={() => {
                      setResetting(p);
                      setPwd("");
                      setMsg(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 mr-1"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Reset
                  </button>
                  <button
                    onClick={() => remove(p.id)}
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
      </AdminCard>
    </AdminLayout>
  );
}
