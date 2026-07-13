import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  membershipsTable,
  packageCategoriesTable,
  userMembershipsTable,
  usersTable,
} from "@workspace/db";
import {
  ListMembershipsResponse,
  ListPackageCategoriesResponse,
  GetMyMembershipResponse,
  ListMyMembershipPaymentsResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import {
  fetchYoactivMemberByMobile,
  pickPrimaryMembership,
  yoactivConfigured,
} from "../lib/yoactiv";

const router: IRouter = Router();

router.get("/memberships", async (_req, res): Promise<void> => {
  const rows = await db.select().from(membershipsTable);
  res.json(ListMembershipsResponse.parse(rows));
});

// Active admin-managed categories for the app's Packages tab, in admin order.
router.get("/package-categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(packageCategoriesTable)
    .where(eq(packageCategoriesTable.isActive, true))
    .orderBy(packageCategoriesTable.sortOrder, packageCategoriesTable.id);
  res.json(ListPackageCategoriesResponse.parse(rows));
});

router.get("/memberships/mine", requireUser, async (req, res): Promise<void> => {
  // Source of truth is YoActiv (the gym-management software) when the member
  // can be matched there by mobile number; the local row is the fallback so
  // nothing breaks if YoActiv is unreachable or the member isn't linked.
  if (yoactivConfigured()) {
    const [user] = await db
      .select({ mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const profile = await fetchYoactivMemberByMobile(user?.mobile);
    const primary = profile ? pickPrimaryMembership(profile) : null;
    if (primary) {
      res.json(
        GetMyMembershipResponse.parse({
          planId: 0,
          planName: primary.planName,
          renewsOn: primary.expiryDate
            ? `${primary.expiryDate}T00:00:00.000Z`
            : new Date().toISOString(),
          classesUsed: primary.sessionsUsed ?? 0,
          classesIncluded: primary.sessionsTotal ?? 0,
          gymsAccessed: profile!.branchCount,
          status: primary.status,
          source: "yoactiv",
          photoUrl: profile!.photoUrl,
        }),
      );
      return;
    }
  }

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
      source: "local",
      photoUrl: null,
    }),
  );
});

router.get(
  "/memberships/mine/payments",
  requireUser,
  async (req, res): Promise<void> => {
    if (!yoactivConfigured()) {
      res.json([]);
      return;
    }
    const [user] = await db
      .select({ mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const profile = await fetchYoactivMemberByMobile(user?.mobile);
    if (!profile) {
      res.json([]);
      return;
    }
    const payments = [...profile.memberships]
      .sort((a, b) =>
        (b.invoiceDate ?? b.startDate ?? "").localeCompare(
          a.invoiceDate ?? a.startDate ?? "",
        ),
      )
      .map((m) => ({
        billId: m.billId,
        planName: m.planName,
        serviceName: m.serviceName,
        branchName: m.branchName,
        status: m.status,
        invoiceDate: m.invoiceDate,
        startDate: m.startDate,
        expiryDate: m.expiryDate,
        amountInr: m.amountInr,
        discountInr: m.discountInr,
      }));
    res.json(ListMyMembershipPaymentsResponse.parse(payments));
  },
);

export default router;
