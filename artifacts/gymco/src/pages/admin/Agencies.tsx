import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type AgencyAccount } from "@/lib/adminApi";
import { KeyRound, Trash2, UserPlus, Building2, Save, X } from "lucide-react";

type Gym = { id: number; name: string; city?: string; area?: string };

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

function BranchPicker({
  gyms,
  selected,
  onToggle,
}: {
  gyms: Gym[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/60 divide-y divide-slate-700/60">
      {gyms.length === 0 ? (
        <div className="px-3 py-3 text-sm text-slate-500">No branches yet.</div>
      ) : (
        gyms.map((g) => (
          <label
            key={g.id}
            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-700/40"
          >
            <input
              type="checkbox"
              checked={selected.includes(g.id)}
              onChange={() => onToggle(g.id)}
              className="h-4 w-4 accent-lime-500"
            />
            <span className="text-sm text-slate-200">
              {g.name}
              {(g.city || g.area) && (
                <span className="text-slate-500">
                  {" "}
                  · {[g.area, g.city].filter(Boolean).join(", ")}
                </span>
              )}
            </span>
          </label>
        ))
      )}
    </div>
  );
}

function CreateAgencyForm({
  gyms,
  onCreated,
}: {
  gyms: Gym[];
  onCreated: () => void;
}) {
  const [f, setF] = useState({ name: "", username: "", password: "" });
  const [gymIds, setGymIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const toggle = (id: number) =>
    setGymIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminApi.agencies.create({ ...f, gymIds });
      setOk(true);
      setF({ name: "", username: "", password: "" });
      setGymIds([]);
      onCreated();
      setTimeout(() => setOk(false), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-lime-400" />
        <h2 className="text-lg font-bold text-white">Create Agency Account</h2>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Agency Name
            </label>
            <input
              required
              className={inputCls}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Acme Marketing"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Username
            </label>
            <input
              required
              className={inputCls}
              value={f.username}
              onChange={(e) => setF({ ...f, username: e.target.value })}
              placeholder="acme"
              autoComplete="off"
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
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
            Assigned Branches ({gymIds.length} selected)
          </label>
          <BranchPicker gyms={gyms} selected={gymIds} onToggle={toggle} />
        </div>
        {err && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {err}
          </div>
        )}
        {ok && (
          <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            Agency account created. They can sign in at /agency/login.
          </div>
        )}
        <button
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-400 hover:to-lime-500 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Agency Account"}
        </button>
      </form>
    </AdminCard>
  );
}

function AgencyRow({
  row,
  gyms,
  onChanged,
}: {
  row: AgencyAccount;
  gyms: Gym[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [gymIds, setGymIds] = useState<number[]>(row.gymIds);
  const [resetting, setResetting] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const gymName = useMemo(() => {
    const map = new Map(gyms.map((g) => [g.id, g.name]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [gyms]);

  const toggle = (id: number) =>
    setGymIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const saveBranches = async () => {
    setBusy(true);
    setErr(null);
    try {
      await adminApi.agencies.update(row.id, { gymIds });
      setEditing(false);
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
      await adminApi.agencies.resetPassword(row.id, newPwd);
      setNewPwd("");
      setResetting(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete agency account "${row.name}" (${row.username})?`))
      return;
    setBusy(true);
    setErr(null);
    try {
      await adminApi.agencies.remove(row.id);
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
        <div className="font-medium text-white">{row.name}</div>
        <div className="text-xs text-slate-400 mt-1">@{row.username}</div>
      </td>
      <td className="px-5 py-4">
        {editing ? (
          <div className="space-y-2 w-72 max-w-full">
            <BranchPicker gyms={gyms} selected={gymIds} onToggle={toggle} />
            <div className="flex gap-1.5">
              <button
                onClick={saveBranches}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded bg-lime-500/20 text-lime-300 border border-lime-500/40 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Save className="h-3 w-3" /> Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setGymIds(row.gymIds);
                }}
                className="text-xs px-3 py-1.5 rounded bg-slate-700/40 text-slate-300 border border-slate-600/40 inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </div>
        ) : row.gymIds.length === 0 ? (
          <span className="text-xs text-amber-300/80">No branches assigned</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {row.gymIds.map((id) => (
              <span
                key={id}
                className="text-[11px] px-2 py-1 rounded-md bg-slate-700/50 text-slate-200 border border-slate-600/50"
              >
                {gymName(id)}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-5 py-4 text-xs text-slate-400">
        {new Date(row.createdAt).toLocaleDateString()}
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded bg-slate-700/60 text-slate-200 border border-slate-600/60 hover:border-lime-500/40 inline-flex items-center gap-1 w-fit"
            >
              <Building2 className="h-3 w-3" /> Edit Branches
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
                className="text-xs px-2 py-1 rounded bg-lime-500/20 text-lime-300 border border-lime-500/40 disabled:opacity-40"
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
            <button
              onClick={() => setResetting(true)}
              className="text-xs px-3 py-1.5 rounded bg-slate-700/60 text-slate-200 border border-slate-600/60 hover:border-lime-500/40 inline-flex items-center gap-1 w-fit"
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
          {err && <div className="text-xs text-red-400">{err}</div>}
        </div>
      </td>
    </tr>
  );
}

export default function AdminAgencies() {
  const [rows, setRows] = useState<AgencyAccount[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [data, gymList] = await Promise.all([
        adminApi.agencies.list(),
        adminApi.gyms.list(),
      ]);
      setRows(data);
      setGyms(
        (gymList as Gym[]).map((g) => ({
          id: g.id,
          name: g.name,
          city: g.city,
          area: g.area,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminLayout title="Agency Accounts">
      <div className="space-y-6">
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-300">
          Agency accounts are read-only logins. Each one can sign in at{" "}
          <strong>/agency/login</strong> and only sees GX class bookings for the
          branches you assign.
        </div>

        <CreateAgencyForm gyms={gyms} onCreated={load} />

        <AdminCard className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              All Agency Accounts
            </h2>
            <span className="text-xs text-slate-500">{rows.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  <th className="px-5 py-3">Agency / Username</th>
                  <th className="px-5 py-3">Assigned Branches</th>
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
                      No agency accounts yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <AgencyRow
                      key={r.id}
                      row={r}
                      gyms={gyms}
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
