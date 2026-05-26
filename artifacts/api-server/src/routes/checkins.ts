import { Router, type IRouter } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
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
  if (!g.isVerified) {
    res.status(403).json({ error: "This gym is not yet verified." });
    return;
  }
  // Anti-abuse: one paid check-in per user per gym per calendar day (Asia/Kolkata)
  const istParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const part = (t: string) =>
    istParts.find((p) => p.type === t)?.value ?? "00";
  // milliseconds elapsed since IST midnight today
  const istMsSinceMidnight =
    (Number(part("hour")) * 3600 +
      Number(part("minute")) * 60 +
      Number(part("second"))) *
    1000;
  const startOfIstDay = new Date(Date.now() - istMsSinceMidnight);
  const [recent] = await db
    .select({ id: checkinsTable.id, checkedInAt: checkinsTable.checkedInAt })
    .from(checkinsTable)
    .where(
      and(
        eq(checkinsTable.userId, req.userId!),
        eq(checkinsTable.gymId, parsed.data.gymId),
        gte(checkinsTable.checkedInAt, startOfIstDay),
      ),
    )
    .orderBy(desc(checkinsTable.checkedInAt))
    .limit(1);
  if (recent) {
    res.status(409).json({
      error: "Already checked in to this gym today.",
      lastCheckinAt: recent.checkedInAt,
    });
    return;
  }
  // Snapshot payout at moment of check-in
  const base = Number(g.payoutPerVisitInr ?? 0);
  const taxPct = Number(g.payoutTaxPct ?? 0);
  const taxInr = Math.round((base * taxPct) / 100);
  const payoutInr = base + taxInr;
  let c;
  try {
    [c] = await db
      .insert(checkinsTable)
      .values({
        userId: req.userId!,
        gymId: parsed.data.gymId,
        method: parsed.data.method ?? "qr",
        baseInr: base,
        taxPct,
        taxInr,
        payoutInr,
      })
      .returning();
  } catch (e: unknown) {
    // Postgres unique_violation = 23505 — race-condition double-scan
    if ((e as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "Already checked in to this gym today." });
      return;
    }
    throw e;
  }
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
