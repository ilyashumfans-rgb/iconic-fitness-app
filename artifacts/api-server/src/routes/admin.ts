import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  adminsTable,
  partnersTable,
  partnerLoginTokensTable,
  gymsTable,
  agencyUsersTable,
  trainersTable,
  classSessionsTable,
  membershipsTable,
  userMembershipsTable,
  usersTable,
  bookingsTable,
  checkinsTable,
  productsTable,
  productOrdersTable,
  productOrderItemsTable,
  productCategoriesTable,
  amenitiesTable,
  workoutsTable,
  staffTable,
  partnerDocumentsTable,
  trainerBookingsTable,
} from "@workspace/db";
import {
  hashPassword,
  requireAdmin,
  requireSuperAdmin,
  verifyPassword,
} from "../lib/adminAuth";
import { STAFF_PERMISSIONS } from "../lib/staffAuth";
import { forceReseedFromSnapshot } from "../lib/seedFromSnapshot";
import {
  fetchYoactivMemberByMobile,
  fetchYoactivMemberList,
  fetchYoactivBranchTrainers,
  yoactivConfigured,
  yoactivKeyConfigs,
} from "../lib/yoactiv";
import { yoactivBranchName } from "../lib/yoactivBranchNames";
import {
  trainerPhotoMap,
  setTrainerPhoto,
  removeTrainerPhoto,
  memberPhotoMap,
  setMemberPhoto,
  removeMemberPhoto,
} from "../lib/trainerPhotos";
import { DEFAULT_PRODUCT_CATEGORIES } from "../lib/productCategories.js";

const loadAdminRole = async (id: number): Promise<string | undefined> => {
  const [row] = await db
    .select({ role: adminsTable.role })
    .from(adminsTable)
    .where(eq(adminsTable.id, id))
    .limit(1);
  return row?.role;
};
const superAdminGuard = requireSuperAdmin(loadAdminRole);
import { getAuth, clerkClient } from "@clerk/express";

// Hard-coded admin allowlist for Google sign-in, plus an optional
// comma-separated env override (ADMIN_GOOGLE_ALLOWLIST).
const ADMIN_GOOGLE_ALLOWLIST: ReadonlySet<string> = new Set(
  [
    "ilyashumfans@gmail.com",
    ...(process.env.ADMIN_GOOGLE_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  ].map((e) => e.toLowerCase()),
);

const router: IRouter = Router();

// ───────────────────────────── Auth ─────────────────────────────

router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = (req.body ?? {}) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.email, email.toLowerCase().trim()));
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  req.session.adminName = admin.name;
  res.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
});

// Google (Clerk) sign-in for admins. Requires a verified Clerk session;
// looks up the user's primary email and admits them only if it appears in
// the admin allowlist. JIT-provisions an admins row on first login so the
// existing /admin/me + requireAdmin flow keeps working unchanged.
router.post(
  "/admin/google-login",
  async (req: Request, res: Response): Promise<void> => {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;
    if (!clerkUserId) {
      res.status(401).json({ error: "Sign in with Google first" });
      return;
    }
    let email = "";
    let verified = false;
    let name = "Admin";
    try {
      const u = await clerkClient.users.getUser(clerkUserId);
      const primaryId = u.primaryEmailAddressId;
      const primary =
        u.emailAddresses.find((e) => e.id === primaryId) ?? u.emailAddresses[0];
      email = (primary?.emailAddress ?? "").toLowerCase().trim();
      verified = primary?.verification?.status === "verified";
      const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      name = full || u.username || email.split("@")[0] || "Admin";
    } catch (err) {
      req.log?.error({ err }, "Clerk user lookup failed in admin google-login");
      res.status(502).json({ error: "Could not verify Google account" });
      return;
    }
    if (!email || !verified) {
      res.status(403).json({ error: "Email not verified by Google" });
      return;
    }
    if (!ADMIN_GOOGLE_ALLOWLIST.has(email)) {
      res
        .status(403)
        .json({ error: "This Google account is not authorized for admin access" });
      return;
    }
    // Find or create the admin row. We don't store a usable password for
    // Google-only admins — set a random unguessable hash so the password
    // login path can never accidentally accept them. Use an upsert (do
    // nothing on conflict) + re-select to be race-safe across concurrent
    // first-time logins for the same email.
    const randomHash = await hashPassword(
      `google:${clerkUserId}:${Date.now()}:${Math.random()}`,
    );
    await db
      .insert(adminsTable)
      .values({
        email,
        passwordHash: randomHash,
        name,
        role: "admin",
      })
      .onConflictDoNothing({ target: adminsTable.email });
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.email, email));
    if (!admin) {
      res.status(500).json({ error: "Admin provisioning failed" });
      return;
    }
    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    req.session.adminName = admin.name;
    res.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  },
);

router.post("/admin/logout", (req: Request, res: Response): void => {
  // Only clear admin keys so a separately signed-in partner on the same
  // browser session stays signed in (and vice versa).
  delete req.session.adminId;
  delete req.session.adminEmail;
  delete req.session.adminName;
  res.json({ ok: true });
});

router.get("/admin/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, req.session.adminId));
  if (!admin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
});

// ───────────────────────────── Admin Users ─────────────────────────────

const ADMIN_ROLES = ["admin", "superadmin"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

router.get(
  "/admin/admins",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: adminsTable.id,
        email: adminsTable.email,
        name: adminsTable.name,
        role: adminsTable.role,
        createdAt: adminsTable.createdAt,
      })
      .from(adminsTable)
      .orderBy(asc(adminsTable.id));
    res.json(rows);
  },
);

