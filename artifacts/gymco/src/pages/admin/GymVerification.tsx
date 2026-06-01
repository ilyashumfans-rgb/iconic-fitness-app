import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { ShieldCheck, ShieldX } from "lucide-react";

export default function AdminGymVerification() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => adminApi.gyms.list().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = async (g: any) => {
    await adminApi.gyms.update(g.id, { isPremium: !g.isPremium });
    load();
  };

  return (
    <AdminLayout title="Gym Verification">
      <p className="text-sm text-slate-400 mb-4">
        Verified gyms are marked with a badge to members. Use this to approve
        gyms after physical inspection.
      </p>
      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <th className="px-5 py-3">Gym</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr
                key={g.id}
                className="border-b border-slate-800/60 hover:bg-slate-800/30"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{g.name}</div>
                  <div className="text-xs text-slate-500">
                    Rating {g.rating} • {g.reviewsCount} reviews
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {g.area}, {g.city}
                </td>
                <td className="px-5 py-3">
                  {g.isPremium ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/15 text-green-400 border border-green-500/30">
                      <ShieldX className="h-3 w-3" /> Unverified
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => toggle(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      g.isPremium
                        ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                    }`}
                  >
                    {g.isPremium ? "Revoke" : "Verify"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </AdminCard>
    </AdminLayout>
  );
}
