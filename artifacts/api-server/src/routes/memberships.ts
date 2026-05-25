import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, membershipsTable, userMembershipsTable } from "@workspace/db";
import {
  ListMembershipsResponse,
  GetMyMembershipResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";

const router: IRouter = Router();

router.get("/memberships", async (_req, res): Promise<void> => {
  const rows = await db.select().from(membershipsTable);
  res.json(ListMembershipsResponse.parse(rows));
});

router.get("/memberships/mine", requireUser, async (req, res): Promise<void> => {
  const [um] = await db
    .select()
    .from(userMembershipsTable)
    .where(eq(userMembershipsTable.userId, req.userId!));
  if (!um) {
    res.json(null);
    return;
  }
  const [plan] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.id, um.planId));
  res.json(
    GetMyMembershipResponse.parse({
      planId: um.planId,
      planName: plan?.name ?? "GYMCO Member",
      renewsOn: um.renewsOn,
      classesUsed: um.classesUsed,
      classesIncluded: plan?.classesPerMonth ?? 0,
      gymsAccessed: um.gymsAccessed,
      status: um.status,
    }),
  );
});

export default router;
