import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Star } from "lucide-react";

export default function AdminFeaturedGyms() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => adminApi.gyms.list().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = async (g: any) => {
    await adminApi.gyms.update(g.id, { featured: !g.featured });
    load();
  };

  return (
    <AdminLayout title="Featured Gyms">
      <p className="text-sm text-slate-400 mb-4">
        Toggle which gyms appear in the "Featured" section of the discovery
        page.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((g) => (
          <AdminCard key={g.id} className="overflow-hidden">
            <div
              className="h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${g.heroImage})` }}
            />
            <div className="p-4">
              <div className="font-semibold text-white">{g.name}</div>
              <div className="text-xs text-slate-400 mb-3">
                {g.area}, {g.city}
              </div>
              <button
                onClick={() => toggle(g)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  g.featured
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
              >
                <Star
                  className={`h-4 w-4 ${g.featured ? "fill-white" : ""}`}
                />
                {g.featured ? "Featured" : "Mark Featured"}
              </button>
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminLayout>
  );
}
