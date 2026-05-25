import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Trash2, UserPlus } from "lucide-react";

export default function AdminPartners() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
              <th className="px-5 py-3"></th>
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
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => remove(p.id)}
                    className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10"
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
    </AdminLayout>
  );
}
