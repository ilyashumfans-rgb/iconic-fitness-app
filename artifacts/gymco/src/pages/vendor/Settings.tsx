import { useEffect, useState } from "react";
import { VendorLayout, VendorCard } from "@/components/vendor/VendorLayout";
import { vendorApi, type Vendor } from "@/lib/vendorApi";
import { KeyRound, Store } from "lucide-react";

const INPUT =
  "w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

export default function VendorSettings() {
  const [me, setMe] = useState<Vendor | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    vendorApi.me().then(setMe).catch(() => setMe(null));
  }, []);

  const changePw = async () => {
    setPwBusy(true);
    setMsg(null);
    try {
      await vendorApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMsg({ kind: "ok", text: "Password updated." });
    } catch (e) {
      setMsg({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not update password.",
      });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <VendorLayout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        <VendorCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-orange-600" />
            <div className="text-base font-bold">Vendor profile</div>
          </div>
          {me ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                  Business name
                </dt>
                <dd className="text-slate-900 font-semibold">{me.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                  Email
                </dt>
                <dd className="text-slate-700">{me.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                  Phone
                </dt>
                <dd className="text-slate-700">{me.phone}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                  City
                </dt>
                <dd className="text-slate-700">{me.city}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                  Account type
                </dt>
                <dd className="text-slate-700 capitalize">{me.kind}</dd>
              </div>
              <div className="pt-3 border-t border-orange-100 text-xs text-slate-500">
                To update your business details, contact your GYMCO account
                manager.
              </div>
            </dl>
          ) : (
            <div className="text-sm text-slate-500">Loading…</div>
          )}
        </VendorCard>

        <VendorCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-5 w-5 text-orange-600" />
            <div className="text-base font-bold">Change password</div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 font-bold block mb-1.5">
                Current password
              </label>
              <input
                type="password"
                className={INPUT}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 font-bold block mb-1.5">
                New password
              </label>
              <input
                type="password"
                className={INPUT}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            {msg && (
              <div
                className={`text-sm rounded-lg p-3 border ${
                  msg.kind === "ok"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}
              >
                {msg.text}
              </div>
            )}
            <button
              onClick={changePw}
              disabled={
                pwBusy || !currentPassword || newPassword.length < 6
              }
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/20 disabled:opacity-60"
            >
              {pwBusy ? "Updating…" : "Update password"}
            </button>
          </div>
        </VendorCard>
      </div>
    </VendorLayout>
  );
}
