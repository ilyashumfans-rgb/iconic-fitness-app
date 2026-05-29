import { useEffect, useState } from "react";
import {
  StaffLayout,
  StaffCard,
  PermissionGate,
} from "@/components/staff/StaffLayout";
import {
  staffApi,
  type StaffPartner,
  type StaffUser,
} from "@/lib/staffApi";
import {
  LogIn,
  Pencil,
  QrCode,
  Printer,
  Download,
  X,
} from "lucide-react";
import {
  GymQrPoster,
  downloadGymQrSvg,
  type GymQrPosterGym,
} from "@/components/GymQrPoster";

function View() {
  const [rows, setRows] = useState<StaffPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<StaffUser | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState<StaffPartner | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", city: "" });
  const [editBusy, setEditBusy] = useState(false);

  const [qrFor, setQrFor] = useState<StaffPartner | null>(null);
  const [partnerGyms, setPartnerGyms] = useState<GymQrPosterGym[]>([]);
  const [qrGymId, setQrGymId] = useState<number | "">("");
  const [qrLoading, setQrLoading] = useState(false);

  const canEdit = me?.permissions.includes("partner.onboard") ?? false;
  const canImpersonate =
    me?.permissions.includes("partner.assign_login") ?? false;
  const canQr = me?.permissions.includes("gym.manage") ?? false;
  const hasActions = canEdit || canImpersonate || canQr;

  const load = () => {
    setLoading(true);
    staffApi.partners
      .list()
      .then((d) => setRows(d))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    staffApi.me().then(setMe).catch(() => {});
    load();
  }, []);

  const filtered = rows.filter((p) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      p.name.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s) ||
      p.city.toLowerCase().includes(s) ||
      p.phone.toLowerCase().includes(s)
    );
  });

  const openEdit = (p: StaffPartner) => {
    setEditing(p);
    setEditForm({ name: p.name ?? "", phone: p.phone ?? "", city: p.city ?? "" });
    setErr(null);
    setMsg(null);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditBusy(true);
    setErr(null);
    try {
      await staffApi.partners.update(editing.id, {
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

  const impersonate = async (p: StaffPartner) => {
    setErr(null);
    setMsg(null);
    try {
      const r = await staffApi.partners.impersonate(p.id);
      window.open(r.redirectTo, "_blank", "noopener");
      setMsg(`Signed in as ${p.name}. Opened partner portal in a new tab.`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const openQrFor = async (p: StaffPartner) => {
    setQrFor(p);
    setPartnerGyms([]);
    setQrGymId("");
    setQrLoading(true);
    setErr(null);
    try {
      const owned = await staffApi.gyms.list(p.id);
      const gyms: GymQrPosterGym[] = (owned ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        city: g.city,
        area: g.area,
      }));
      setPartnerGyms(gyms);
      if (gyms.length > 0) setQrGymId(gyms[0].id);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setQrLoading(false);
    }
  };

  const colSpan = hasActions ? 7 : 6;

  return (
    <StaffLayout title="Partners">
      {err && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm print:hidden">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm print:hidden">
          {msg}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                <span className="font-semibold">Edit partner</span>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1.5 block">
                  Name
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1.5 block">
                  Phone
                </label>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1.5 block">
                  City
                </label>
                <input
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBusy}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  {editBusy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrFor && (
        <div
          className="staff-qr-modal fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:bg-white print:p-0 print:static"
          onClick={() => setQrFor(null)}
        >
          <div
            className="staff-qr-sheet w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                <div>
                  <div className="font-semibold">Print check-in QR</div>
                  <div className="text-xs text-white/85">For {qrFor.name}</div>
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
                This partner has no gyms assigned yet. Assign a gym to them in
                Gym Management to print a check-in QR.
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
                      if (g) downloadGymQrSvg(g, "staff-gym-qr-svg");
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
                  return <GymQrPoster gym={g} svgId="staff-gym-qr-svg" />;
                })()}
              </>
            )}
          </div>
        </div>
      )}

      <StaffCard className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            All Partners
          </h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, city…"
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 w-72"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Kind</th>
                <th className="px-5 py-3">Status</th>
                {hasActions && (
                  <th className="px-5 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No partners found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td className="px-5 py-3 font-medium text-white">
                      {p.name}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{p.email}</td>
                    <td className="px-5 py-3 text-slate-400">{p.phone}</td>
                    <td className="px-5 py-3 text-slate-400">{p.city}</td>
                    <td className="px-5 py-3 text-slate-400 capitalize">
                      {p.kind}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border ${
                          p.status === "active"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : p.status === "suspended"
                              ? "bg-red-500/10 text-red-300 border-red-500/30"
                              : "bg-slate-700/40 text-slate-300 border-slate-600/40"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    {hasActions && (
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {canEdit && (
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit partner name, phone, city"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 mr-1"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                        {canQr && (
                          <button
                            onClick={() => openQrFor(p)}
                            title="Print branded gym check-in QR poster"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 mr-1"
                          >
                            <QrCode className="h-3.5 w-3.5" /> Print QR
                          </button>
                        )}
                        {canImpersonate && (
                          <button
                            onClick={() => impersonate(p)}
                            disabled={p.status === "suspended"}
                            title={
                              p.status === "suspended"
                                ? "Suspended partners cannot be signed in"
                                : "Sign in as this partner in a new tab"
                            }
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <LogIn className="h-3.5 w-3.5" /> Sign in as
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </StaffCard>
    </StaffLayout>
  );
}

export default function StaffPartners() {
  return (
    <PermissionGate perm="partner.view">
      <View />
    </PermissionGate>
  );
}
