import { useEffect, useMemo, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import type { TrainerBookingRow } from "@/lib/partnerApi";
import { TrainerBookingsTable } from "@/components/TrainerBookingsTable";

export default function AdminTrainerBookings() {
  const [rows, setRows] = useState<TrainerBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminApi.trainerBookings
      .list()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const paid = useMemo(() => rows.filter((r) => r.status === "paid"), [rows]);

  return (
    <AdminLayout title="PT Bookings">
      <AdminCard className="p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : err ? (
          <p className="text-sm text-red-400">{err}</p>
        ) : (
          <TrainerBookingsTable
            rows={rows}
            summary={`${paid.length} paid · ₹${paid.reduce((s, r) => s + r.amountInr, 0).toLocaleString("en-IN")} collected`}
            loadTrainers={(branchId) => adminApi.yoactiv.trainers(branchId)}
            onAssign={(id, body) => adminApi.trainerBookings.assign(id, body)}
          />
        )}
      </AdminCard>
    </AdminLayout>
  );
}