router.post(
  "/admin/admins",
  requireAdmin,
  superAdminGuard,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const email = String(b.email ?? "").toLowerCase().trim();
    const password = String(b.password ?? "");
    const name = String(b.name ?? "").trim();
    if (b.role !== undefined && !ADMIN_ROLES.includes(b.role as AdminRole)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    const role = (b.role as AdminRole) ?? "admin";
    if (!email || !password || !name) {
      res.status(400).json({ error: "name, email, password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const [existing] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.email, email))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "An admin with this email already exists" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(adminsTable)
      .values({ email, name, role, passwordHash })
      .returning({
        id: adminsTable.id,
        email: adminsTable.email,
        name: adminsTable.name,
        role: adminsTable.role,
        createdAt: adminsTable.createdAt,
      });
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/admins/:id/role",
  requireAdmin,
  superAdminGuard,
  async (req: Request, res: Response): Promise<void> => {
    const meId = req.session.adminId!;
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as { role?: string };
    if (!ADMIN_ROLES.includes(b.role as AdminRole)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    const role = b.role as AdminRole;
    try {
      const updated = await db.transaction(async (tx) => {
        const [target] = await tx
          .select()
          .from(adminsTable)
          .where(eq(adminsTable.id, id))
          .limit(1);
        if (!target) return null;
        // Block demoting the last remaining superadmin (whether self or other).
        if (target.role === "superadmin" && role !== "superadmin") {
          const [{ c }] = await tx
            .select({ c: sql<number>`count(*)::int` })
            .from(adminsTable)
            .where(eq(adminsTable.role, "superadmin"));
          if ((c ?? 0) <= 1) {
            throw new Error("LAST_SUPERADMIN");
          }
        }
        // Extra safety: don't let an admin demote themselves to a lower role
        // and lock themselves out of this page — already covered by the above,
        // but explicit for self-demote when other supers exist is fine.
        if (id === meId && role !== "superadmin") {
          // allowed only if more than one superadmin exists (checked above)
        }
        const [row] = await tx
          .update(adminsTable)
          .set({ role })
          .where(eq(adminsTable.id, id))
          .returning({
            id: adminsTable.id,
            email: adminsTable.email,
            name: adminsTable.name,
            role: adminsTable.role,
          });
        return row;
      });
      if (!updated) {
        res.status(404).json({ error: "Admin not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message === "LAST_SUPERADMIN") {
        res
          .status(400)
          .json({ error: "Cannot demote the last remaining superadmin" });
        return;
      }
      throw err;
    }
  },
);

router.post(
  "/admin/admins/:id/reset-password",
  requireAdmin,
  superAdminGuard,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const password = String((req.body ?? {}).password ?? "");
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [updated] = await db
      .update(adminsTable)
      .set({ passwordHash })
      .where(eq(adminsTable.id, id))
      .returning({ id: adminsTable.id });
    if (!updated) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    res.json({ ok: true });
  },
);

router.delete(
  "/admin/admins/:id",
  requireAdmin,
  superAdminGuard,
  async (req: Request, res: Response): Promise<void> => {
    const meId = req.session.adminId!;
    const id = Number(req.params.id);
    if (id === meId) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }
    try {
      const result = await db.transaction(async (tx) => {
        const [target] = await tx
          .select()
          .from(adminsTable)
          .where(eq(adminsTable.id, id))
          .limit(1);
        if (!target) return { notFound: true } as const;
        if (target.role === "superadmin") {
          const [{ c }] = await tx
            .select({ c: sql<number>`count(*)::int` })
            .from(adminsTable)
            .where(eq(adminsTable.role, "superadmin"));
          if ((c ?? 0) <= 1) {
            throw new Error("LAST_SUPERADMIN");
          }
        }
        await tx.delete(adminsTable).where(eq(adminsTable.id, id));
        return { ok: true } as const;
      });
      if ("notFound" in result) {
        res.status(404).json({ error: "Admin not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof Error && err.message === "LAST_SUPERADMIN") {
        res
          .status(400)
          .json({ error: "Cannot delete the last remaining superadmin" });
        return;
      }
      throw err;
    }
  },
);

// ───────────────────────────── Agency Accounts ─────────────────────────────

function parseGymIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(ids));
}

router.get(
  "/admin/agencies",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: agencyUsersTable.id,
        username: agencyUsersTable.username,
        name: agencyUsersTable.name,
        gymIds: agencyUsersTable.gymIds,
        createdAt: agencyUsersTable.createdAt,
      })
      .from(agencyUsersTable)
      .orderBy(asc(agencyUsersTable.id));
    res.json(rows);
  },
);

router.post(
  "/admin/agencies",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const username = String(b.username ?? "").trim();
    const password = String(b.password ?? "");
    const name = String(b.name ?? "").trim();
    const gymIds = parseGymIds(b.gymIds);
    if (!username || !password || !name) {
      res
        .status(400)
        .json({ error: "name, username, password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const [existing] = await db
      .select({ id: agencyUsersTable.id })
      .from(agencyUsersTable)
      .where(eq(agencyUsersTable.username, username))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "That username is already taken" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(agencyUsersTable)
      .values({ username, name, passwordHash, gymIds })
      .returning({
        id: agencyUsersTable.id,
        username: agencyUsersTable.username,
        name: agencyUsersTable.name,
        gymIds: agencyUsersTable.gymIds,
        createdAt: agencyUsersTable.createdAt,
      });
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/agencies/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const updates: { name?: string; gymIds?: number[]; username?: string } = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) {
        res.status(400).json({ error: "Name cannot be empty" });
        return;
      }
      updates.name = name;
    }
    if (b.username !== undefined) {
      const username = String(b.username).trim();
      if (!username) {
        res.status(400).json({ error: "Username cannot be empty" });
        return;
      }
      const [clash] = await db
        .select({ id: agencyUsersTable.id })
        .from(agencyUsersTable)
        .where(eq(agencyUsersTable.username, username))
        .limit(1);
      if (clash && clash.id !== id) {
        res.status(409).json({ error: "That username is already taken" });
        return;
      }
      updates.username = username;
    }
    if (b.gymIds !== undefined) {
      updates.gymIds = parseGymIds(b.gymIds);
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }
    const [updated] = await db
      .update(agencyUsersTable)
      .set(updates)
      .where(eq(agencyUsersTable.id, id))
      .returning({
        id: agencyUsersTable.id,
        username: agencyUsersTable.username,
        name: agencyUsersTable.name,
        gymIds: agencyUsersTable.gymIds,
        createdAt: agencyUsersTable.createdAt,
      });
    if (!updated) {
      res.status(404).json({ error: "Agency account not found" });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/admin/agencies/:id/reset-password",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const password = String((req.body ?? {}).password ?? "");
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [updated] = await db
      .update(agencyUsersTable)
      .set({ passwordHash })
      .where(eq(agencyUsersTable.id, id))
      .returning({ id: agencyUsersTable.id });
    if (!updated) {
      res.status(404).json({ error: "Agency account not found" });
      return;
    }
    res.json({ ok: true });
  },
);

router.delete(
  "/admin/agencies/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(agencyUsersTable)
      .where(eq(agencyUsersTable.id, id))
      .returning({ id: agencyUsersTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Agency account not found" });
      return;
    }
    res.json({ ok: true });
  },
);

// ───────────────────────────── Stats ─────────────────────────────

router.get(
  "/admin/stats",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const [
      totalPartners,
      totalGyms,
      activeMemberships,
      totalActivities,
      activeMembers,
      memberships,
      userMemberships,
      recentCheckins,
    ] = await Promise.all([
      db.$count(partnersTable),
      db.$count(gymsTable),
      db.$count(userMembershipsTable, eq(userMembershipsTable.status, "active")),
      db.$count(classSessionsTable),
      db.$count(usersTable),
      db.select().from(membershipsTable),
      db.select().from(userMembershipsTable),
      db
        .select()
        .from(checkinsTable)
        .orderBy(desc(checkinsTable.checkedInAt))
        .limit(8),
    ]);

    // Revenue = sum of priceInr for each active user membership
    const planMap = new Map(memberships.map((m) => [m.id, m.priceInr]));
    const monthlyRevenue = userMemberships
      .filter((um) => um.status === "active")
      .reduce((sum, um) => sum + (planMap.get(um.planId) ?? 0), 0);

    // Activity series (last 7 days check-ins)
    const now = new Date();
    const series: { day: string; checkins: number; bookings: number }[] = [];
    const allBookings = await db.select().from(bookingsTable);
    const allCheckins = await db.select().from(checkinsTable);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const checkins = allCheckins.filter(
        (c) => c.checkedInAt >= dayStart && c.checkedInAt <= dayEnd,
      ).length;
      const bookings = allBookings.filter(
        (b) => b.createdAt >= dayStart && b.createdAt <= dayEnd,
      ).length;
      series.push({ day: label, checkins, bookings });
    }

    // Membership type distribution
    const counts = new Map<number, number>();
    for (const um of userMemberships) {
      counts.set(um.planId, (counts.get(um.planId) ?? 0) + 1);
    }
    // Top 3 memberships, then add seed counts for visual completeness if zero
    const types = memberships
      .map((m) => ({
        name: m.name,
        value: counts.get(m.id) ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    res.json({
      totalPartners,
      totalGyms,
      activeMemberships,
      totalActivities,
      activeMembers,
      monthlyRevenue,
      activitySeries: series,
      membershipTypes: types,
      recentCheckins,
    });
  },
);

// ───────────────────────────── Partners ─────────────────────────────

router.get(
  "/admin/partners",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(partnersTable)
      .orderBy(desc(partnersTable.createdAt));
    res.json(
      rows.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        city: p.city,
        notes: p.notes,
        kind: p.kind,
        commissionPct: p.commissionPct,
        createdAt: p.createdAt,
      })),
    );
  },
);

