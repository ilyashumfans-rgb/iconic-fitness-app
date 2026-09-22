import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  db, usersTable, leadsTable, ptProgramsTable, ptMembershipsTable, trainerBookingsTable, ptSessionsTable, ptTrialFeedbackTable,
} from "@workspace/db";
import {
  AutoSyncMemberMobileResponse, SyncMemberMobileBody, GetFitnessJourneyResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { saveConfirmedJourneyBranch } from "../lib/memberJourneyBranchLink";
import {
  journeyDecision, matchingMobileSync, planStartTimestamp, trustedMobileSyncIdentity,
} from "../lib/fitnessJourney";
import { TRAINER_ENQUIRY_SOURCE } from "../lib/trainerEnquiryLeads";
import { listPtSessions } from "../lib/ptSessions";
import { fetchPtAssignmentMap } from "../lib/ptAssignments";
import { trainerPhotoMap } from "../lib/trainerPhotos";
import { fetchYoactivMemberByMobile, normalizeMobile, pickPrimaryMembership } from "../lib/yoactiv";

const router: IRouter = Router();

// Only an explicit action issues this server-only receipt. Email fallback and
// ordinary profile edits cannot manufacture it. Retry unchanged numbers too.
router.post("/memberships/sync", requireUser, async (req, res): Promise<void> => {
  const parsed = SyncMemberMobileBody.safeParse(req.body);
  const mobile = parsed.success ? normalizeMobile(parsed.data.mobile) : null;
  if (!mobile || !req.clerkUserId) {
    res.status(400).json({ error: "A signed-in account and valid mobile are required." });
    return;
  }
  try {
    const profile = await fetchYoactivMemberByMobile(mobile, { requireComplete: true });
    if (!profile) {
      res.status(409).json({ error: "Could not confirm this mobile with YoActiv. Please retry." });
      return;
    }
    await db.update(usersTable).set({ mobile }).where(eq(usersTable.id, req.userId!));
    await clerkClient.users.updateUserMetadata(req.clerkUserId, {
      privateMetadata: {
        iconicMobileSync: { version: 1, mobile, memberId: profile.memberId, syncedAt: Date.now() },
      },
    });
    const primary = pickPrimaryMembership(profile);
    if (primary?.status === "active") await saveConfirmedJourneyBranch(req.userId!, primary.branchId, mobile);
    res.json({ synced: true });
  } catch {
    res.status(503).json({ error: "Mobile sync could not be completed. Please retry." });
  }
});

// No client-supplied number is accepted here. Only a prior explicit sync's
// Clerk privateMetadata receipt can authorize an unattended refresh.
router.post("/memberships/sync/automatic", requireUser, async (req, res): Promise<void> => {
  try {
    if (!req.clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const now = Date.now();
    const account = await clerkClient.users.getUser(req.clerkUserId);
    const receipt = trustedMobileSyncIdentity(account.privateMetadata.iconicMobileSync, now);
    if (!receipt) {
      res.json(AutoSyncMemberMobileResponse.parse({
        synced: false, reason: "confirmation_required",
      }));
      return;
    }
    const [user] = await db.select({ mobile: usersTable.mobile }).from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const currentMobile = normalizeMobile(user?.mobile);
    if (currentMobile && currentMobile !== receipt.mobile) {
      res.json(AutoSyncMemberMobileResponse.parse({
        synced: false, reason: "mobile_conflict",
      }));
      return;
    }
    const profile = await fetchYoactivMemberByMobile(receipt.mobile, { requireComplete: true });
    if (!profile) {
      res.status(503).json({ error: "Membership refresh is temporarily unavailable. Please retry." });
      return;
    }
    if (!matchingMobileSync(account.privateMetadata.iconicMobileSync, receipt.mobile, profile.memberId, now)) {
      res.json(AutoSyncMemberMobileResponse.parse({
        synced: false, reason: "confirmation_required",
      }));
      return;
    }
    if (!currentMobile) {
      const [restored] = await db.update(usersTable).set({ mobile: receipt.mobile }).where(and(
        eq(usersTable.id, req.userId!),
        or(eq(usersTable.mobile, ""), isNull(usersTable.mobile)),
      )).returning({ mobile: usersTable.mobile });
      if (!restored) {
        // An explicit sync may have changed the number while YoActiv was being
        // checked. Never overwrite it or report the stale automatic result.
        const [latest] = await db.select({ mobile: usersTable.mobile }).from(usersTable)
          .where(eq(usersTable.id, req.userId!));
        if (normalizeMobile(latest?.mobile) !== receipt.mobile) {
          res.json(AutoSyncMemberMobileResponse.parse({
            synced: false, reason: "mobile_conflict",
          }));
          return;
        }
      }
    }
    // Deliberately do not rewrite the private receipt. A delayed automatic
    // request must never replace a newer receipt created by an explicit sync.
    const primary = pickPrimaryMembership(profile);
    if (primary?.status === "active") await saveConfirmedJourneyBranch(req.userId!, primary.branchId, receipt.mobile);
    res.json(AutoSyncMemberMobileResponse.parse({ synced: true, reason: "synced" }));
  } catch {
    res.status(503).json({ error: "Membership refresh is temporarily unavailable. Please retry." });
  }
});

router.get("/memberships/journey", requireUser, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const empty = {
    ownerId: req.clerkUserId ?? "", eligible: false, reason: "mobile_sync_required",
    hasBooking: false, assigned: false, completedCount: 0, trainerName: "",
  };
  try {
    if (!req.clerkUserId) { res.json(empty); return; }
    const [user] = await db.select({ mobile: usersTable.mobile }).from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const mobile = normalizeMobile(user?.mobile);
    if (!mobile) { res.json(empty); return; }
    const account = await clerkClient.users.getUser(req.clerkUserId);
    const receipt = account.privateMetadata.iconicMobileSync;
    if (!receipt) { res.json(empty); return; }
    // Deliberately no email or local-membership fallback.
    const profile = await fetchYoactivMemberByMobile(mobile, { requireComplete: true });
    if (!profile) {
      res.status(503).json({ error: "Could not verify current YoActiv membership." });
      return;
    }
    const now = Date.now();
    const synced = matchingMobileSync(receipt, mobile, profile.memberId, now);
    if (!synced) { res.json(empty); return; }
    const primary = pickPrimaryMembership(profile);
    // First-claim legacy NULL owners atomically, then read by account only.
    // A concurrent loser cannot read a row claimed by another account.
    await Promise.all([
      db.update(trainerBookingsTable).set({ userId: req.userId! }).where(and(
        isNull(trainerBookingsTable.userId), eq(trainerBookingsTable.status, "paid"),
        sql`right(regexp_replace(${trainerBookingsTable.mobile}, '\\D', '', 'g'), 10) = ${mobile}`,
      )),
      db.update(ptProgramsTable).set({ userId: req.userId! }).where(and(
        isNull(ptProgramsTable.userId),
        sql`right(regexp_replace(${ptProgramsTable.memberPhone}, '\\D', '', 'g'), 10) = ${mobile}`,
      )),
    ]);
    const [paidBookings, paidPlans, matchingEnquiries, allPrograms] = await Promise.all([
      db.select({ id: trainerBookingsTable.id }).from(trainerBookingsTable).where(and(
        eq(trainerBookingsTable.status, "paid"),
        eq(trainerBookingsTable.userId, req.userId!),
      )).limit(1),
      db.select({ id: ptMembershipsTable.id }).from(ptMembershipsTable)
        .leftJoin(trainerBookingsTable, eq(ptMembershipsTable.bookingId, trainerBookingsTable.id)).where(and(
        eq(ptMembershipsTable.paymentStatus, "paid"),
        or(eq(trainerBookingsTable.userId, req.userId!),
          and(isNull(ptMembershipsTable.bookingId),
            sql`right(regexp_replace(${ptMembershipsTable.mobile}, '\\D', '', 'g'), 10) = ${mobile}`)),
      )).limit(1),
      db.select().from(leadsTable).where(and(
        eq(leadsTable.source, TRAINER_ENQUIRY_SOURCE), eq(leadsTable.kind, "general"),
        ne(leadsTable.status, "cancelled"),
        sql`right(regexp_replace(${leadsTable.phone}, '\\D', '', 'g'), 10) = ${mobile}`,
      )).orderBy(desc(leadsTable.createdAt)),
      db.select().from(ptProgramsTable).where(eq(ptProgramsTable.userId, req.userId!)),
    ]);
    // Programs with no phone can first-claim through their matching lead.
    if (matchingEnquiries.length) {
      await db.update(ptProgramsTable).set({ userId: req.userId! }).where(and(
        isNull(ptProgramsTable.userId), eq(ptProgramsTable.refType, "enquiry"),
        inArray(ptProgramsTable.refId, matchingEnquiries.map(e => e.id)),
      ));
    }
    const enquiryPrograms = matchingEnquiries.length ? await db.select().from(ptProgramsTable).where(and(
      eq(ptProgramsTable.refType, "enquiry"), inArray(ptProgramsTable.refId, matchingEnquiries.map(e => e.id)),
    )) : [];
    const linkedPrograms = enquiryPrograms.filter(p => p.userId === req.userId);
    const foreignRefs = new Set(enquiryPrograms.filter(p => p.userId !== req.userId).map(p => p.refId));
    const enquiries = matchingEnquiries.filter(e => !foreignRefs.has(e.id));
    const programs = [...allPrograms, ...linkedPrograms];
    const completedSessions = linkedPrograms.length ? await db.select({
      refId: ptSessionsTable.refId, count: sql<number>`count(*)::int`,
    }).from(ptSessionsTable).where(and(
      eq(ptSessionsTable.refType, "enquiry"), eq(ptSessionsTable.status, "completed"),
      inArray(ptSessionsTable.refId, linkedPrograms.map(p => p.refId)),
    )).groupBy(ptSessionsTable.refId) : [];
    const trialCompleted = programs.some(p => p.status === "completed" || !!p.session2DoneAt) ||
      completedSessions.some(s => s.count >= 2);
    const program = linkedPrograms.filter(p => ["accepted", "ongoing", "completed"].includes(p.status))
      .sort((a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime())[0];
    const lead = program ? enquiries.find(e => e.id === program.refId) : enquiries[0];
    const sessions = program ? await listPtSessions("enquiry", program.refId) : [];
    const completedCount = Math.max(
      sessions.filter(s => s.status === "completed").length,
      program ? [program.session1DoneAt, program.session2DoneAt].filter(Boolean).length : 0,
      program?.status === "completed" ? 2 : 0,
    );
    const feedback = await db.select({ sessionNo: ptTrialFeedbackTable.sessionNo })
      .from(ptTrialFeedbackTable).where(eq(ptTrialFeedbackTable.userId, req.userId!));
    const trialNeedsFeedback = !!program && completedCount >= 2 &&
      (!feedback.some(f => f.sessionNo === 1) || !feedback.some(f => f.sessionNo === 2));
    const assignments = await fetchPtAssignmentMap("enquiry", program ? [program.refId] : []);
    const assignment = lead ? assignments.get(lead.id) : undefined;
    const photos = assignment?.trainerId ? await trainerPhotoMap([assignment.trainerId]) : new Map<string, string>();
    const hasYoactivPt = profile.memberships.some(p =>
      /\bpt\b|personal\s*train/i.test(`${p.serviceName} ${p.planName}`));
    const reason = journeyDecision({
      synced,
      active: primary?.status === "active" && !!primary.expiryDate &&
        planStartTimestamp(primary.expiryDate) + 86400000 > now,
      accountCreatedAt: account.createdAt, planStartedOn: primary?.startDate ?? null, now,
      hasPaidPt: paidBookings.length > 0 || paidPlans.length > 0 || hasYoactivPt,
      trialCompleted: trialCompleted || completedCount >= 2,
      trialInProgress: !!program && program.status !== "completed", trialNeedsFeedback,
    });
    res.json(GetFitnessJourneyResponse.parse({
      ...empty, eligible: ["new_offer", "in_progress", "feedback_only"].includes(reason), reason,
      hasBooking: !!lead, assigned: !!program || !!assignment,
      completedCount, trainerName: program?.staffName || assignment?.trainerName || "",
      trainerPhotoUrl: photos.get(assignment?.trainerId ?? "") ?? "",
    }));
  } catch {
    res.status(503).json({ error: "Could not verify trial eligibility. Please retry." });
  }
});

export default router;