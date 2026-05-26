import { useEffect, useState, type FormEvent } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type AdminUser } from "@/lib/adminApi";
import { KeyRound, Trash2, UserPlus, Shield, ShieldCheck } from "lucide-react";

type Admin = {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

function CreateAdminForm({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "superadmin",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminApi.admins.create(f);
      setOk(true);
      setF({ name: "", email: "", password: "", role: "admin" });
      onCreated();
      setTimeout(() => setOk(false), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-orange-400" />
        <h2 className="text-lg font-bold text-white">Create Admin</h2>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Name
            </label>
            <input
              required
              className={inputCls}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Ilyas Khan"
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
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="name@gymco.in"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Initial Password
            </label>
            <input
              required
              minLength={6}
              type="text"
              className={inputCls}
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Role
            </label>
            <select
              className={inputCls}
              value={f.role}
              onChange={(e) =>
                setF({ ...f, role: e.target.value as "admin" | "superadmin" })
              }
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
        </div>
        {err && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {err}
          </div>
        )}
        {ok && (
          <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            Admin created. They can now sign in at /admin/login.
          </div>
        )}
        <button
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Admin"}
        </button>
      </form>
    </AdminCard>
  );
}

function AdminRow({
  row,
  meId,
  isSuper,
  onChanged,
}: {
  row: Admin;
  meId: number | null;
  isSuper: boolean;
  onChanged: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSelf = meId === row.id;

  const toggleRole = async () => {
    const next = row.role === "superadmin" ? "admin" : "superadmin";
    setBusy(true);
    setErr(null);
    try {
      await adminApi.admins.updateRole(row.id, next);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const resetPwd = async () => {
    if (newPwd.length < 6) return;
    setBusy(true);
    setErr(null);
    try {
      await adminApi.admins.resetPassword(row.id, newPwd);
      setNewPwd("");
      setResetting(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete admin "${row.name}" (${row.email})?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await adminApi.admins.remove(row.id);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-800/60 align-top">
      <td className="px-5 py-4">
        <div className="font-medium text-white">
          {row.name}
          {isSelf && (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-orange-300 bg-orange-500/15 border border-orange-500/30 rounded px-1.5 py-0.5">
              You
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-1">{row.email}</div>
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border ${
            row.role === "superadmin"
              ? "bg-orange-500/15 text-orange-300 border-orange-500/40"
              : "bg-slate-700/40 text-slate-300 border-slate-600/40"
          }`}
        >
          {row.role === "superadmin" ? (
            <ShieldCheck className="h-3 w-3" />
          ) : (
            <Shield className="h-3 w-3" />
          )}
          {row.role === "superadmin" ? "Superadmin" : "Admin"}
        </span>
      </td>
      <td className="px-5 py-4 text-xs text-slate-400">
        {new Date(row.createdAt).toLocaleDateString()}
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col gap-2">
          {isSuper && (
            <button
              onClick={toggleRole}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded bg-slate-700/60 text-slate-200 border border-slate-600/60 hover:border-orange-500/40 inline-flex items-center gap-1 w-fit disabled:opacity-60"
            >
              {row.role === "superadmin" ? (
                <>
                  <Shield className="h-3 w-3" /> Make Admin
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3 w-3" /> Make Superadmin
                </>
              )}
            </button>
          )}
          {isSuper && resetting ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="New password"
                className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white w-32"
              />
              <button
                onClick={resetPwd}
                disabled={busy || newPwd.length < 6}
                className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 disabled:opacity-40"
              >
                Set
              </button>
              <button
                onClick={() => {
                  setResetting(false);
                  setNewPwd("");
                }}
                className="text-xs px-2 py-1 rounded bg-slate-700/40 text-slate-300 border border-slate-600/40"
              >
                Cancel
              </button>
            </div>
          ) : (
            isSuper && (
              <button
                onClick={() => setResetting(true)}
                className="text-xs px-3 py-1.5 rounded bg-slate-700/60 text-slate-200 border border-slate-600/60 hover:border-orange-500/40 inline-flex items-center gap-1 w-fit"
              >
                <KeyRound className="h-3 w-3" /> Reset Password
              </button>
            )
          )}
          {isSuper && !isSelf && (
            <button
              onClick={remove}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 inline-flex items-center gap-1 w-fit disabled:opacity-60"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
          {err && (
            <div className="text-xs text-red-400">{err}</div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsers() {
  const [rows, setRows] = useState<Admin[]>([]);
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [data, who] = await Promise.all([
        adminApi.admins.list(),
        adminApi.me(),
      ]);
      setRows(data);
      setMe(who);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const isSuper = me?.role === "superadmin";

  return (
    <AdminLayout title="Admin Users">
      <div className="space-y-6">
        {!isSuper && me && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-300">
            You are signed in as <strong>{me.role}</strong>. Only superadmins
            can create new admins or change roles.
          </div>
        )}
        {isSuper && <CreateAdminForm onCreated={load} />}

        <AdminCard className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              All Admins
            </h2>
            <span className="text-xs text-slate-500">{rows.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  <th className="px-5 py-3">Name / Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      No admins yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <AdminRow
                      key={r.id}
                      row={r}
                      meId={me?.id ?? null}
                      isSuper={isSuper}
                      onChanged={load}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
