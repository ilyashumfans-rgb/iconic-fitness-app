import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";

export default function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminApi.users.list().then(setRows).catch(() => {});
  }, []);

  const filtered = rows.filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      u.city.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AdminLayout
      title="Users"
      actions={
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users…"
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
        />
      }
    >
      <AdminCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Mobile</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Streak</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="border-b border-slate-800/60 hover:bg-slate-800/30"
              >
                <td className="px-5 py-3 font-medium text-white">{u.name}</td>
                <td className="px-5 py-3 text-slate-300">{u.email}</td>
                <td className="px-5 py-3 text-slate-400">{u.mobile}</td>
                <td className="px-5 py-3 text-slate-400">{u.city}</td>
                <td className="px-5 py-3">
                  {u.planName ? (
                    <span className="text-xs px-2 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {u.planName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-300">{u.streakDays}d</td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {new Date(u.joinedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </AdminLayout>
  );
}
