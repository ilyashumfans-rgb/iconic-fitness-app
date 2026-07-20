import { desc, eq, and, inArray } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";

/**
 * Free PT-session enquiry requests (submitted from the mobile app when a
 * branch has no online-payment mapping, or as a plain "request a session")
 * are stored as leads with this source. They are surfaced alongside paid
 * trainer bookings on the partner/admin "PT Bookings" pages.
 */
export const TRAINER_ENQUIRY_SOURCE = "iconic-app-live-trainer";

export type TrainerEnquiryRow = {
  id: number;
  gymId: number;
  gymName: string;
  trainerName: string;
  memberName: string;
  mobile: string;
  packageName: string;
  serviceName: string;
  amountInr: number;
  preferredDate: string;
  status: string;
  createdAt: Date;
};

/**
 * Fetch trainer-session enquiry leads shaped like trainer-booking rows.
 * Pass `gymIds` to scope to a partner's branches; omit for admin (all rows,
 * including old enquiries that were captured without a gym id).
 *
 * Ids are negated so they never collide with real trainer_bookings ids in
 * merged lists (they are display-only).
 */
export async function fetchTrainerEnquiryRows(
  gymIds?: number[],
): Promise<TrainerEnquiryRow[]> {
  const bySource = and(
    eq(leadsTable.source, TRAINER_ENQUIRY_SOURCE),
    eq(leadsTable.kind, "general"),
  );
  const where =
    gymIds === undefined
      ? bySource
      : and(bySource, inArray(leadsTable.gymId, gymIds));
  const rows = await db
    .select({
      id: leadsTable.id,
      gymId: leadsTable.gymId,
      gymName: leadsTable.gymName,
      // The mobile app stashes the coach's name in className for enquiries.
      trainerName: leadsTable.className,
      memberName: leadsTable.name,
      mobile: leadsTable.phone,
      preferredDate: leadsTable.preferredDate,
      createdAt: leadsTable.createdAt,
    })
    .from(leadsTable)
    .where(where)
    .orderBy(desc(leadsTable.createdAt))
    .limit(2000);

  return rows.map((r) => ({
    id: -r.id,
    gymId: r.gymId ?? 0,
    gymName: r.gymName,
    trainerName: r.trainerName,
    memberName: r.memberName,
    mobile: r.mobile,
    packageName: "Session request",
    serviceName: "",
    amountInr: 0,
    preferredDate: r.preferredDate,
    status: "enquiry",
    createdAt: r.createdAt,
  }));
}