const VALID_KINDS = new Set(["gym", "vendor", "both"]);

function clampCommission(v: unknown): number | undefined {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}
const VALID_STATUSES = new Set(["pending", "active", "suspended"]);

router.post(
  "/admin/partners",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      email,
      phone,
      city,
      password,
      notes,
      kind,
      status,
      amenityIds,
      commissionPct,
    } = (req.body ?? {}) as {
      name?: string;
      email?: string;
      phone?: string;
      city?: string;
      password?: string;
      notes?: string;
      kind?: string;
      status?: string;
      amenityIds?: number[];
      commissionPct?: number;
    };
    if (!name || !email || !phone || !city || !password) {
      res.status(400).json({ error: "name, email, phone, city, password required" });
      return;
    }
    const partnerKind = kind && VALID_KINDS.has(kind) ? kind : "gym";
    const partnerStatus =
      status && VALID_STATUSES.has(status) ? status : undefined;
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

    const normalizedEmail = email.toLowerCase().trim();
    // Duplicate emails are intentionally allowed — see partnersTable schema
    // comment. Each row is a distinct login disambiguated by password.
    let created;
    try {
      [created] = await db
        .insert(partnersTable)
        .values({
          name,
          email: normalizedEmail,
          phone,
          city,
          notes: notes ?? "",
          kind: partnerKind,
          ...(partnerStatus ? { status: partnerStatus } : {}),
          ...(clampCommission(commissionPct) !== undefined
            ? { commissionPct: clampCommission(commissionPct) }
            : {}),
          passwordHash,
          pendingAmenityIds,
        })
        .returning();
    } catch (e: unknown) {
      req.log.error({ err: e }, "Failed to insert partner");
      res.status(500).json({
        error:
          e instanceof Error ? e.message : "Failed to create partner.",
      });
      return;
    }
    res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      status: created.status,
      city: created.city,
      notes: created.notes,
      kind: created.kind,
      commissionPct: created.commissionPct,
      createdAt: created.createdAt,
    });
  },
);

router.patch(
  "/admin/partners/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { name, phone, status, city, notes, kind, commissionPct } =
      (req.body ?? {}) as Record<string, unknown>;
    const commission = clampCommission(commissionPct);
    const [updated] = await db
      .update(partnersTable)
      .set({
        ...(name !== undefined && { name: String(name) }),
        ...(phone !== undefined && { phone: String(phone) }),
        ...(status !== undefined && { status: String(status) }),
        ...(city !== undefined && { city: String(city) }),
        ...(notes !== undefined && { notes: String(notes) }),
        ...(typeof kind === "string" && VALID_KINDS.has(kind) && { kind }),
        ...(commissionPct !== undefined && commission !== undefined
          ? { commissionPct: commission }
          : {}),
      })
      .where(eq(partnersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/admin/partners/:id/reset-password",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
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
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  },
);

router.delete(
  "/admin/partners/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    // Remove this partner's store products too. Past order items snapshot
    // productName/unitPriceInr, so order history stays intact without them.
    await db
      .delete(productsTable)
      .where(eq(productsTable.vendorPartnerId, id));
    await db.delete(partnersTable).where(eq(partnersTable.id, id));
    res.json({ ok: true });
  },
);

