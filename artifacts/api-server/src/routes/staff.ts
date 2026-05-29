import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  staffTable,
  partnersTable,
  partnerDocumentsTable,
  amenitiesTable,
  gymsTable,
} from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/adminAuth";
import {
  STAFF_PERMISSIONS,
  loadStaffOrUnauthorized,
  requireStaff,
  requireStaffPermission,
} from "../lib/staffAuth";

const router: IRouter = Router();

const VALID_KINDS = new Set(["gym", "vendor", "both"]);
const VALID_PARTNER_STATUSES = new Set(["pending", "active", "suspended"]);

// ───────────────────────────── Auth ─────────────────────────────

router.post(
  "/staff/login",
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = (req.body ?? {}) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const [row] = await db
      .select()
      .from(staffTable)
      .where(eq(staffTable.email, email.toLowerCase().trim()));
    if (!row) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!row.isActive) {
      res
        .status(403)
        .json({ error: "Your staff account has been deactivated." });
      return;
    }
    const ok = await verifyPassword(password, row.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.staffId = row.id;
    req.session.staffEmail = row.email;
    req.session.staffName = row.name;
    req.session.staffPermissions = row.permissions ?? [];
    res.json({
      id: row.id,
      email: row.email,
      name: row.name,
      permissions: row.permissions ?? [],
    });
  },
);

router.post(
  "/staff/logout",
  (req: Request, res: Response): void => {
    // Only clear staff session keys so a shared browser session that's also
    // signed into admin/partner/vendor portals isn't logged out of those.
    delete req.session.staffId;
    delete req.session.staffEmail;
    delete req.session.staffName;
    delete req.session.staffPermissions;
    res.json({ ok: true });
  },
);

router.get(
  "/staff/me",
  async (req: Request, res: Response): Promise<void> => {
    const staff = await loadStaffOrUnauthorized(req, res);
    if (!staff) return;
    res.json(staff);
  },
);

router.get(
  "/staff/permissions",
  requireStaff,
  (_req: Request, res: Response): void => {
    res.json({ permissions: STAFF_PERMISSIONS });
  },
);

// ───────────────────────────── Partners (view) ─────────────────────────────

router.get(
  "/staff/partners",
  requireStaffPermission("partner.view"),
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: partnersTable.id,
        name: partnersTable.name,
        email: partnersTable.email,
        phone: partnersTable.phone,
        status: partnersTable.status,
        city: partnersTable.city,
        kind: partnersTable.kind,
        createdAt: partnersTable.createdAt,
      })
      .from(partnersTable)
      .orderBy(desc(partnersTable.createdAt));
    res.json(rows);
  },
);

// ───────────────────────────── Partner Onboarding ─────────────────────────────

router.get(
  "/staff/amenities",
  requireStaffPermission("partner.onboard"),
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(amenitiesTable)
      .where(eq(amenitiesTable.isActive, true));
    res.json(rows);
  },
);

router.post(
  "/staff/partners",
  requireStaffPermission("partner.onboard"),
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, phone, city, password, notes, kind, amenityIds } =
      (req.body ?? {}) as {
        name?: string;
        email?: string;
        phone?: string;
        city?: string;
        password?: string;
        notes?: string;
        kind?: string;
        amenityIds?: number[];
      };
    if (!name || !email || !phone || !city || !password) {
      res
        .status(400)
        .json({ error: "name, email, phone, city, password required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 chars" });
      return;
    }
    const partnerKind = kind && VALID_KINDS.has(kind) ? kind : "gym";
    const passwordHash = await hashPassword(password);

    const rawIds = Array.isArray(amenityIds)
      ? Array.from(new Set(amenityIds.map((n) => Number(n)).filter(Boolean)))
      : [];
    let pendingAmenityIds: number[] = [];
    if (rawIds.length > 0) {
      const valid = await db
        .select({ id: amenitiesTable.id })
        .from(amenitiesTable)
        .where(
          and(
            inArray(amenitiesTable.id, rawIds),
            eq(amenitiesTable.isActive, true),
          ),
        );
      pendingAmenityIds = valid.map((v) => v.id);
    }

    try {
      const [created] = await db
        .insert(partnersTable)
        .values({
          name,
          email: email.toLowerCase(),
          phone,
          city,
          notes: notes ?? "",
          kind: partnerKind,
          passwordHash,
          pendingAmenityIds,
        })
        .returning();
      res.status(201).json({
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        status: created.status,
        city: created.city,
        kind: created.kind,
        createdAt: created.createdAt,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create partner";
      if (/unique|duplicate/i.test(msg)) {
        res.status(409).json({ error: "A partner with this email already exists" });
        return;
      }
      res.status(500).json({ error: msg });
    }
  },
);

// ───────────────────────────── Reset Partner Password ─────────────────────────────

