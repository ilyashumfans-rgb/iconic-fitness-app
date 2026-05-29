import { Router, type IRouter } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
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
  // Run the seat check and the insert atomically. We lock the class_sessions
  // row (FOR UPDATE) so concurrent bookings for the same class are serialized
  // and we can never oversell beyond the available seats.
  const outcome = await db.transaction(async (tx) => {
    const [c] = await tx
      .select()
      .from(classSessionsTable)
      .where(eq(classSessionsTable.id, parsed.data.classId))
      .for("update");
    if (!c) {
      return { kind: "error" as const, status: 404, error: "Class not found" };
    }
    const [g] = await tx
      .select({ isVerified: gymsTable.isVerified })
      .from(gymsTable)
      .where(eq(gymsTable.id, c.gymId));
    if (!g || !g.isVerified) {
      return {
        kind: "error" as const,
        status: 403,
        error: "This gym is not yet verified.",
      };
    }
    // If the member already holds an active booking for this class, return it
    // (idempotent) instead of creating a duplicate or consuming another seat.
    const [activeExisting] = await tx
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.userId, req.userId!),
          eq(bookingsTable.classId, parsed.data.classId),
          ne(bookingsTable.status, "cancelled"),
        ),
      )
      .limit(1);
    if (activeExisting) {
      return { kind: "booking" as const, booking: activeExisting };
    }
    // Enforce seat capacity: only allow a booking if a seat is available.
    const [{ active }] = await tx
      .select({ active: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.classId, parsed.data.classId),
          ne(bookingsTable.status, "cancelled"),
        ),
      );
    if (active >= c.capacity) {
      return {
        kind: "error" as const,
        status: 409,
        error: "This class is full. No seats are available.",
      };
    }
    const qr = `GYMCO-${randomBytes(6).toString("hex").toUpperCase()}`;
    const [b] = await tx
      .insert(bookingsTable)
      .values({
        userId: req.userId!,
        classId: parsed.data.classId,
        status: "confirmed",
        qrCode: qr,
      })
      .returning();
    return { kind: "booking" as const, booking: b };
  });

  if (outcome.kind === "error") {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }
  const dto = await toBookingDto(outcome.booking);
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