// Documents a partner (or staff on their behalf) has uploaded. Read-only for
// admins so they can review/verify partner paperwork.
router.get(
  "/admin/partners/:id/documents",
  requireAdmin,
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
    const documents = await db
      .select()
      .from(partnerDocumentsTable)
      .where(eq(partnerDocumentsTable.partnerId, id))
      .orderBy(desc(partnerDocumentsTable.uploadedAt));
    res.json({ partner, documents });
  },
);

// Auto-login (impersonation): admin signs into a partner's session in the
// same browser. Partner + admin sessions are independent, so the admin
// remains signed in to /admin even after this call.
router.post(
  "/admin/partners/:id/impersonate",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
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

// Generate a single-use QR login token for a partner. The admin shows the
// resulting QR code to the partner, who scans it from the /partner/login page
// on their phone to sign in without typing a password. Tokens expire after
// 10 minutes and are consumed on first use.
router.post(
  "/admin/partners/:id/qr-login",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
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
        error: "Cannot issue a QR for a suspended partner.",
      });
      return;
    }
    const token =
      "PQR_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(partnerLoginTokensTable).values({
      token,
      partnerId: partner.id,
      expiresAt,
      createdByEmail: req.session.adminEmail ?? "",
    });
    res.json({
      token,
      expiresAt: expiresAt.toISOString(),
      partnerName: partner.name,
      partnerEmail: partner.email,
    });
  },
);

// ───────────────────────────── Gyms ─────────────────────────────

router.get(
  "/admin/gyms",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db.select().from(gymsTable).orderBy(desc(gymsTable.id));
    res.json(rows);
  },
);

router.post(
  "/admin/gyms",
  requireAdmin,
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
        videoUrl:
          b.videoUrl === undefined || b.videoUrl === null || b.videoUrl === ""
            ? null
            : String(b.videoUrl),
        rating: Number(b.rating ?? 4.5),
        reviewsCount: Number(b.reviewsCount ?? 0),
        priceFrom: Number(b.priceFrom ?? 999),
        categories: Array.isArray(b.categories)
          ? (b.categories as string[])
          : ["gym"],
        amenities: Array.isArray(b.amenities)
          ? (b.amenities as string[])
          : [],
        distanceKm: Number(b.distanceKm ?? 2.5),
        isPremium: Boolean(b.isPremium ?? false),
        openNow: Boolean(b.openNow ?? true),
        about: String(b.about ?? ""),
        gallery: Array.isArray(b.gallery) ? (b.gallery as string[]) : [],
        hours: String(b.hours ?? "5am – 11pm"),
        lat: Number(b.lat ?? 12.97),
        lng: Number(b.lng ?? 77.59),
        featured: Boolean(b.featured ?? false),
        isVerified: Boolean(b.isVerified ?? true),
        ownerPartnerId:
          b.ownerPartnerId === undefined || b.ownerPartnerId === null || b.ownerPartnerId === ""
            ? null
            : Number(b.ownerPartnerId),
        payoutPerVisitInr: Number(b.payoutPerVisitInr ?? 0),
        payoutTaxPct: Number(b.payoutTaxPct ?? 18),
        yoactivBranchId:
          b.yoactivBranchId === undefined ||
          b.yoactivBranchId === null ||
          b.yoactivBranchId === ""
            ? null
            : Number(b.yoactivBranchId),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/gyms/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of [
      "name",
      "slug",
      "city",
      "area",
      "address",
      "heroImage",
      "about",
      "hours",
    ]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of [
      "rating",
      "reviewsCount",
      "priceFrom",
      "distanceKm",
      "lat",
      "lng",
      "payoutPerVisitInr",
      "payoutTaxPct",
    ]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    for (const k of ["isPremium", "openNow", "featured", "isVerified"]) {
      if (b[k] !== undefined) patch[k] = Boolean(b[k]);
    }
    for (const k of ["categories", "amenities", "gallery"]) {
      if (Array.isArray(b[k])) patch[k] = b[k] as string[];
    }
    if (b.ownerPartnerId !== undefined) {
      patch.ownerPartnerId =
        b.ownerPartnerId === null || b.ownerPartnerId === ""
          ? null
          : Number(b.ownerPartnerId);
    }
    if (b.videoUrl !== undefined) {
      patch.videoUrl =
        b.videoUrl === null || b.videoUrl === "" ? null : String(b.videoUrl);
    }
    if (b.yoactivBranchId !== undefined) {
      patch.yoactivBranchId =
        b.yoactivBranchId === null || b.yoactivBranchId === ""
          ? null
          : Number(b.yoactivBranchId);
    }
    const [updated] = await db
      .update(gymsTable)
      .set(patch)
      .where(eq(gymsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/gyms/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(gymsTable).where(eq(gymsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Amenities catalog ─────────────────────────────

router.get(
  "/admin/amenities",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(amenitiesTable)
      .orderBy(asc(amenitiesTable.sortOrder), asc(amenitiesTable.name));
    res.json(rows);
  },
);

router.post(
  "/admin/amenities",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const slug =
      (b.slug as string | undefined)?.trim() ||
      slugify(String(b.name));
    try {
      const [row] = await db
        .insert(amenitiesTable)
        .values({
          name: String(b.name).trim(),
          slug,
          description: String(b.description ?? ""),
          icon: String(b.icon ?? "Dot"),
          category: String(b.category ?? "general"),
          isActive: b.isActive === undefined ? true : Boolean(b.isActive),
          sortOrder: Number(b.sortOrder ?? 0),
        })
        .returning();
      res.status(201).json(row);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "23505") {
        res.status(409).json({ error: "Amenity name or slug already exists" });
        return;
      }
      throw e;
    }
  },
);

router.patch(
  "/admin/amenities/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (b.name !== undefined) patch.name = String(b.name).trim();
    if (b.slug !== undefined) patch.slug = slugify(String(b.slug));
    if (b.description !== undefined) patch.description = String(b.description);
    if (b.icon !== undefined) patch.icon = String(b.icon);
    if (b.category !== undefined) patch.category = String(b.category);
    if (b.isActive !== undefined) patch.isActive = Boolean(b.isActive);
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    try {
      const [row] = await db
        .update(amenitiesTable)
        .set(patch)
        .where(eq(amenitiesTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(row);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "23505") {
        res.status(409).json({ error: "Amenity name or slug already exists" });
        return;
      }
      throw e;
    }
  },
);

router.delete(
  "/admin/amenities/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(amenitiesTable).where(eq(amenitiesTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Workouts catalog ─────────────────────────────

router.get(
  "/admin/workouts",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(workoutsTable)
      .orderBy(asc(workoutsTable.sortOrder), asc(workoutsTable.name));
    res.json(rows);
  },
);

router.post(
  "/admin/workouts",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const slug =
      (b.slug as string | undefined)?.trim() || slugify(String(b.name));
    try {
      const [row] = await db
        .insert(workoutsTable)
        .values({
          name: String(b.name).trim(),
          slug,
          description: String(b.description ?? ""),
          icon: String(b.icon ?? "Dumbbell"),
          color: String(b.color ?? "from-orange-500 to-amber-500"),
          imageUrl: String(b.imageUrl ?? ""),
          isActive: b.isActive === undefined ? true : Boolean(b.isActive),
          sortOrder: Number(b.sortOrder ?? 0),
        })
        .returning();
      res.status(201).json(row);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "23505") {
        res.status(409).json({ error: "Workout name or slug already exists" });
        return;
      }
      throw e;
    }
  },
);

