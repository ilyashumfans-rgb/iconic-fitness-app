import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, asc } from "drizzle-orm";
import { db, citiesTable, areasTable } from "@workspace/db";

const router: IRouter = Router();

function requireAdminOrPartner(req: Request, res: Response, next: NextFunction): void {
  if (req.session.adminId || req.session.partnerId) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

router.get("/locations/cities", async (_req, res): Promise<void> => {
  const rows = await db.select().from(citiesTable).orderBy(asc(citiesTable.name));
  res.json(rows);
});

router.get("/locations/cities/:id/areas", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const rows = await db
    .select()
    .from(areasTable)
    .where(eq(areasTable.cityId, id))
    .orderBy(asc(areasTable.name));
  res.json(rows);
});

router.get("/locations/areas", async (_req, res): Promise<void> => {
  const rows = await db.select().from(areasTable).orderBy(asc(areasTable.name));
  res.json(rows);
});

router.post("/locations/cities", requireAdminOrPartner, async (req, res): Promise<void> => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  try {
    const [created] = await db
      .insert(citiesTable)
      .values({ name, isActive: b.isActive === false ? false : true })
      .returning();
    res.status(201).json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "insert failed";
    if (/unique|duplicate/i.test(msg)) {
      res.status(409).json({ error: "City already exists" });
      return;
    }
    throw e;
  }
});

router.patch("/locations/cities/:id", requireAdminOrPartner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const b = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if (typeof b.isActive === "boolean") patch.isActive = b.isActive;
  if (!Object.keys(patch).length) {
    res.status(400).json({ error: "no fields to update" });
    return;
  }
  const [updated] = await db
    .update(citiesTable)
    .set(patch)
    .where(eq(citiesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "City not found" });
    return;
  }
  res.json(updated);
});

router.delete("/locations/cities/:id", requireAdminOrPartner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(citiesTable).where(eq(citiesTable.id, id));
  res.json({ ok: true });
});

router.post("/locations/areas", requireAdminOrPartner, async (req, res): Promise<void> => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const cityId = Number(b.cityId);
  const name = String(b.name ?? "").trim();
  if (!Number.isFinite(cityId) || !name) {
    res.status(400).json({ error: "cityId and name required" });
    return;
  }
  const [city] = await db.select().from(citiesTable).where(eq(citiesTable.id, cityId));
  if (!city) {
    res.status(400).json({ error: "City not found" });
    return;
  }
  const [created] = await db
    .insert(areasTable)
    .values({ cityId, name, isActive: b.isActive === false ? false : true })
    .returning();
  res.status(201).json(created);
});

router.patch("/locations/areas/:id", requireAdminOrPartner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const b = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if (typeof b.isActive === "boolean") patch.isActive = b.isActive;
  if (b.cityId !== undefined) {
    const cityId = Number(b.cityId);
    if (!Number.isFinite(cityId)) {
      res.status(400).json({ error: "invalid cityId" });
      return;
    }
    patch.cityId = cityId;
  }
  if (!Object.keys(patch).length) {
    res.status(400).json({ error: "no fields to update" });
    return;
  }
  const [updated] = await db
    .update(areasTable)
    .set(patch)
    .where(eq(areasTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Area not found" });
    return;
  }
  res.json(updated);
});

router.delete("/locations/areas/:id", requireAdminOrPartner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(areasTable).where(eq(areasTable.id, id));
  res.json({ ok: true });
});

export default router;
