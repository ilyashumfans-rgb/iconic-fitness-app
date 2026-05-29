import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import {
  partnerApi,
  type Partner,
  type PartnerStaff,
  PARTNER_STAFF_PERMISSIONS,
  PARTNER_STAFF_PERMISSION_LABELS,
} from "@/lib/partnerApi";
import {
  Loader2,
  UserPlus,
  Users,
  KeyRound,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react";

type Msg = { type: "ok" | "err"; text: string } | null;

export default function PartnerTeam() {
  const [, navigate] = useLocation();
  const [loadingMe, setLoadingMe] = useState(true);
  const [staff, setStaff] = useState<PartnerStaff[]>([]);
  const [listMsg, setListMsg] = useState<Msg>(null);

  // Create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [createMsg, setCreateMsg] = useState<Msg>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    partnerApi
      .me()
      .then((p: Partner) => {
        // Team members cannot manage the team — bounce them to the dashboard.
        if (p.isStaff) {
          navigate("/partner");
          return;
        }
        setLoadingMe(false);
      })
      .catch(() => navigate("/partner/login"));
  }, [navigate]);

  const loadStaff = () => {
    partnerApi.staff
      .list()
      .then(setStaff)
      .catch((e) =>
        setListMsg({ type: "err", text: e?.message ?? "Failed to load team" }),
      );
  };

  useEffect(() => {
    if (!loadingMe) loadStaff();
  }, [loadingMe]);

  const togglePerm = (perm: string) => {
    setPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    if (!name.trim() || !email.trim() || password.length < 6) {
      setCreateMsg({
        type: "err",
        text: "Enter a name, email and a password of at least 6 characters.",
      });
      return;
    }
    setCreating(true);
    try {
      await partnerApi.staff.create({
        name: name.trim(),
        email: email.trim(),
        password,
        permissions: perms,
      });
      setCreateMsg({ type: "ok", text: "Team login created." });
      setName("");
      setEmail("");
      setPassword("");
      setPerms([]);
      loadStaff();
    } catch (err) {
      setCreateMsg({
        type: "err",
        text: (err as Error)?.message ?? "Could not create login",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loadingMe) {
    return (
      <PartnerLayout title="Team">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout title="Team">
      <div className="max-w-4xl space-y-6">
        <PartnerCard className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Create a team login
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Give your own staff or branch members a sign-in for the partner
            portal. They use the same login page and only see the sections you
            allow.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Front desk"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="staff@yourgym.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                What can they access?
              </div>
              <div className="flex flex-wrap gap-2">
                {PARTNER_STAFF_PERMISSIONS.map((perm) => {
                  const on = perms.includes(perm);
                  return (
                    <button
                      type="button"
                      key={perm}
                      onClick={() => togglePerm(perm)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                        on
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-white border-orange-200 text-slate-600 hover:border-orange-400"
                      }`}
                    >
                      {on ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      {PARTNER_STAFF_PERMISSION_LABELS[perm] ?? perm}
                    </button>
                  );
                })}
              </div>
            </div>

            {createMsg && (
              <div
                className={`text-sm font-medium ${
                  createMsg.type === "ok" ? "text-green-600" : "text-red-600"
                }`}
              >
                {createMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/30 disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create login
            </button>
          </form>
        </PartnerCard>

        <PartnerCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-900">Your team</h2>
          </div>
          {listMsg && listMsg.type === "err" && (
            <div className="text-sm font-medium text-red-600 mb-3">
              {listMsg.text}
            </div>
          )}
          {staff.length === 0 ? (
            <p className="text-sm text-slate-500">
              No team logins yet. Create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <StaffRow key={s.id} member={s} onChanged={loadStaff} />
              ))}
            </div>
          )}
        </PartnerCard>
      </div>
    </PartnerLayout>
  );
}

function StaffRow({
  member,
  onChanged,
}: {
  member: PartnerStaff;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [perms, setPerms] = useState<string[]>(member.permissions);
  const [rowMsg, setRowMsg] = useState<Msg>(null);

  const togglePerm = (perm: string) => {
    setPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const savePerms = async () => {
    setBusy(true);
    setRowMsg(null);
    try {
      await partnerApi.staff.update(member.id, { permissions: perms });
      setRowMsg({ type: "ok", text: "Saved" });
      setEditing(false);
      onChanged();
    } catch (e) {
      setRowMsg({ type: "err", text: (e as Error)?.message ?? "Failed" });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await partnerApi.staff.update(member.id, { isActive: !member.isActive });
      onChanged();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const pw = window.prompt(
      `Set a new password for ${member.name} (at least 6 characters):`,
    );
    if (!pw) return;
    if (pw.length < 6) {
      setRowMsg({ type: "err", text: "Password must be 6+ characters." });
      return;
    }
    setBusy(true);
    try {
      await partnerApi.staff.resetPassword(member.id, pw);
      setRowMsg({ type: "ok", text: "Password updated" });
    } catch (e) {
      setRowMsg({ type: "err", text: (e as Error)?.message ?? "Failed" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${member.name}'s login? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await partnerApi.staff.remove(member.id);
      onChanged();
    } catch (e) {
      setRowMsg({ type: "err", text: (e as Error)?.message ?? "Failed" });
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-orange-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{member.name}</span>
            {member.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                <XCircle className="h-3 w-3" /> Disabled
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 truncate">{member.email}</div>
          {!editing && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {member.permissions.length === 0 ? (
                <span className="text-xs text-slate-400">No sections</span>
              ) : (
                member.permissions.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700"
                  >
                    {PARTNER_STAFF_PERMISSION_LABELS[p] ?? p}
                  </span>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPerms(member.permissions);
              setEditing((v) => !v);
            }}
            disabled={busy}
            className="rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-orange-400"
          >
            {editing ? "Cancel" : "Edit access"}
          </button>
          <button
            onClick={toggleActive}
            disabled={busy}
            className="rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-orange-400"
          >
            {member.isActive ? "Disable" : "Enable"}
          </button>
          <button
            onClick={resetPassword}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-orange-400"
          >
            <KeyRound className="h-3.5 w-3.5" /> Password
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 border-t border-orange-100 pt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Sections this person can access
          </div>
          <div className="flex flex-wrap gap-2">
            {PARTNER_STAFF_PERMISSIONS.map((perm) => {
              const on = perms.includes(perm);
              return (
                <button
                  type="button"
                  key={perm}
                  onClick={() => togglePerm(perm)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                    on
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-white border-orange-200 text-slate-600 hover:border-orange-400"
                  }`}
                >
                  {on ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {PARTNER_STAFF_PERMISSION_LABELS[perm] ?? perm}
                </button>
              );
            })}
          </div>
          <button
            onClick={savePerms}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save access
          </button>
        </div>
      )}

      {rowMsg && (
        <div
          className={`mt-2 text-xs font-medium ${
            rowMsg.type === "ok" ? "text-green-600" : "text-red-600"
          }`}
        >
          {rowMsg.text}
        </div>
      )}
    </div>
  );
}