router.patch(
  "/admin/workouts/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (b.name !== undefined) patch.name = String(b.name).trim();
    if (b.slug !== undefined) patch.slug = slugify(String(b.slug));
    if (b.description !== undefined) patch.description = String(b.description);
    if (b.icon !== undefined) patch.icon = String(b.icon);
    if (b.color !== undefined) patch.color = String(b.color);
    if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl);
    if (b.isActive !== undefined) patch.isActive = Boolean(b.isActive);
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    try {
      const [row] = await db
        .update(workoutsTable)
        .set(patch)
        .where(eq(workoutsTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(row);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "23505") {
        res.status(409).json({ error: "Workout name or slug already exists" });
        return;
      }
      throw e;
    }
  },
);

router.delete(
  "/admin/workouts/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(workoutsTable).where(eq(workoutsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Trainers ─────────────────────────────

router.get(
  "/admin/trainers",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(
      await db.select().from(trainersTable).orderBy(desc(trainersTable.id)),
    );
  },
);

router.post(
  "/admin/trainers",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name || !b.specialty || !b.city) {
      res.status(400).json({ error: "name, specialty, city required" });
      return;
    }
    const [created] = await db
      .insert(trainersTable)
      .values({
        name: String(b.name),
        specialty: String(b.specialty),
        bio: String(b.bio ?? ""),
        photoUrl: String(
          b.photoUrl ??
            "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400",
        ),
        rating: Number(b.rating ?? 4.7),
        sessionsCount: Number(b.sessionsCount ?? 0),
        pricePerSession: Number(b.pricePerSession ?? 1500),
        certifications: Array.isArray(b.certifications)
          ? (b.certifications as string[])
          : [],
        city: String(b.city),
        gymId: b.gymId == null ? null : Number(b.gymId),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/trainers/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "specialty", "bio", "photoUrl", "city"]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of ["rating", "sessionsCount", "pricePerSession", "gymId"]) {
      if (b[k] !== undefined) patch[k] = b[k] == null ? null : Number(b[k]);
    }
    if (Array.isArray(b.certifications))
      patch.certifications = b.certifications as string[];
    const [updated] = await db
      .update(trainersTable)
      .set(patch)
      .where(eq(trainersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/trainers/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(trainersTable).where(eq(trainersTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Classes ─────────────────────────────

router.get(
  "/admin/classes",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(
      await db
        .select()
        .from(classSessionsTable)
        .orderBy(desc(classSessionsTable.startsAt)),
    );
  },
);

router.post(
  "/admin/classes",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.title || !b.gymId || !b.trainerId) {
      res.status(400).json({ error: "title, gymId, trainerId required" });
      return;
    }
    const [created] = await db
      .insert(classSessionsTable)
      .values({
        title: String(b.title),
        category: String(b.category ?? "gym"),
        gymId: Number(b.gymId),
        trainerId: Number(b.trainerId),
        startsAt: b.startsAt ? new Date(String(b.startsAt)) : new Date(),
        durationMin: Number(b.durationMin ?? 60),
        capacity: Number(b.capacity ?? 20),
        intensity: String(b.intensity ?? "medium"),
        coverImage: String(
          b.coverImage ??
            "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200",
        ),
        description: String(b.description ?? ""),
        equipmentNeeded: Array.isArray(b.equipmentNeeded)
          ? (b.equipmentNeeded as string[])
          : [],
        calorieEstimate: Number(b.calorieEstimate ?? 350),
        trendingScore: Number(b.trendingScore ?? 50),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/classes/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of [
      "title",
      "category",
      "intensity",
      "coverImage",
      "description",
    ]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of [
      "gymId",
      "trainerId",
      "durationMin",
      "capacity",
      "calorieEstimate",
      "trendingScore",
    ]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    if (b.startsAt !== undefined) patch.startsAt = new Date(String(b.startsAt));
    if (Array.isArray(b.equipmentNeeded))
      patch.equipmentNeeded = b.equipmentNeeded as string[];
    const [updated] = await db
      .update(classSessionsTable)
      .set(patch)
      .where(eq(classSessionsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/classes/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(classSessionsTable).where(eq(classSessionsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Memberships ─────────────────────────────

router.get(
  "/admin/memberships",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(
      await db
        .select()
        .from(membershipsTable)
        .orderBy(membershipsTable.priceInr),
    );
  },
);

router.post(
  "/admin/memberships",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name || !b.priceInr) {
      res.status(400).json({ error: "name and priceInr required" });
      return;
    }
    const [created] = await db
      .insert(membershipsTable)
      .values({
        name: String(b.name),
        tagline: String(b.tagline ?? ""),
        billingPeriod: ["monthly", "quarterly", "half_yearly", "yearly", "annual"].includes(String(b.billingPeriod))
          ? String(b.billingPeriod)
          : "monthly",
        priceInr: Number(b.priceInr),
        originalPriceInr: Number(b.originalPriceInr ?? b.priceInr),
        gymsIncluded: Number(b.gymsIncluded ?? 50),
        classesPerMonth: Number(b.classesPerMonth ?? 12),
        perks: Array.isArray(b.perks) ? (b.perks as string[]) : [],
        badge: String(b.badge ?? ""),
        popular: Boolean(b.popular ?? false),
        imageUrl: String(b.imageUrl ?? ""),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/memberships/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "tagline", "badge", "imageUrl"]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    if (b.billingPeriod !== undefined) {
      const bp = String(b.billingPeriod);
      patch.billingPeriod = ["monthly", "quarterly", "half_yearly", "yearly", "annual"].includes(bp) ? bp : "monthly";
    }
    for (const k of [
      "priceInr",
      "originalPriceInr",
      "gymsIncluded",
      "classesPerMonth",
    ]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    if (b.popular !== undefined) patch.popular = Boolean(b.popular);
    if (Array.isArray(b.perks)) patch.perks = b.perks as string[];
    const [updated] = await db
      .update(membershipsTable)
      .set(patch)
      .where(eq(membershipsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/memberships/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(membershipsTable).where(eq(membershipsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── User Management ─────────────────────────────

router.get(
  "/admin/users",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.joinedAt));
    const ums = await db.select().from(userMembershipsTable);
    const plans = await db.select().from(membershipsTable);
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const umMap = new Map<number, (typeof ums)[number]>();
    for (const um of ums) umMap.set(um.userId, um);
    res.json(
      users.map((u) => {
        const um = umMap.get(u.id);
        const plan = um ? planMap.get(um.planId) : undefined;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          city: u.city,
          joinedAt: u.joinedAt,
          streakDays: u.streakDays,
          planName: plan?.name ?? null,
          planStatus: um?.status ?? "none",
        };
      }),
    );
  },
);

router.get(
  "/admin/user-memberships",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const ums = await db
      .select()
      .from(userMembershipsTable)
      .orderBy(desc(userMembershipsTable.renewsOn));
    const users = await db.select().from(usersTable);
    const plans = await db.select().from(membershipsTable);
    const uMap = new Map(users.map((u) => [u.id, u]));
    const pMap = new Map(plans.map((p) => [p.id, p]));
    res.json(
      ums.map((um) => ({
        id: um.id,
        userId: um.userId,
        userName: uMap.get(um.userId)?.name ?? "Unknown",
        userEmail: uMap.get(um.userId)?.email ?? "",
        planId: um.planId,
        planName: pMap.get(um.planId)?.name ?? "Unknown",
        renewsOn: um.renewsOn,
        classesUsed: um.classesUsed,
        gymsAccessed: um.gymsAccessed,
        status: um.status,
      })),
    );
  },
);

router.patch(
  "/admin/user-memberships/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { status } = (req.body ?? {}) as { status?: string };
    if (!status) {
      res.status(400).json({ error: "status required" });
      return;
    }
    const [updated] = await db
      .update(userMembershipsTable)
      .set({ status })
      .where(eq(userMembershipsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

// ───────────────────────────── Products (admin) ─────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

router.get(
  "/admin/products",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(productsTable)
      .orderBy(desc(productsTable.id));
    res.json(rows);
  },
);

router.post(
  "/admin/products",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, any>;
    if (!b.name || !b.vendorPartnerId || !b.priceInr || !b.imageUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const slug = b.slug ? slugify(String(b.slug)) : `${slugify(String(b.name))}-${Date.now().toString(36)}`;
    const [row] = await db
      .insert(productsTable)
      .values({
        vendorPartnerId: Number(b.vendorPartnerId),
        name: String(b.name),
        slug,
        description: String(b.description ?? ""),
        category: String(b.category ?? "apparel"),
        priceInr: Number(b.priceInr),
        originalPriceInr: Number(b.originalPriceInr ?? b.priceInr),
        imageUrl: String(b.imageUrl),
        gallery: Array.isArray(b.gallery) ? b.gallery.map(String) : [],
        sizes: Array.isArray(b.sizes) ? b.sizes.map(String) : [],
        colors: Array.isArray(b.colors) ? b.colors.map(String) : [],
        stock: Number(b.stock ?? 0),
        status: String(b.status ?? "active"),
      })
      .returning();
    res.json(row);
  },
);

router.patch(
  "/admin/products/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, any>;
    const patch: Record<string, unknown> = {};
    if (b.name !== undefined) patch.name = String(b.name);
    if (b.slug !== undefined) patch.slug = slugify(String(b.slug));
    if (b.description !== undefined) patch.description = String(b.description);
    if (b.category !== undefined) patch.category = String(b.category);
    if (b.priceInr !== undefined) patch.priceInr = Number(b.priceInr);
    if (b.originalPriceInr !== undefined)
      patch.originalPriceInr = Number(b.originalPriceInr);
    if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl);
    if (Array.isArray(b.gallery)) patch.gallery = b.gallery.map(String);
    if (Array.isArray(b.sizes)) patch.sizes = b.sizes.map(String);
    if (Array.isArray(b.colors)) patch.colors = b.colors.map(String);
    if (b.stock !== undefined) patch.stock = Number(b.stock);
    if (b.status !== undefined) patch.status = String(b.status);
    if (b.vendorPartnerId !== undefined)
      patch.vendorPartnerId = Number(b.vendorPartnerId);
    const [row] = await db
      .update(productsTable)
      .set(patch)
      .where(eq(productsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/admin/products/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Orders (admin) ─────────────────────────────

router.get(
  "/admin/orders",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const orders = await db
      .select()
      .from(productOrdersTable)
      .orderBy(desc(productOrdersTable.id));
    if (orders.length === 0) {
      res.json([]);
      return;
    }
    const items = await db.select().from(productOrderItemsTable);
    const byOrder = new Map<number, typeof items>();
    for (const it of items) {
      const list = byOrder.get(it.orderId) ?? [];
      list.push(it);
      byOrder.set(it.orderId, list);
    }
    res.json(orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })));
  },
);

router.patch(
  "/admin/orders/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, any>;
    const patch: Record<string, unknown> = {};
    if (b.status !== undefined) patch.status = String(b.status);
    const [row] = await db
      .update(productOrdersTable)
      .set(patch)
      .where(eq(productOrdersTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(row);
  },
);

// ───────────────────────────── Categories (admin) ─────────────────────────────

// On first open, materialize the code-default categories so the admin always
// has rows to manage. Subsequent opens just return whatever is in the table.
async function ensureCategoriesMaterialized(): Promise<void> {
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(productCategoriesTable);
  if (c > 0) return;
  await db
    .insert(productCategoriesTable)
    .values(
      DEFAULT_PRODUCT_CATEGORIES.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
      })),
    )
    .onConflictDoNothing();
}

router.get(
  "/admin/categories",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    await ensureCategoriesMaterialized();
    const rows = await db
      .select()
      .from(productCategoriesTable)
      .orderBy(asc(productCategoriesTable.sortOrder), asc(productCategoriesTable.id));
    res.json(rows);
  },
);

router.post(
  "/admin/categories",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const name = String(b.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }
    const slug = b.slug ? slugify(String(b.slug)) : slugify(name);
    if (!slug) {
      res.status(400).json({ error: "Invalid category name" });
      return;
    }
    try {
      const [row] = await db
        .insert(productCategoriesTable)
        .values({
          name,
          slug,
          sortOrder: Number.isFinite(Number(b.sortOrder))
            ? Number(b.sortOrder)
            : 0,
          isActive: b.isActive === undefined ? true : Boolean(b.isActive),
        })
        .returning();
      res.status(201).json(row);
    } catch (e: unknown) {
      res.status(409).json({
        error: "A category with that slug already exists.",
      });
    }
  },
);

router.patch(
  "/admin/categories/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (b.name !== undefined) patch.name = String(b.name).trim();
    if (b.slug !== undefined) patch.slug = slugify(String(b.slug));
    if (b.sortOrder !== undefined && Number.isFinite(Number(b.sortOrder)))
      patch.sortOrder = Number(b.sortOrder);
    if (b.isActive !== undefined) patch.isActive = Boolean(b.isActive);
    try {
      const [row] = await db
        .update(productCategoriesTable)
        .set(patch)
        .where(eq(productCategoriesTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      res.json(row);
    } catch (e: unknown) {
      res.status(409).json({
        error: "A category with that slug already exists.",
      });
    }
  },
);

router.delete(
  "/admin/categories/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(productCategoriesTable)
      .where(eq(productCategoriesTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Staff Management ─────────────────────────────

const STAFF_PERMS = new Set<string>(STAFF_PERMISSIONS);

function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const p of input) {
    if (typeof p === "string" && STAFF_PERMS.has(p)) out.add(p);
  }
  return Array.from(out);
}

router.get(
  "/admin/staff",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: staffTable.id,
        name: staffTable.name,
        email: staffTable.email,
        isActive: staffTable.isActive,
        permissions: staffTable.permissions,
        createdAt: staffTable.createdAt,
      })
      .from(staffTable)
      .orderBy(desc(staffTable.createdAt));
    res.json(rows);
  },
);

router.get(
  "/admin/staff/permissions",
  requireAdmin,
  (_req: Request, res: Response): void => {
    res.json({ permissions: Array.from(STAFF_PERMS) });
  },
);

router.post(
  "/admin/staff",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, permissions, isActive } =
      (req.body ?? {}) as {
        name?: string;
        email?: string;
        password?: string;
        permissions?: unknown;
        isActive?: boolean;
      };
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, password required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 chars" });
      return;
    }
    const perms = sanitizePermissions(permissions);
    const passwordHash = await hashPassword(password);
    try {
      const [created] = await db
        .insert(staffTable)
        .values({
          name,
          email: email.toLowerCase().trim(),
          passwordHash,
          permissions: perms,
          isActive: isActive !== false,
        })
        .returning({
          id: staffTable.id,
          name: staffTable.name,
          email: staffTable.email,
          isActive: staffTable.isActive,
          permissions: staffTable.permissions,
          createdAt: staffTable.createdAt,
        });
      res.status(201).json(created);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (/unique|duplicate/i.test(msg)) {
        res
          .status(409)
          .json({ error: "A staff member with this email already exists" });
        return;
      }
      res.status(500).json({ error: msg });
    }
  },
);

router.patch(
  "/admin/staff/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { name, permissions, isActive } = (req.body ?? {}) as {
      name?: string;
      permissions?: unknown;
      isActive?: boolean;
    };
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (permissions !== undefined)
      patch.permissions = sanitizePermissions(permissions);
    if (isActive !== undefined) patch.isActive = Boolean(isActive);
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }
    const [updated] = await db
      .update(staffTable)
      .set(patch)
      .where(eq(staffTable.id, id))
      .returning({
        id: staffTable.id,
        name: staffTable.name,
        email: staffTable.email,
        isActive: staffTable.isActive,
        permissions: staffTable.permissions,
        createdAt: staffTable.createdAt,
      });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/admin/staff/:id/reset-password",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { password } = (req.body ?? {}) as { password?: string };
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 chars" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [updated] = await db
      .update(staffTable)
      .set({ passwordHash })
      .where(eq(staffTable.id, id))
      .returning({ id: staffTable.id });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  },
);

