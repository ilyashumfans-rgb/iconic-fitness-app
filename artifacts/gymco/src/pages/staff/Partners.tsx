import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
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
  UserPlus,
  Building2,
  Copy,
  KeyRound,
} from "lucide-react";
import {
  GymQrPoster,
  downloadGymQrSvg,
  type GymQrPosterGym,
} from "@/components/GymQrPoster";

function View() {
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<StaffPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<StaffUser | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState<StaffPartner | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", city: "" });
  const [editBusy, setEditBusy] = useState(false);

  const [resetting, setResetting] = useState<StaffPartner | null>(null);
  const [pwd, setPwd] = useState("");

  const [qrFor, setQrFor] = useState<StaffPartner | null>(null);
  const [partnerGyms, setPartnerGyms] = useState<GymQrPosterGym[]>([]);
  const [qrGymId, setQrGymId] = useState<number | "">("");
  const [qrLoading, setQrLoading] = useState(false);

  const canManage = me?.permissions.includes("partner.onboard") ?? false;
  const canImpersonate =
    me?.permissions.includes("partner.assign_login") ?? false;
  const canReset = me?.permissions.includes("partner.assign_login") ?? false;
  const canQr = me?.permissions.includes("gym.manage") ?? false;
  const hasActions = canManage || canImpersonate || canReset || canQr;

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

  const updateStatus = async (id: number, status: string) => {
    setErr(null);
    try {
      await staffApi.partners.update(id, { status });
      load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setErr(null);
    try {
      await staffApi.partners.resetPassword(resetting.id, pwd);
      setMsg(`Password updated for ${resetting.name}.`);
      setResetting(null);
      setPwd("");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
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

  const duplicate = (p: StaffPartner) => {
    const qs = new URLSearchParams({
      name: `${p.name} (copy)`,
      phone: p.phone ?? "",
      city: p.city ?? "",
      notes: p.notes ?? "",
      kind: p.kind ?? "gym",
    }).toString();
    navigate(`/staff/partner-onboarding?${qs}`);
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
    <StaffLayout
      title="Partners"
      actions={
        canManage ? (
          <Link
            href="/staff/partner-onboarding"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Onboard Partner
          </Link>
        ) : undefined
      }
    >
      {err && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm print:hidden">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm print:hidden">
          {msg}
        </div>
      )}

      {/* Reset password */}
      {resetting && (
        <StaffCard className="p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">
              Reset password — {resetting.name}
            </h3>
            <button
              onClick={() => {
                setResetting(null);
                setPwd("");
              }}
              className="text-slate-500 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            onSubmit={submitReset}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              autoFocus
              type="text"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="New password (min 6 chars)"
              minLength={6}
              required
              className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
            <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold">
              Update password
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Share this password securely with the partner. They can change it
            from their settings after signing in.
          </p>
        </StaffCard>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-300 shadow-2xl"
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
                <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1.5 block">
                  Name
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1.5 block">
                  Phone
                </label>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1.5 block">
                  City
                </label>
                <input
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
              </div>
              <p className="text-xs text-slate-500">
                Email is the login identifier and can't be changed here. To reset
                the password, use the Reset button on the row.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBusy || !editForm.name.trim()}
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
              <div className="p-16 text-center text-slate-500 text-sm">
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
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            All Partners
          </h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, city…"
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 w-72"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
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
                    className="border-b border-slate-200/60 hover:bg-white/30"
                  >
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {p.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.email}</td>
                    <td className="px-5 py-3 text-slate-500">{p.phone}</td>
                    <td className="px-5 py-3 text-slate-500">{p.city}</td>
                    <td className="px-5 py-3">
                      {canManage ? (
                        <select
                          value={p.status}
                          onChange={(e) => updateStatus(p.id, e.target.value)}
                          className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-md border ${
                            p.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.status === "suspended"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-slate-100/40 text-slate-600 border-slate-300/40"
                          }`}
                        >
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    {hasActions && (
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {canManage && (
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit partner name, phone, city"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 mr-1"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                        {canQr && (
                          <button
                            onClick={() =>
                              navigate(
                                `/staff/gym-management?ownerPartnerId=${p.id}`,
                              )
                            }
                            title="Add a new gym branch under this partner"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 mr-1"
                          >
                            <Building2 className="h-3.5 w-3.5" /> Add branch
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => duplicate(p)}
                            title="Onboard a new partner pre-filled with this partner's details (use a different email)"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 mr-1"
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </button>
                        )}
                        {canQr && (
                          <button
                            onClick={() => openQrFor(p)}
                            title="Print branded gym check-in QR poster"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 mr-1"
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
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 mr-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <LogIn className="h-3.5 w-3.5" /> Sign in as
                          </button>
                        )}
                        {canReset && (
                          <button
                            onClick={() => {
                              setResetting(p);
                              setPwd("");
                              setMsg(null);
                            }}
                            title="Reset partner password"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 mr-1"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Reset
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
