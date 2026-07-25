import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type TrainerBookingRow } from "@/lib/partnerApi";
import { TrainerBookingsTable } from "@/components/TrainerBookingsTable";

export default function PartnerTrainerBookings() {
  const [rows, setRows] = useState<TrainerBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    partnerApi.trainerBookings
      .list()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const paid = useMemo(() => rows.filter((r) => r.status === "paid"), [rows]);

  return (
    <PartnerLayout title="PT Bookings">
      <PartnerCard>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : err ? (
          <p className="text-sm text-destructive">{err}</p>
        ) : (
          <TrainerBookingsTable
            rows={rows}
            summary={`${paid.length} paid · ₹${paid.reduce((s, r) => s + r.amountInr, 0).toLocaleString("en-IN")} collected`}
            loadTrainers={(branchId) => partnerApi.yoactiv.trainers(branchId)}
            onAssign={(id, body) => partnerApi.trainerBookings.assign(id, body)}
            sessionApi={{
              list: (id) => partnerApi.trainerBookings.sessions(id),
              add: (id, body) => partnerApi.trainerBookings.addSession(id, body),
              setStatus: (id, sid, status) =>
                partnerApi.trainerBookings.setSessionStatus(id, sid, status),
              remove: (id, sid) =>
                partnerApi.trainerBookings.deleteSession(id, sid),
            }}
          />
        )}
      </PartnerCard>
    </PartnerLayout>
  );
}
