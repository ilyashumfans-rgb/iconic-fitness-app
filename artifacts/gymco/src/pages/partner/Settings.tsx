import { useEffect, useState, type FormEvent } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type Partner } from "@/lib/partnerApi";
import { Loader2, Save, KeyRound, UserCog } from "lucide-react";

export default function PartnerSettings() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [profileMsg, setProfileMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    partnerApi.me().then((p) => {
      setPartner(p);
      setName(p.name);
      setPhone(p.phone);
      setCity(p.city);
    });
  }, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const updated = await partnerApi.updateMe({ name, phone, city });
      setPartner(updated);
      setProfileMsg({ type: "ok", text: "Profile updated." });
    } catch (e) {
      setProfileMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Update failed",
      });
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "New passwords don't match." });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: "err", text: "New password must be at least 6 characters." });
      return;
    }
    setPwBusy(true);
    try {
      await partnerApi.changePassword(currentPassword, newPassword);
      setPwMsg({ type: "ok", text: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPwMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Change failed",
      });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <PartnerLayout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PartnerCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCog className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Account profile</h2>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Business / partner name" value={name} onChange={setName} />
            <Field
              label="Email (read-only)"
              value={partner?.email ?? ""}
              onChange={() => {}}
              disabled
            />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Primary city" value={city} onChange={setCity} />
            {profileMsg && (
              <Msg type={profileMsg.type} text={profileMsg.text} />
            )}
            <button
              type="submit"
              disabled={profileBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 text-white text-sm font-semibold disabled:opacity-60"
            >
              {profileBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save profile
            </button>
          </form>
        </PartnerCard>

        <PartnerCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">
              Change password
            </h2>
          </div>
          <form onSubmit={changePassword} className="space-y-4">
            <Field
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <Field
              label="New password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <Field
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            {pwMsg && <Msg type={pwMsg.type} text={pwMsg.text} />}
            <button
              type="submit"
              disabled={pwBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 text-white text-sm font-semibold disabled:opacity-60"
            >
              {pwBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Update password
            </button>
          </form>
        </PartnerCard>
      </div>
    </PartnerLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 ${
          disabled
            ? "bg-slate-800/40 border-slate-800 text-slate-500"
            : "bg-slate-800 border-slate-700 text-white"
        }`}
      />
    </div>
  );
}

function Msg({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div
      className={`text-sm rounded-lg p-3 border ${
        type === "ok"
          ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
          : "text-red-300 bg-red-500/10 border-red-500/30"
      }`}
    >
      {text}
    </div>
  );
}