router.delete(
  "/admin/staff/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(staffTable).where(eq(staffTable.id, id));
    res.json({ ok: true });
  },
);

// Paid personal-training session bookings across all branches.
router.get(
  "/admin/trainer-bookings",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: trainerBookingsTable.id,
        gymId: trainerBookingsTable.gymId,
        gymName: trainerBookingsTable.gymName,
        trainerName: trainerBookingsTable.trainerName,
        memberName: trainerBookingsTable.memberName,
        mobile: trainerBookingsTable.mobile,
        packageName: trainerBookingsTable.packageName,
        serviceName: trainerBookingsTable.serviceName,
        amountInr: trainerBookingsTable.amountInr,
        preferredDate: trainerBookingsTable.preferredDate,
        status: trainerBookingsTable.status,
        createdAt: trainerBookingsTable.createdAt,
      })
      .from(trainerBookingsTable)
      .orderBy(desc(trainerBookingsTable.createdAt))
      .limit(5000);
    res.json(rows);
  },
);

// ─── YoActiv member directory (read-only) ───────────────────────────────────

// Branches available for the member directory: every configured YoActiv
// branch id, labelled with the mapped gym name when one exists.
router.get(
  "/admin/yoactiv/branches",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    if (!yoactivConfigured()) {
      res.json([]);
      return;
    }
    const configs = await yoactivKeyConfigs();
    const branchIds = [...new Set(configs.flatMap((c) => c.branchIds))];
    const gyms = branchIds.length
      ? await db
          .select({
            name: gymsTable.name,
            area: gymsTable.area,
            yoactivBranchId: gymsTable.yoactivBranchId,
          })
          .from(gymsTable)
          .where(inArray(gymsTable.yoactivBranchId, branchIds))
      : [];
    const labelByBranch = new Map<number, string>();
    for (const g of gyms) {
      if (g.yoactivBranchId && !labelByBranch.has(g.yoactivBranchId)) {
        labelByBranch.set(g.yoactivBranchId, `${g.name} (${g.area})`);
      }
    }
    res.json(
      branchIds.map((branchId) => ({
        branchId,
        branchName: yoactivBranchName(branchId),
        gymLabel: labelByBranch.get(branchId) ?? null,
      })),
    );
  },
);

