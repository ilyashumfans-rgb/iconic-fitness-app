import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";

export default function AdminResetPartnerPassword() {
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState<number | "">("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.partners.list().then(setPartners).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.partners.resetPassword(Number(partnerId), pwd);
      setMsg({ kind: "ok", text: "Password updated successfully." });
      setPwd("");
    } catch (e) {
      setMsg({
        kind: "err",
        text: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

  return (
    <AdminLayout title="Reset Partner Password">
      <AdminCard className="p-6 max-w-xl">
        <p className="text-sm text-slate-400 mb-6">
          Select a partner and set a new password. They'll be required to use
          this on their next login.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Partner
            </label>
            <select
              required
              value={partnerId}
              onChange={(e) =>
                setPartnerId(e.target.value ? Number(e.target.value) : "")
              }
              className={inputCls}
            >
              <option value="">Select a partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              New Password
            </label>
            <input
              required
              minLength={6}
              type="text"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className={inputCls}
              placeholder="At least 6 characters"
            />
          </div>

          {msg && (
            <div
              className={`text-sm rounded-lg p-3 border ${
                msg.kind === "ok"
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                  : "text-red-400 bg-red-500/10 border-red-500/30"
              }`}
            >
              {msg.text}
            </div>
          )}

          <button
            disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white font-semibold disabled:opacity-60"
          >
            {busy ? "Updating…" : "Reset Password"}
          </button>
        </form>
      </AdminCard>
    </AdminLayout>
  );
}