router.post(
  "/staff/partners/:id/reset-password",
  requireStaffPermission("partner.assign_login"),
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid partner id" });
      return;
    }
    const { password } = (req.body ?? {}) as { password?: string };
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 chars" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [updated] = await db
      .update(partnersTable)
      .set({ passwordHash })
      .where(eq(partnersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }
    res.json({ ok: true });
  },
);

router.patch(
  "/staff/partners/:id",
  requireStaffPermission("partner.onboard"),
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid partner id" });
      return;
    }
    const { name, phone, city, status } = (req.body ?? {}) as Record<
      string,
      string | undefined
    >;
    const patch: Record<string, string> = {};
    if (name !== undefined) patch.name = String(name);
    if (phone !== undefined) patch.phone = String(phone);
    if (city !== undefined) patch.city = String(city);
    if (status !== undefined) {
      if (!VALID_PARTNER_STATUSES.has(String(status))) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      patch.status = String(status);
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [updated] = await db
      .update(partnersTable)
      .set(patch)
      .where(eq(partnersTable.id, id))
      .returning({
        id: partnersTable.id,
        name: partnersTable.name,
        email: partnersTable.email,
        phone: partnersTable.phone,
        status: partnersTable.status,
        city: partnersTable.city,
        kind: partnersTable.kind,
        createdAt: partnersTable.createdAt,
      });
    if (!updated) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }
    res.json(updated);
  },
);

// Sign in as a partner: opens the partner's session in the same browser.
// Staff and partner sessions are independent, so the staff member stays
// signed in to /staff after this call.
router.post(
  "/staff/partners/:id/impersonate",
  requireStaffPermission("partner.assign_login"),
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid partner id" });
      return;
    }
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, id));
    if (!partner) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }
    if (partner.status === "suspended") {
      res.status(400).json({
        error: "Cannot sign in as a suspended partner. Reactivate first.",
      });
      return;
    }
    req.session.partnerId = partner.id;
    req.session.partnerEmail = partner.email;
    req.session.partnerName = partner.name;
    res.json({ ok: true, redirectTo: "/partner" });
  },
);

// ───────────────────────────── Partner Documents ─────────────────────────────

router.get(
  "/staff/partners/:id/documents",
  requireStaffPermission("partner.document_upload"),
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid partner id" });
      return;
    }
    const [partner] = await db
      .select({ id: partnersTable.id, name: partnersTable.name })
      .from(partnersTable)
      .where(eq(partnersTable.id, id));
    if (!partner) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }
    const docs = await db
      .select()
      .from(partnerDocumentsTable)
      .where(eq(partnerDocumentsTable.partnerId, id))
      .orderBy(desc(partnerDocumentsTable.uploadedAt));
    res.json({ partner, documents: docs });
  },
);

router.post(
  "/staff/partners/:id/documents",
  requireStaffPermission("partner.document_upload"),
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid partner id" });
      return;
    }
    const { name, url, notes } = (req.body ?? {}) as {
      name?: string;
      url?: string;
      notes?: string;
    };
    if (!name || !url) {
      res.status(400).json({ error: "Document name and URL required" });
      return;
    }
    const [partner] = await db
      .select({ id: partnersTable.id })
      .from(partnersTable)
      .where(eq(partnersTable.id, id));
    if (!partner) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }
    const [created] = await db
      .insert(partnerDocumentsTable)
      .values({
        partnerId: id,
        name,
        url,
        notes: notes ?? "",
        uploadedByKind: "staff",
        uploadedByEmail: req.session.staffEmail ?? "",
      })
      .returning();
    res.status(201).json(created);
  },
);

router.delete(
  "/staff/partners/:id/documents/:docId",
  requireStaffPermission("partner.document_upload"),
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const docId = Number(req.params.docId);
    if (
      !Number.isFinite(id) ||
      id <= 0 ||
      !Number.isFinite(docId) ||
      docId <= 0
    ) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(partnerDocumentsTable)
      .where(
        and(
          eq(partnerDocumentsTable.id, docId),
          eq(partnerDocumentsTable.partnerId, id),
        ),
      );
    res.json({ ok: true });
  },
);

// ───────────────────────────── Gym Management ─────────────────────────────

// Resolves an incoming ownerPartnerId value to either null (unassigned),
// a validated existing partner id, or an error string.
async function resolveOwnerPartnerId(
  value: unknown,
): Promise<{ ok: true; value: number | null } | { ok: false; error: string }> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return { ok: false, error: "Invalid ownerPartnerId" };
  }
  const [partner] = await db
    .select({ id: partnersTable.id })
    .from(partnersTable)
    .where(eq(partnersTable.id, n))
    .limit(1);
  if (!partner) {
    return { ok: false, error: "Partner not found" };
  }
  return { ok: true, value: n };
}