// Full member list for one branch (name, mobile, active/inactive status).
router.get(
  "/admin/yoactiv/members",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const branchId = Number(req.query.branchId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      res.status(400).json({ error: "branchId required" });
      return;
    }
    if (!yoactivConfigured()) {
      res.json([]);
      return;
    }
    const members = await fetchYoactivMemberList(branchId);
    const photos = await memberPhotoMap(members.map((m) => String(m.memberId)));
    // YoActiv-hosted photo wins when present; otherwise the staff upload.
    res.json(
      members.map((m) => {
        const uploaded = photos.get(String(m.memberId)) ?? null;
        return {
          ...m,
          photoUrl: m.photoUrl ?? uploaded,
          photoSource: m.photoUrl ? "yoactiv" : uploaded ? "upload" : null,
        };
      }),
    );
  },
);

// Attach/replace an uploaded photo for a YoActiv member (YoActiv has no photo
// field — the photo lives in our DB, shown in the staff member directory).
router.put(
  "/admin/yoactiv/members/:memberId/photo",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const memberId = String(req.params.memberId ?? "").trim();
    const imageUrl = String(req.body?.imageUrl ?? "").trim();
    if (!memberId) {
      res.status(400).json({ error: "memberId required" });
      return;
    }
    if (!/^(https?:\/\/|\/)/.test(imageUrl)) {
      res.status(400).json({ error: "Upload an image or provide a valid image URL" });
      return;
    }
    await setMemberPhoto(memberId, imageUrl);
    res.json({ ok: true });
  },
);

