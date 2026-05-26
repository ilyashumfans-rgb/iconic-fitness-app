import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import {
  db,
  bookingsTable,
  classSessionsTable,
  gymsTable,
  trainersTable,
} from "@workspace/db";
import {
  ListMyBookingsQueryParams,
  ListMyBookingsResponse,
  CreateBookingBody,
  CancelBookingParams,
  CancelBookingResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";

const router: IRouter = Router();

async function toBookingDto(b: typeof bookingsTable.$inferSelect) {
  const [c] = await db
    .select()
    .from(classSessionsTable)
    .where(eq(classSessionsTable.id, b.classId));
  const [g] = c
    ? await db.select().from(gymsTable).where(eq(gymsTable.id, c.gymId))
    : [undefined];
  const [t] = c
    ? await db.select().from(trainersTable).where(eq(trainersTable.id, c.trainerId))
    : [undefined];
  return {
    id: b.id,
    classId: b.classId,
    classTitle: c?.title ?? "Class",
    gymName: g?.name ?? "GYMCO",
    gymCity: g?.city ?? "",
    startsAt: c?.startsAt ?? new Date(),
    durationMin: c?.durationMin ?? 45,
    status: b.status,
    trainerName: t?.name ?? "GYMCO Coach",
    coverImage: c?.coverImage ?? "",
    qrCode: b.qrCode,
  };
}

router.get("/bookings", requireUser, async (req, res): Promise<void> => {
  const parsed = ListMyBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.userId, req.userId!))
    .orderBy(desc(bookingsTable.createdAt));
  const dtos = await Promise.all(rows.map(toBookingDto));
  const now = new Date();
  let filtered = dtos;
  if (parsed.data.status === "upcoming")
    filtered = dtos.filter((d) => d.status === "confirmed" && d.startsAt >= now);
  else if (parsed.data.status === "past")
    filtered = dtos.filter((d) => d.startsAt < now && d.status !== "cancelled");
  else if (parsed.data.status === "cancelled")
    filtered = dtos.filter((d) => d.status === "cancelled");
  res.json(ListMyBookingsResponse.parse(filtered));
});

router.post("/bookings", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [c] = await db
    .select()
    .from(classSessionsTable)
    .where(eq(classSessionsTable.id, parsed.data.classId));
  if (!c) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const [g] = await db
    .select({ isVerified: gymsTable.isVerified })
    .from(gymsTable)
    .where(eq(gymsTable.id, c.gymId));
  if (!g || !g.isVerified) {
    res.status(403).json({ error: "This gym is not yet verified." });
    return;
  }
  const [existing] = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.userId, req.userId!),
        eq(bookingsTable.classId, parsed.data.classId),
      ),
    );
  if (existing && existing.status !== "cancelled") {
    const dto = await toBookingDto(existing);
    res.status(201).json(dto);
    return;
  }
  const qr = `GYMCO-${randomBytes(6).toString("hex").toUpperCase()}`;
  const [b] = await db
    .insert(bookingsTable)
    .values({
      userId: req.userId!,
      classId: parsed.data.classId,
      status: "confirmed",
      qrCode: qr,
    })
    .returning();
  const dto = await toBookingDto(b);
  res.status(201).json(dto);
});

router.delete("/bookings/:bookingId", requireUser, async (req, res): Promise<void> => {
  const params = CancelBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [b] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(bookingsTable.id, params.data.bookingId),
        eq(bookingsTable.userId, req.userId!),
      ),
    )
    .returning();
  if (!b) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const dto = await toBookingDto(b);
  res.json(CancelBookingResponse.parse(dto));
});

export default router;
