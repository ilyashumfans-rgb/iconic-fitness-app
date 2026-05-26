import { useEffect, useState, type FormEvent } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { PERMISSION_LABELS } from "@/lib/staffApi";
import { KeyRound, Trash2, UserPlus } from "lucide-react";

type Staff = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
};

const ALL_PERMS = [
  "partner.onboard",
  "partner.view",
  "partner.document_upload",
  "partner.assign_login",
];

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

function PermissionCheckboxes({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (p: string) => {
    if (value.includes(p)) onChange(value.filter((x) => x !== p));
    else onChange([...value, p]);
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ALL_PERMS.map((p) => {
        const on = value.includes(p);
        return (
          <label
            key={p}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
              on
                ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-orange-500/60"
                : "bg-slate-800 border-slate-700 hover:border-orange-500/40"
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(p)}
              className="rounded border-slate-600 bg-slate-900 text-orange-500 focus:ring-orange-500/60"
            />
            <span className="text-sm font-medium text-slate-100">
              {PERMISSION_LABELS[p] ?? p}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CreateStaffForm({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    permissions: [] as string[],
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminApi.staff.create({
        name: f.name,
        email: f.email,
        password: f.password,
        permissions: f.permissions,
        isActive: true,
      });
      setOk(true);
      setF({ name: "", email: "", password: "", permissions: [] });
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
        <h2 className="text-lg font-bold text-white">Create Staff Member</h2>
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
              placeholder="Ananya Sharma"
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
              placeholder="staff@gymco.in"
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
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400 block mb-2">
            Permissions
          </label>
          <PermissionCheckboxes
            value={f.permissions}
            onChange={(next) => setF({ ...f, permissions: next })}
          />
          <div className="text-[11px] text-slate-500 mt-2">
            Staff will sign in at <code>/staff/login</code> and only see
            features they have permission for.
          </div>
        </div>
        {err && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {err}
          </div>
        )}
        {ok && (
          <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            Staff member created.
          </div>
        )}
        <button
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Staff"}
        </button>
      </form>
    </AdminCard>
  );
}

function EditStaffRow({ row, onChanged }: { row: Staff; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [perms, setPerms] = useState<string[]>(row.permissions ?? []);
  const [isActive, setIsActive] = useState(row.isActive);
  const [resetting, setResetting] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await adminApi.staff.update(row.id, {
        name,
        permissions: perms,
        isActive,
      });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const resetPwd = async () => {
    if (newPwd.length < 6) return;
    setBusy(true);
    try {
      await adminApi.staff.resetPassword(row.id, newPwd);
      setNewPwd("");
      setResetting(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete staff member "${row.name}"?`)) return;
    setBusy(true);
    try {
      await adminApi.staff.remove(row.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-800/60 align-top">
      <td className="px-5 py-4">
        {editing ? (
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <div className="font-medium text-white">{row.name}</div>
        )}
        <div className="text-xs text-slate-400 mt-1">{row.email}</div>
      </td>
      <td className="px-5 py-4">
        {editing ? (
          <PermissionCheckboxes value={perms} onChange={setPerms} />
        ) : row.permissions.length === 0 ? (
          <span className="text-xs text-slate-500">No permissions</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {row.permissions.map((p) => (
              <span
                key={p}
                className="text-[11px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/30"
              >
                {PERMISSION_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-5 py-4">
        {editing ? (
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-orange-500 focus:ring-orange-500/60"
            />
            Active
          </label>
        ) : (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-md border ${
              row.isActive
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-slate-700/40 text-slate-400 border-slate-600/40"
            }`}
          >
            {row.isActive ? "Active" : "Disabled"}
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col gap-2">
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setName(row.name);
                  setPerms(row.permissions ?? []);
                  setIsActive(row.isActive);
                  setEditing(false);
                }}
                className="text-xs px-3 py-1.5 rounded bg-slate-700/40 text-slate-300 border border-slate-600/40"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded bg-slate-700/60 text-slate-200 border border-slate-600/60 hover:border-orange-500/40 w-fit"
            >
              Edit
            </button>
          )}
          {resetting ? (
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
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetting(true)}
              className="text-xs px-3 py-1.5 rounded bg-slate-700/60 text-slate-200 border border-slate-600/60 hover:border-orange-500/40 inline-flex items-center gap-1 w-fit"
            >
              <KeyRound className="h-3 w-3" /> Reset Password
            </button>
          )}
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 inline-flex items-center gap-1 w-fit disabled:opacity-60"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminStaffManagement() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = (await adminApi.staff.list()) as Staff[];
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminLayout title="Staff Management">
      <div className="space-y-6">
        <CreateStaffForm onCreated={load} />

        <AdminCard className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Staff Members
            </h2>
            <span className="text-xs text-slate-500">{rows.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Permissions</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      No staff members yet. Create one above.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <EditStaffRow key={r.id} row={r} onChanged={load} />
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