router.delete(
  "/admin/yoactiv/members/:memberId/photo",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const memberId = String(req.params.memberId ?? "").trim();
    if (!memberId) {
      res.status(400).json({ error: "memberId required" });
      return;
    }
    await removeMemberPhoto(memberId);
    res.json({ ok: true });
  },
);

// PT trainer roster for one branch (name + mobile, staff-facing only).
router.get(
  "/admin/yoactiv/trainers",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const branchId = Number(req.query.branchId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      res.status(400).json({ error: "branchId required" });
      return;
    }
    if (!yoactivConfigured()) {
      res.json([]);
      return;
    }
    const trainers = await fetchYoactivBranchTrainers(branchId);
    const photos = await trainerPhotoMap(trainers.map((t) => t.id));
    res.json(
      trainers.map((t) => ({ ...t, photoUrl: photos.get(t.id) ?? null })),
    );
  },
);

// Attach/replace an uploaded photo for a YoActiv trainer (YoActiv itself has
// no photo field — the photo lives in our DB and shows in the mobile app).
router.put(
  "/admin/yoactiv/trainers/:trainerId/photo",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const trainerId = String(req.params.trainerId ?? "").trim();
    const imageUrl = String(req.body?.imageUrl ?? "").trim();
    if (!trainerId) {
      res.status(400).json({ error: "trainerId required" });
      return;
    }
    if (!/^(https?:\/\/|\/)/.test(imageUrl)) {
      res.status(400).json({ error: "Upload an image or provide a valid image URL" });
      return;
    }
    await setTrainerPhoto(trainerId, imageUrl);
    res.json({ ok: true });
  },
);

router.delete(
  "/admin/yoactiv/trainers/:trainerId/photo",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const trainerId = String(req.params.trainerId ?? "").trim();
    if (!trainerId) {
      res.status(400).json({ error: "trainerId required" });
      return;
    }
    await removeTrainerPhoto(trainerId);
    res.json({ ok: true });
  },
);

// Plan details (plan name, status, start/expiry dates) for one member.
router.get(
  "/admin/yoactiv/members/detail",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const mobile = String(req.query.mobile ?? "").trim();
    if (!mobile) {
      res.status(400).json({ error: "mobile required" });
      return;
    }
    const profile = await fetchYoactivMemberByMobile(mobile);
    if (!profile) {
      res.json({ memberId: null, name: "", memberships: [] });
      return;
    }
    res.json({
      memberId: profile.memberId,
      name: profile.name,
      memberships: profile.memberships.map((m) => ({
        branchId: m.branchId,
        branchName: m.branchName,
        planName: m.planName,
        serviceName: m.serviceName,
        status: m.status,
        startDate: m.startDate,
        expiryDate: m.expiryDate,
        sessionsTotal: m.sessionsTotal,
        sessionsUsed: m.sessionsUsed,
        amountInr: m.amountInr,
      })),
    });
  },
);

// Destructive: wipes the catalog (gyms, partners, areas, images, bookings,
// memberships, etc.) and reloads it from the bundled dev snapshot. Used to
// mirror dev data onto a fresh production database. Super-admin only.
router.post(
  "/admin/reseed-from-snapshot",
  requireAdmin,
  superAdminGuard,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const inserted = await forceReseedFromSnapshot();
      req.log.info({ inserted }, "Admin triggered catalog reseed");
      res.json({ ok: true, inserted });
    } catch (err) {
      req.log.error({ err }, "Catalog reseed failed");
      res.status(500).json({ error: "Reseed failed" });
    }
  },
);

export default router;
