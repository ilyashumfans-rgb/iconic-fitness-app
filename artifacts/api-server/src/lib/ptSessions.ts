import { and, asc, eq, inArray } from "drizzle-orm";
import { db, ptSessionsTable } from "@workspace/db";
import type { PtAssignmentRefType } from "./ptAssignments";

/** Sessions included in a monthly PT program (product decision: 12/month). */
export const PT_TOTAL_SESSIONS = 12;

export type PtSessionRow = {
  id: number;
  date: string;
  time: string;
  status: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validPtSessionInput(date: string, time: string): boolean {
  return DATE_RE.test(date) && TIME_RE.test(time);
}

/** All sessions for one enrolment, soonest first. */
export async function listPtSessions(
  refType: PtAssignmentRefType,
  refId: number,
): Promise<PtSessionRow[]> {
  const rows = await db
    .select({
      id: ptSessionsTable.id,
      date: ptSessionsTable.sessionDate,
      time: ptSessionsTable.startTime,
      status: ptSessionsTable.status,
    })
    .from(ptSessionsTable)
    .where(
      and(eq(ptSessionsTable.refType, refType), eq(ptSessionsTable.refId, refId)),
    )
    .orderBy(asc(ptSessionsTable.sessionDate), asc(ptSessionsTable.startTime));
  return rows;
}

export async function addPtSession(
  refType: PtAssignmentRefType,
  refId: number,
  date: string,
  time: string,
): Promise<PtSessionRow> {
  const [row] = await db
    .insert(ptSessionsTable)
    .values({ refType, refId, sessionDate: date, startTime: time })
    .returning();
  return {
    id: row!.id,
    date: row!.sessionDate,
    time: row!.startTime,
    status: row!.status,
  };
}

/** Update a session's status, scoped to the enrolment it belongs to. */
export async function setPtSessionStatus(
  refType: PtAssignmentRefType,
  refId: number,
  sessionId: number,
  status: "scheduled" | "completed" | "cancelled",
): Promise<boolean> {
  const rows = await db
    .update(ptSessionsTable)
    .set({ status })
    .where(
      and(
        eq(ptSessionsTable.id, sessionId),
        eq(ptSessionsTable.refType, refType),
        eq(ptSessionsTable.refId, refId),
      ),
    )
    .returning({ id: ptSessionsTable.id });
  return rows.length > 0;
}

export async function deletePtSession(
  refType: PtAssignmentRefType,
  refId: number,
  sessionId: number,
): Promise<boolean> {
  const rows = await db
    .delete(ptSessionsTable)
    .where(
      and(
        eq(ptSessionsTable.id, sessionId),
        eq(ptSessionsTable.refType, refType),
        eq(ptSessionsTable.refId, refId),
      ),
    )
    .returning({ id: ptSessionsTable.id });
  return rows.length > 0;
}

/** Sessions counts for many enrolments at once (dashboards). */
export async function ptSessionCountMap(
  refType: PtAssignmentRefType,
  refIds: number[],
): Promise<Map<number, { total: number; completed: number }>> {
  if (refIds.length === 0) return new Map();
  const rows = await db
    .select({
      refId: ptSessionsTable.refId,
      status: ptSessionsTable.status,
    })
    .from(ptSessionsTable)
    .where(
      and(
        eq(ptSessionsTable.refType, refType),
        inArray(ptSessionsTable.refId, refIds),
      ),
    );
  const map = new Map<number, { total: number; completed: number }>();
  for (const r of rows) {
    const entry = map.get(r.refId) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (r.status === "completed") entry.completed += 1;
    map.set(r.refId, entry);
  }
  return map;
}
