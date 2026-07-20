import { inArray, and, eq } from "drizzle-orm";
import {
  db,
  ptTrainerAssignmentsTable,
  trainerBookingsTable,
  leadsTable,
} from "@workspace/db";
import { TRAINER_ENQUIRY_SOURCE } from "./trainerEnquiryLeads";

/**
 * Staff-assigned trainer for a PT enrolment (paid booking or enquiry lead).
 * Keyed by refType + refId with a DB unique index; reassigning upserts.
 * Enquiry rows are surfaced with negative ids in merged booking lists, so
 * callers translate: merged id > 0 → ("booking", id), < 0 → ("enquiry", -id).
 */
export type PtAssignmentRefType = "booking" | "enquiry";

export type PtAssignment = {
  trainerId: string;
  trainerName: string;
};

/** Map of `${refType}:${refId}` → assignment for the given ids. */
export async function fetchPtAssignmentMap(
  refType: PtAssignmentRefType,
  refIds: number[],
): Promise<Map<number, PtAssignment>> {
  if (refIds.length === 0) return new Map();
  const rows = await db
    .select({
      refId: ptTrainerAssignmentsTable.refId,
      trainerId: ptTrainerAssignmentsTable.trainerId,
      trainerName: ptTrainerAssignmentsTable.trainerName,
    })
    .from(ptTrainerAssignmentsTable)
    .where(
      and(
        eq(ptTrainerAssignmentsTable.refType, refType),
        inArray(ptTrainerAssignmentsTable.refId, refIds),
      ),
    );
  return new Map(
    rows.map((r) => [
      r.refId,
      { trainerId: r.trainerId, trainerName: r.trainerName },
    ]),
  );
}

/**
 * Resolve a merged-list id (positive = trainer_bookings row, negative =
 * enquiry lead) to the gym it belongs to, for ownership checks.
 * Returns null when the target row does not exist (or, for enquiries, is
 * not actually a PT enquiry lead).
 */
export async function ptAssignTargetGymId(
  mergedId: number,
): Promise<number | null> {
  if (mergedId > 0) {
    const [row] = await db
      .select({ gymId: trainerBookingsTable.gymId })
      .from(trainerBookingsTable)
      .where(eq(trainerBookingsTable.id, mergedId))
      .limit(1);
    return row ? row.gymId : null;
  }
  const [lead] = await db
    .select({ gymId: leadsTable.gymId })
    .from(leadsTable)
    .where(
      and(
        eq(leadsTable.id, -mergedId),
        eq(leadsTable.source, TRAINER_ENQUIRY_SOURCE),
        eq(leadsTable.kind, "general"),
      ),
    )
    .limit(1);
  return lead ? (lead.gymId ?? 0) : null;
}

/** Assign (or reassign) a trainer to a booking/enquiry. */
export async function upsertPtAssignment(
  refType: PtAssignmentRefType,
  refId: number,
  trainerId: string,
  trainerName: string,
): Promise<void> {
  await db
    .insert(ptTrainerAssignmentsTable)
    .values({ refType, refId, trainerId, trainerName })
    .onConflictDoUpdate({
      target: [
        ptTrainerAssignmentsTable.refType,
        ptTrainerAssignmentsTable.refId,
      ],
      set: { trainerId, trainerName, assignedAt: new Date() },
    });
}
