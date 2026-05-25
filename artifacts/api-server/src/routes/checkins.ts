import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, checkinsTable, gymsTable, usersTable } from "@workspace/db";
import {
  ListCheckinsResponse,
  CreateCheckinBody,
  GetCheckinQrResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";

const router: IRouter = Router();

router.get("/checkins", requireUser, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(checkinsTable)
    .where(eq(checkinsTable.userId, req.userId!))
    .orderBy(desc(checkinsTable.checkedInAt))
    .limit(20);
  const gyms = await db.select().from(gymsTable);
  const out = rows.map((r) => ({
    id: r.id,
    gymId: r.gymId,
    gymName: gyms.find((g) => g.id === r.gymId)?.name ?? "GYMCO",
    checkedInAt: r.checkedInAt,
    method: r.method,
  }));
  res.json(ListCheckinsResponse.parse(out));
});

router.post("/checkins", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [g] = await db
    .select()
    .from(gymsTable)
    .where(eq(gymsTable.id, parsed.data.gymId));
  if (!g) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  const [c] = await db
    .insert(checkinsTable)
    .values({
      userId: req.userId!,
      gymId: parsed.data.gymId,
      method: parsed.data.method ?? "qr",
    })
    .returning();
  res.status(201).json({
    id: c.id,
    gymId: c.gymId,
    gymName: g.name,
    checkedInAt: c.checkedInAt,
    method: c.method,
  });
});

router.get("/checkins/qr", requireUser, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));
  // rotates every 60s
  const nowSlot = Math.floor(Date.now() / 60000);
  const token = `GYMCO|${user?.memberCode ?? "MEMBER"}|${nowSlot}|${randomBytes(4).toString("hex").toUpperCase()}`;
  const expiresAt = new Date((nowSlot + 1) * 60000);
  res.json(
    GetCheckinQrResponse.parse({
      token,
      expiresAt,
      userName: user?.name ?? "Member",
      memberCode: user?.memberCode ?? "GYMCO-0000",
    }),
  );
});

export default router;
