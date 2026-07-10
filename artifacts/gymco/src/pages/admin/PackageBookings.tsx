import { useEffect, useMemo, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import type { PackageBookingRow } from "@/lib/partnerApi";
import { PackageBookingsTable } from "@/components/PackageBookingsTable";

export default function AdminPackageBookings() {
  const [rows, setRows] = useState<PackageBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminApi.packageBookings
      .list()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const paid = useMemo(() => rows.filter((r) => r.status === "paid"), [rows]);

  return (
    <AdminLayout title="Package Purchases">
      <AdminCard className="p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : err ? (
          <p className="text-sm text-red-400">{err}</p>
        ) : (
          <PackageBookingsTable
            rows={rows}
            summary={`${paid.length} paid · ₹${paid.reduce((s, r) => s + r.amountInr, 0).toLocaleString("en-IN")} collected`}
          />
        )}
      </AdminCard>
    </AdminLayout>
  );
}
