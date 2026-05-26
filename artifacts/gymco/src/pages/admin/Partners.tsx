import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import {
  KeyRound,
  LogIn,
  Trash2,
  UserPlus,
  X,
  Printer,
  QrCode,
  Download,
  Pencil,
  Building2,
} from "lucide-react";
import {
  GymQrPoster,
  downloadGymQrSvg,
  type GymQrPosterGym,
} from "@/components/GymQrPoster";

export default function AdminPartners() {
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetting, setResetting] = useState<any | null>(null);
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<any | null>(null);
  const [partnerGyms, setPartnerGyms] = useState<GymQrPosterGym[]>([]);
  const [qrGymId, setQrGymId] = useState<number | "">("");
  const [qrLoading, setQrLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    city: "",
  });
  const [editBusy, setEditBusy] = useState(false);

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      name: p.name ?? "",
      phone: p.phone ?? "",
      city: p.city ?? "",
    });
    setMsg(null);
    setErr(null);
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
      setMsg(`Updated ${editForm.name}.`);
      setEditing(null);
      load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setEditBusy(false);
    }
  };

  const openQrFor = async (p: any) => {
    setQrFor(p);
    setPartnerGyms([]);
    setQrGymId("");
    setQrLoading(true);
    try {
      const all = await adminApi.gyms.list();
      const owned: GymQrPosterGym[] = (all ?? [])
        .filter((g: any) => Number(g.ownerPartnerId) === Number(p.id))
        .map((g: any) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          city: g.city,
          area: g.area,
        }));
      setPartnerGyms(owned);
      if (owned.length > 0) setQrGymId(owned[0].id);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setQrLoading(false);
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow"
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
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
            <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold">
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
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/60"
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
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/60"
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
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/60"
              />
            </div>
            <div className="sm:col-span-3 flex gap-2 mt-1">
              <button
                type="submit"
                disabled={editBusy || !editForm.name.trim()}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold disabled:opacity-50"
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
          <p className="mt-3 text-xs text-slate-500">
            Email is the login identifier and can't be changed here. To reset
            the password, use the orange Reset button on the row.
          </p>
        </AdminCard>
      )}

      {qrFor && (
        <div
          className="admin-qr-modal fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:bg-white print:p-0 print:static"
          onClick={() => setQrFor(null)}
        >
          <div
            className="admin-qr-sheet w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                <div>
                  <div className="font-semibold">Print check-in QR</div>
                  <div className="text-xs text-white/85">
                    For {qrFor.name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQrFor(null)}
                className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {qrLoading ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                Loading partner's gyms…
              </div>
            ) : partnerGyms.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                This partner has no gyms assigned yet. Assign a gym to them
                in Gym Management to print a check-in QR.
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end gap-3 print:hidden">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1.5 block">
                      Choose gym
                    </label>
                    <select
                      value={qrGymId}
                      onChange={(e) => setQrGymId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-orange-200 text-slate-900 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      {partnerGyms.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} — {g.area}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!qrGymId}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" /> Print poster
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const g = partnerGyms.find((x) => x.id === qrGymId);
                      if (g) downloadGymQrSvg(g, "admin-gym-qr-svg");
                    }}
                    disabled={!qrGymId}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-orange-200 hover:border-orange-500 text-orange-700 text-sm font-bold disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" /> Download SVG
                  </button>
                </div>

                {(() => {
                  const g = partnerGyms.find((x) => x.id === qrGymId);
                  if (!g) return null;
                  return (
                    <GymQrPoster gym={g} svgId="admin-gym-qr-svg" />
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      <AdminCard className="overflow-hidden">
        <table className="w-full text-sm">
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
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-500/15 text-orange-700 border border-orange-500/30 hover:bg-orange-500/25 mr-1"
                  >
                    <Building2 className="h-3.5 w-3.5" /> Add branch
                  </button>
                  <button
                    onClick={() => openQrFor(p)}
                    title="Print branded gym check-in QR poster"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-500/15 text-orange-700 border border-orange-500/30 hover:bg-orange-500/25 mr-1"
                  >
                    <QrCode className="h-3.5 w-3.5" /> Print QR
                  </button>
                  <button
                    onClick={() => impersonate(p)}
                    disabled={p.status === "suspended"}
                    title={
                      p.status === "suspended"
                        ? "Suspended partners cannot be signed in"
                        : "Sign in as this partner in a new tab"
                    }
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-500/15 text-orange-700 border border-orange-500/30 hover:bg-orange-500/25 mr-1 disabled:opacity-40 disabled:cursor-not-allowed"
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
      </AdminCard>

      <style>{`
        @media print {
          @page { size: 1754px 2480px; margin: 0; }
          html, body { background: white !important; width: 1754px; }
          body * { visibility: hidden !important; }
          .admin-qr-modal, .admin-qr-modal * { visibility: visible !important; }
          .admin-qr-modal {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            padding: 0 !important;
            display: block !important;
          }
          .admin-qr-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 1754px !important;
            max-width: 1754px !important;
            min-height: 2480px !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