// Lightweight partner list for the gym assignment dropdown, available to
// staff with gym.manage (who may not have partner.view).
router.get(
  "/staff/gym-partners",
  requireStaffPermission("gym.manage"),
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: partnersTable.id,
        name: partnersTable.name,
        email: partnersTable.email,
        phone: partnersTable.phone,
        status: partnersTable.status,
        city: partnersTable.city,
        kind: partnersTable.kind,
        createdAt: partnersTable.createdAt,
      })
      .from(partnersTable)
      .orderBy(desc(partnersTable.createdAt));
    res.json(rows);
  },
);

router.get(
  "/staff/gyms",
  requireStaffPermission("gym.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const partnerIdParam = req.query.partnerId;
    let partnerId: number | undefined;
    if (typeof partnerIdParam === "string" && partnerIdParam.length > 0) {
      const n = Number(partnerIdParam);
      if (!Number.isFinite(n) || n <= 0) {
        res.status(400).json({ error: "Invalid partnerId" });
        return;
      }
      partnerId = n;
    }
    const baseQuery = db
      .select({
        id: gymsTable.id,
        name: gymsTable.name,
        slug: gymsTable.slug,
        city: gymsTable.city,
        area: gymsTable.area,
        address: gymsTable.address,
        heroImage: gymsTable.heroImage,
        logoUrl: gymsTable.logoUrl,
        priceFrom: gymsTable.priceFrom,
        openNow: gymsTable.openNow,
        rating: gymsTable.rating,
        lat: gymsTable.lat,
        lng: gymsTable.lng,
        isVerified: gymsTable.isVerified,
        ownerPartnerId: gymsTable.ownerPartnerId,
        partnerName: partnersTable.name,
      })
      .from(gymsTable)
      .leftJoin(partnersTable, eq(gymsTable.ownerPartnerId, partnersTable.id));
    const rows = await (partnerId !== undefined
      ? baseQuery.where(eq(gymsTable.ownerPartnerId, partnerId))
      : baseQuery
    ).orderBy(desc(gymsTable.id));
    res.json(rows);
  },
);

router.post(
  "/staff/gyms",
  requireStaffPermission("gym.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name || !b.city || !b.area) {
      res.status(400).json({ error: "name, city, area required" });
      return;
    }
    const slug =
      (b.slug as string | undefined) ??
      String(b.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const latNum = b.lat === undefined || b.lat === null || b.lat === "" ? undefined : Number(b.lat);
    const lngNum = b.lng === undefined || b.lng === null || b.lng === "" ? undefined : Number(b.lng);
    const owner = await resolveOwnerPartnerId(b.ownerPartnerId);
    if (!owner.ok) {
      res.status(400).json({ error: owner.error });
      return;
    }
    const [created] = await db
      .insert(gymsTable)
      .values({
        name: String(b.name),
        slug,
        city: String(b.city),
        area: String(b.area),
        address: String(b.address ?? ""),
        heroImage: String(
          b.heroImage ??
            "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
        ),
        rating: 4.5,
        reviewsCount: 0,
        priceFrom: Number(b.priceFrom ?? 999),
        categories: ["gym"],
        amenities: [],
        distanceKm: 2.5,
        openNow: b.openNow === undefined ? true : Boolean(b.openNow),
        about: String(b.about ?? ""),
        gallery: [],
        hours: String(b.hours ?? "6am – 11pm"),
        lat: latNum !== undefined && Number.isFinite(latNum) ? latNum : 12.97,
        lng: lngNum !== undefined && Number.isFinite(lngNum) ? lngNum : 77.59,
        isVerified: Boolean(b.isVerified ?? false),
        ownerPartnerId:
          owner.value,
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/staff/gyms/:id",
  requireStaffPermission("gym.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid gym id" });
      return;
    }
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of [
      "name",
      "address",
      "area",
      "city",
      "about",
      "hours",
      "heroImage",
      "logoUrl",
    ]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    if (b.priceFrom !== undefined) patch.priceFrom = Number(b.priceFrom);
    for (const k of ["lat", "lng"]) {
      if (b[k] !== undefined && b[k] !== null && b[k] !== "") {
        const n = Number(b[k]);
        if (Number.isFinite(n)) patch[k] = n;
      }
    }
    if (b.openNow !== undefined) patch.openNow = Boolean(b.openNow);
    if (b.isVerified !== undefined) patch.isVerified = Boolean(b.isVerified);
    if (b.ownerPartnerId !== undefined) {
      const owner = await resolveOwnerPartnerId(b.ownerPartnerId);
      if (!owner.ok) {
        res.status(400).json({ error: owner.error });
        return;
      }
      patch.ownerPartnerId = owner.value;
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [updated] = await db
      .update(gymsTable)
      .set(patch)
      .where(eq(gymsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Gym not found" });
      return;
    }
    res.json(updated);
  },
);

export default router;
