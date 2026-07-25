import { desc, eq, and, inArray } from "drizzle-orm";
import { db, leadsTable, gymsTable } from "@workspace/db";

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
  // YoActiv branch id of the gym (0 when unmapped) — lets staff pages load
  // the branch's live trainer roster for assignment.
  branchId: number;
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
      leadStatus: leadsTable.status,
      createdAt: leadsTable.createdAt,
    })
    .from(leadsTable)
    .where(where)
    .orderBy(desc(leadsTable.createdAt))
    .limit(2000);

  const leadGymIds = Array.from(
    new Set(rows.map((r) => r.gymId ?? 0).filter((g) => g > 0)),
  );
  const branchByGym = new Map<number, number>();
  if (leadGymIds.length > 0) {
    const gyms = await db
      .select({ id: gymsTable.id, yoactivBranchId: gymsTable.yoactivBranchId })
      .from(gymsTable)
      .where(inArray(gymsTable.id, leadGymIds));
    for (const g of gyms) branchByGym.set(g.id, g.yoactivBranchId ?? 0);
  }

  return rows.map((r) => ({
    id: -r.id,
    gymId: r.gymId ?? 0,
    gymName: r.gymName,
    branchId: branchByGym.get(r.gymId ?? 0) ?? 0,
    trainerName: r.trainerName,
    memberName: r.memberName,
    mobile: r.mobile,
    packageName: "Session request",
    serviceName: "",
    amountInr: 0,
    preferredDate: r.preferredDate,
    // Cancelled leads surface as cancelled; everything else stays "enquiry".
    status: r.leadStatus === "cancelled" ? "cancelled" : "enquiry",
    createdAt: r.createdAt,
  }));
}
