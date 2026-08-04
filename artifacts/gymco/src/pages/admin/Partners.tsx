import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type YoactivBranchOption } from "@/lib/adminApi";
import {
  KeyRound,
  LogIn,
  Trash2,
  UserPlus,
  X,
  Pencil,
  Building2,
  Copy,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function AdminPartners() {
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetting, setResetting] = useState<any | null>(null);
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    city: "",
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editGyms, setEditGyms] = useState<any[]>([]);
  const [editGymsLoading, setEditGymsLoading] = useState(false);
  const [gymBranchForm, setGymBranchForm] = useState<
    Record<number, { yoactivBranchId: string; yoactivPtBranchId: string }>
  >({});
  const [yoBranches, setYoBranches] = useState<YoactivBranchOption[]>([]);
  const [docsFor, setDocsFor] = useState<any | null>(null);
  const [docs, setDocs] = useState<
    Awaited<ReturnType<typeof adminApi.partners.documents>>["documents"]
  >([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsErr, setDocsErr] = useState<string | null>(null);

  const openDocs = async (p: any) => {
    setDocsFor(p);
    setDocs([]);
    setDocsErr(null);
    setDocsLoading(true);
    try {
      const r = await adminApi.partners.documents(p.id);
      setDocs(r.documents);
    } catch (e) {
      setDocsErr(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      name: p.name ?? "",
      phone: p.phone ?? "",
      city: p.city ?? "",
    });
    setMsg(null);
    setErr(null);
    setEditGyms([]);
    setGymBranchForm({});
    setEditGymsLoading(true);
    Promise.all([
      adminApi.gyms.list(),
      yoBranches.length > 0
        ? Promise.resolve(yoBranches)
        : adminApi.yoactiv.branches().catch(() => [] as YoactivBranchOption[]),
    ])
      .then(([gyms, branches]) => {
        setYoBranches(branches);
        const mine = gyms.filter((g: any) => g.ownerPartnerId === p.id);
        setEditGyms(mine);
        const form: Record<
          number,
          { yoactivBranchId: string; yoactivPtBranchId: string }
        > = {};
        for (const g of mine) {
          form[g.id] = {
            yoactivBranchId:
              g.yoactivBranchId === null || g.yoactivBranchId === undefined
                ? ""
                : String(g.yoactivBranchId),
            yoactivPtBranchId:
              g.yoactivPtBranchId === null || g.yoactivPtBranchId === undefined
                ? ""
                : String(g.yoactivPtBranchId),
          };
        }
        setGymBranchForm(form);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setEditGymsLoading(false));
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditBusy(true);
    setErr(null);
    try {
      await adminApi.partners.update(editing.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        city: editForm.city.trim(),
      });
      for (const g of editGyms) {
        const f = gymBranchForm[g.id];
        if (!f) continue;
        const nextBranch = f.yoactivBranchId.trim() === "" ? null : Number(f.yoactivBranchId);
        const nextPt = f.yoactivPtBranchId.trim() === "" ? null : Number(f.yoactivPtBranchId);
        const curBranch = g.yoactivBranchId ?? null;
        const curPt = g.yoactivPtBranchId ?? null;
        if (nextBranch !== curBranch || nextPt !== curPt) {
          await adminApi.gyms.update(g.id, {
            yoactivBranchId: nextBranch,
            yoactivPtBranchId: nextPt,
          });
        }
      }
      setMsg(`Updated ${editForm.name}.`);
      setEditing(null);
      load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setEditBusy(false);
    }
  };

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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white text-sm font-medium shadow"
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
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            />
            <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white font-semibold">
              Update password
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Share this password securely with the partner. They can change it
            from their settings after signing in.
          </p>
        </AdminCard>
      )}

      {editing && (
        <AdminCard className="p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">
              Edit partner — {editing.name}
            </h3>
            <button
              onClick={() => setEditing(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            onSubmit={submitEdit}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1 block">
                Name
              </label>
              <input
                autoFocus
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                minLength={2}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-lime-500/60"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1 block">
                Phone
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-lime-500/60"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1 block">
                City
              </label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, city: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-lime-500/60"
              />
            </div>
            <div className="sm:col-span-3 flex gap-2 mt-1">
              <button
                type="submit"
                disabled={editBusy || !editForm.name.trim()}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white font-semibold disabled:opacity-50"
              >
                {editBusy ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
          <div className="mt-4 border-t border-slate-800 pt-4">
            <h4 className="text-sm font-semibold text-white mb-1">
              YoActiv branch mapping
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Pick the YoActiv branch for members plans and (optionally) a
              different branch for PT plans, for each gym branch. Click "Save
              changes" above to apply.
            </p>
            {editGymsLoading ? (
              <p className="text-sm text-slate-500">Loading branches…</p>
            ) : editGyms.length === 0 ? (
              <p className="text-sm text-slate-500">
                This partner has no gym branches yet. Use "Add branch" on the
                row to create one.
              </p>
            ) : (
              <div className="space-y-3">
                {editGyms.map((g) => {
                  const f = gymBranchForm[g.id] ?? {
                    yoactivBranchId: "",
                    yoactivPtBranchId: "",
                  };
                  const setField = (
                    key: "yoactivBranchId" | "yoactivPtBranchId",
                    value: string,
                  ) =>
                    setGymBranchForm((prev) => ({
                      ...prev,
                      [g.id]: { ...f, [key]: value },
                    }));
                  const renderSelect = (
                    key: "yoactivBranchId" | "yoactivPtBranchId",
                    emptyLabel: string,
                  ) => (
                    <select
                      value={f[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                    >
                      <option value="">{emptyLabel}</option>
                      {f[key] !== "" &&
                        !yoBranches.some(
                          (b) => String(b.branchId) === f[key],
                        ) && (
                          <option value={f[key]}>
                            {f[key]} — (not in configured branch list)
                          </option>
                        )}
                      {yoBranches.map((b) => (
                        <option key={b.branchId} value={String(b.branchId)}>
                          {b.branchName ?? b.gymLabel ?? "Branch"} (#
                          {b.branchId})
                        </option>
                      ))}
                    </select>
                  );
                  return (
                    <div
                      key={g.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
                    >
                      <div className="font-medium text-white text-sm mb-2">
                        {g.name}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1 block">
                            YoActiv branch (members plans)
                          </label>
                          {renderSelect("yoactivBranchId", "Not linked")}
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1 block">
                            YoActiv PT branch (optional)
                          </label>
                          {renderSelect(
                            "yoactivPtBranchId",
                            "Same as members branch",
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Email is the login identifier and can't be changed here. To reset
            the password, use the orange Reset button on the row.
          </p>
        </AdminCard>
      )}

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
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
                    onClick={() => openEdit(p)}
                    title="Edit partner name, phone, city"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 mr-1"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/admin/gyms?ownerPartnerId=${p.id}`)
                    }
                    title="Add a new gym branch under this partner"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-lime-500/15 text-lime-700 border border-lime-500/30 hover:bg-lime-500/25 mr-1"
                  >
                    <Building2 className="h-3.5 w-3.5" /> Add branch
                  </button>
                  <button
                    onClick={() => openDocs(p)}
                    title="View documents uploaded for this partner"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-lime-500/15 text-lime-700 border border-lime-500/30 hover:bg-lime-500/25 mr-1"
                  >
                    <FileText className="h-3.5 w-3.5" /> Documents
                  </button>
                  <button
                    onClick={() => {
                      const qs = new URLSearchParams({
                        duplicateOf: String(p.id),
                        name: `${p.name} (copy)`,
                        phone: p.phone ?? "",
                        city: p.city ?? "",
                        notes: p.notes ?? "",
                        kind: p.kind ?? "gym",
                      }).toString();
                      navigate(`/admin/partner-onboarding?${qs}`);
                    }}
                    title="Onboard a new partner pre-filled with this partner's details (use a different email)"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 mr-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  <button
                    onClick={() => impersonate(p)}
                    disabled={p.status === "suspended"}
                    title={
                      p.status === "suspended"
                        ? "Suspended partners cannot be signed in"
                        : "Sign in as this partner in a new tab"
                    }
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-lime-500/15 text-lime-700 border border-lime-500/30 hover:bg-lime-500/25 mr-1 disabled:opacity-40 disabled:cursor-not-allowed"
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
        </div>
      </AdminCard>

      {docsFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDocsFor(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-slate-200 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Documents
                </h3>
                <p className="text-xs text-slate-500">{docsFor.name}</p>
              </div>
              <button
                onClick={() => setDocsFor(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {docsLoading ? (
                <p className="text-sm text-slate-500">Loading documents...</p>
              ) : docsErr ? (
                <p className="text-sm text-red-600">{docsErr}</p>
              ) : docs.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No documents have been uploaded for this partner yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-lime-600 shrink-0" />
                          <span className="font-medium text-slate-900 truncate">
                            {d.name}
                          </span>
                        </div>
                        {d.notes && (
                          <p className="mt-1 text-xs text-slate-600">
                            {d.notes}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          Uploaded by {d.uploadedByKind}
                          {d.uploadedByEmail ? ` (${d.uploadedByEmail})` : ""} on{" "}
                          {new Date(d.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-lime-500/15 text-lime-700 border border-lime-500/30 hover:bg-lime-500/25 shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
