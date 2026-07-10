import { useEffect, useMemo, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PackageBookingRow } from "@/lib/partnerApi";
import { PackageBookingsTable } from "@/components/PackageBookingsTable";

export default function PartnerPackageBookings() {
  const [rows, setRows] = useState<PackageBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    partnerApi.packageBookings
      .list()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const paid = useMemo(() => rows.filter((r) => r.status === "paid"), [rows]);

  return (
    <PartnerLayout title="Package Purchases">
      <PartnerCard>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : err ? (
          <p className="text-sm text-destructive">{err}</p>
        ) : (
          <PackageBookingsTable
            rows={rows}
            summary={`${paid.length} paid · ₹${paid.reduce((s, r) => s + r.amountInr, 0).toLocaleString("en-IN")} collected`}
          />
        )}
      </PartnerCard>
    </PartnerLayout>
  );
}
