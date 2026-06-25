import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import {
  KeyRound,
  Trash2,
  UserPlus,
  Store,
  Package,
  Power,
  PauseCircle,
} from "lucide-react";

type Vendor = {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  kind: string;
  createdAt: string;
};

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    suspended: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span
      className={`text-[11px] px-2 py-1 rounded-md border capitalize ${
        map[status] ?? "bg-slate-700/50 text-slate-300 border-slate-600/50"
      }`}
    >
      {status}
    </span>
  );
}

function CreateVendorForm({ onCreated }: { onCreated: () => void }) {
  const empty = {
    name: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    kind: "vendor",
  };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminApi.partners.create({ ...f, status: "active" });
      setOk(true);
      setF(empty);
      onCreated();
      setTimeout(() => setOk(false), 2200);
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
        <h2 className="text-lg font-bold text-white">Create Vendor</h2>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Vendor / Store Name
            </label>
            <input
              required
              className={inputCls}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Iconic Supplements"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Email (login)
            </label>
            <input
              required
              type="email"
              className={inputCls}
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="vendor@example.com"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Phone
            </label>
            <input
              required
              className={inputCls}
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
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
              value={f.city}
              onChange={(e) => setF({ ...f, city: e.target.value })}
              placeholder="Bengaluru"
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
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Access
            </label>
            <select
              className={inputCls}
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value })}
            >
              <option value="vendor">Vendor only (store)</option>
              <option value="both">Vendor + Gym partner</option>
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
            Vendor created. They can sign in at <strong>/vendor/login</strong> to
            add products and manage orders.
          </div>
        )}
        <button
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-400 hover:to-lime-500 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Vendor"}
        </button>
      </form>
    </AdminCard>
  );
}

function VendorRow({
  row,
  onChanged,
}: {
  row: Vendor;
  onChanged: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setStatus = async (status: string) => {
    setBusy(true);
    setErr(null);
    try {
      await adminApi.partners.update(row.id, { status });
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
      await adminApi.partners.resetPassword(row.id, newPwd);
      setNewPwd("");
      setResetting(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        `Delete vendor "${row.name}" (${row.email})? Their products will also be removed.`,
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      await adminApi.partners.remove(row.id);
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
        <div className="text-xs text-slate-400 mt-1">{row.email}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {row.phone}
          {row.city ? ` · ${row.city}` : ""}
        </div>
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={row.status} />
        {row.kind === "both" && (
          <div className="mt-1.5 text-[11px] text-slate-400">+ Gym partner</div>
        )}
      </td>
      <td className="px-5 py-4 text-xs text-slate-400">
        {new Date(row.createdAt).toLocaleDateString()}
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col gap-2">
          {row.status === "suspended" ? (
            <button
              onClick={() => setStatus("active")}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 inline-flex items-center gap-1 w-fit disabled:opacity-60"
            >
              <Power className="h-3 w-3" /> Activate
            </button>
          ) : (
            <button
              onClick={() => setStatus("suspended")}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 inline-flex items-center gap-1 w-fit disabled:opacity-60"
            >
              <PauseCircle className="h-3 w-3" /> Suspend
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

export default function AdminVendors() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = (await adminApi.partners.list()) as Vendor[];
      setRows(data.filter((p) => p.kind === "vendor" || p.kind === "both"));
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").length;
    return { total: rows.length, active };
  }, [rows]);

  return (
    <AdminLayout title="Vendors">
      <div className="space-y-6">
        <div className="rounded-lg bg-lime-500/10 border border-lime-500/30 px-4 py-3 text-sm text-lime-200 flex items-start gap-2">
          <Store className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Vendors are store sellers. Create an account here, then the vendor
            signs in at <strong>/vendor/login</strong> to add priced products and
            manage their own orders. Use{" "}
            <a href="/admin/products" className="underline hover:text-lime-100">
              Products
            </a>{" "}
            and{" "}
            <a href="/admin/orders" className="underline hover:text-lime-100">
              Orders
            </a>{" "}
            to oversee the whole store.
          </span>
        </div>

        <CreateVendorForm onCreated={load} />

        <AdminCard className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 inline-flex items-center gap-2">
              <Package className="h-4 w-4 text-lime-400" /> All Vendors
            </h2>
            <span className="text-xs text-slate-500">
              {counts.active} active · {counts.total} total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Status</th>
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
                ) : loadErr ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-red-400"
                    >
                      {loadErr}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      No vendors yet. Create one above.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <VendorRow key={r.id} row={r} onChanged={load} />
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
