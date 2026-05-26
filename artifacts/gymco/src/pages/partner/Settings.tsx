import { useEffect, useState, type FormEvent } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type Partner } from "@/lib/partnerApi";
import FileUpload from "@/components/FileUpload";
import {
  Loader2,
  Save,
  KeyRound,
  UserCog,
  FileText,
  Trash2,
  ExternalLink,
} from "lucide-react";

type PartnerDoc = {
  id: number;
  name: string;
  url: string;
  notes: string;
  uploadedAt: string;
  uploadedByKind: string;
};

export default function PartnerSettings() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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

  const [docs, setDocs] = useState<PartnerDoc[]>([]);
  const [docName, setDocName] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docMsg, setDocMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    partnerApi.me().then((p) => {
      setPartner(p);
      setName(p.name);
      setPhone(p.phone);
      setCity(p.city);
      setAvatarUrl(p.avatarUrl ?? "");
    });
    partnerApi.documents.list().then(setDocs).catch(() => {});
  }, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const updated = await partnerApi.updateMe({
        name,
        phone,
        city,
        avatarUrl,
      });
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

  const uploadDoc = async (urls: string[]) => {
    const url = urls[0];
    if (!url) return;
    const finalName = docName.trim() || "Document";
    setDocMsg(null);
    try {
      await partnerApi.documents.create({
        name: finalName,
        url,
        notes: docNotes.trim(),
      });
      const list = await partnerApi.documents.list();
      setDocs(list);
      setDocName("");
      setDocNotes("");
      setDocMsg({ type: "ok", text: `Uploaded "${finalName}".` });
    } catch (e) {
      setDocMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Upload failed",
      });
    }
  };

  const removeDoc = async (id: number) => {
    if (!confirm("Remove this document?")) return;
    await partnerApi.documents.remove(id);
    setDocs((ds) => ds.filter((d) => d.id !== id));
  };

  return (
    <PartnerLayout title="Profile & Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PartnerCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCog className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-white">Account profile</h2>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 overflow-hidden flex items-center justify-center text-white text-2xl font-extrabold shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (name?.[0] ?? "P").toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400 font-medium block">
                  Profile picture
                </label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Upload a photo or paste a URL"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
                <FileUpload
                  label="Upload photo"
                  onUploaded={(urls) => urls[0] && setAvatarUrl(urls[0])}
                />
              </div>
            </div>
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold disabled:opacity-60"
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
            <KeyRound className="h-5 w-5 text-orange-600" />
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold disabled:opacity-60"
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

        <PartnerCard className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-white">
              Business documents
            </h2>
          </div>
          <div className="text-xs text-slate-400 mb-4">
            Upload PAN, GST certificate, partner agreement, bank proof, or any
            other KYC document. Files are stored securely and visible to GYMCO
            staff for verification.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Document name (e.g. PAN card)"
              className="sm:col-span-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
            <input
              value={docNotes}
              onChange={(e) => setDocNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
          </div>
          <FileUpload
            label="Upload document"
            accept="image/*,application/pdf"
            onUploaded={uploadDoc}
          />
          {docMsg && (
            <div className="mt-3">
              <Msg type={docMsg.type} text={docMsg.text} />
            </div>
          )}

          <div className="mt-5">
            {docs.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6 rounded-xl border border-dashed border-slate-800">
                No documents uploaded yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 p-3 bg-slate-900/40"
                  >
                    <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {d.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(d.uploadedAt).toLocaleString("en-IN")} •
                        uploaded by {d.uploadedByKind}
                      </div>
                      {d.notes && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {d.notes}
                        </div>
                      )}
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-md hover:bg-slate-800 text-slate-300"
                      title="Open"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDoc(d.id)}
                      className="p-2 rounded-md hover:bg-slate-800 text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 ${
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
