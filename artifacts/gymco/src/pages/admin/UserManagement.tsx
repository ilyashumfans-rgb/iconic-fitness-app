import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";

export default function AdminUserManagement() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () =>
    adminApi.userMemberships.list().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  const setStatus = async (id: number, status: string) => {
    await adminApi.userMemberships.updateStatus(id, status);
    load();
  };

  return (
    <AdminLayout title="User Management">
      <p className="text-sm text-slate-400 mb-4">
        Manage user subscriptions — pause, resume, or cancel active plans.
      </p>
      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Renews</th>
              <th className="px-5 py-3">Classes Used</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No active user subscriptions yet.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr
                key={u.id}
                className="border-b border-slate-800/60 hover:bg-slate-800/30"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{u.userName}</div>
                  <div className="text-xs text-slate-500">{u.userEmail}</div>
                </td>
                <td className="px-5 py-3 text-slate-300">{u.planName}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">
                  {new Date(u.renewsOn).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-slate-300">{u.classesUsed}</td>
                <td className="px-5 py-3">
                  <select
                    value={u.status}
                    onChange={(e) => setStatus(u.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </AdminCard>
    </AdminLayout>
  );
}
