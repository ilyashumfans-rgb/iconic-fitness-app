import { asc, eq } from "drizzle-orm";
import { db, groupClassScheduleTable } from "@workspace/db";
import {
  DEFAULT_GROUP_CLASS_SCHEDULE,
  type GroupClassScheduleEntry,
} from "./groupClassSchedule";

// Resolve the effective weekly GX timetable for a gym: the partner's customised
// rows if any exist, otherwise the shared default template. Single source of
// truth shared by the member schedule endpoint and the GX booking validator.
export async function resolveGymSchedule(
  gymId: number,
): Promise<GroupClassScheduleEntry[]> {
  const rows = await db
    .select()
    .from(groupClassScheduleTable)
    .where(eq(groupClassScheduleTable.gymId, gymId))
    .orderBy(
      asc(groupClassScheduleTable.dayOfWeek),
      asc(groupClassScheduleTable.sortOrder),
    );
  if (rows.length > 0) {
    return rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      className: r.className,
      sortOrder: r.sortOrder,
    }));
  }
  return DEFAULT_GROUP_CLASS_SCHEDULE.map((e) => ({ ...e }));
}
