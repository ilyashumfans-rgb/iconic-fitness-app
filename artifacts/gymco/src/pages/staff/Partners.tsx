import { useEffect, useState } from "react";
import {
  StaffLayout,
  StaffCard,
  PermissionGate,
} from "@/components/staff/StaffLayout";
import { staffApi, type StaffPartner } from "@/lib/staffApi";

function View() {
  const [rows, setRows] = useState<StaffPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    staffApi.partners
      .list()
      .then((d) => setRows(d))
      .finally(() => setLoading(false));
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

  return (
    <StaffLayout title="Partners">
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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Kind</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
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
