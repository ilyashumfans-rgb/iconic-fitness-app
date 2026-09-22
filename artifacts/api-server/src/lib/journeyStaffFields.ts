import { pool } from "@workspace/db";
import { z } from "zod";
import { journeyRoles } from "./memberJourneyPolicy";

export async function journeyStaffFields(body: Record<string, unknown>, permissions: string[], current?: { journeyRole?: string | null }) {
  const parsed = z.object({
    journeyGymIds: z.array(z.number().int().positive()).max(100).optional(),
    journeyRole: z.enum(journeyRoles).nullable().optional(),
  }).parse(body);
  if ((parsed.journeyRole ?? current?.journeyRole) === "corporate" && permissions.includes("journey.manage")) {
    throw new Error("Corporate journey access is read-only; remove journey.manage");
  }
  if (parsed.journeyGymIds) {
    parsed.journeyGymIds = [...new Set(parsed.journeyGymIds)];
    const { rows } = await pool.query("SELECT id FROM gyms WHERE id=ANY($1::int[])", [parsed.journeyGymIds]);
    if (rows.length !== parsed.journeyGymIds.length) throw new Error("Unknown journey branch");
  }
  return parsed;
}