import { randomUUID } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import {
  adminsTable,
  communityMediaTable,
  communityPostsTable,
  db,
  gymsTable,
  staffTable,
  usersTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { optionalUser, requireUser } from "../lib/currentUser";
import { trainerPhotoMap } from "../lib/trainerPhotos";
import { fetchYoactivTrainers } from "../lib/yoactiv";
import {
  canReadCommunityPost,
  communityModerationSourceStatuses,
  newCommunitySubmission,
  resolveCommunityCoach,
  type CommunityStatus,
} from "../lib/communityPolicy";
import { prepareCommunityStill } from "../lib/communityUpload";
import { GetCommunityCoachResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const MAX_CAPTION_LENGTH = 1_200;
const MAX_PAGE_SIZE = 50;

const ADMIN_STATUSES: CommunityStatus[] = [
  "pending",
  "approved",
  "rejected",
  "unpublished",
  "withdrawn",
];

let communityTablesEnsured = false;

/** Additive deployment DDL. Do not use db push: it can remove user_sessions. */
export async function ensureCommunityTables(): Promise<void> {
  if (communityTablesEnsured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS community_posts (
      id serial PRIMARY KEY,
      author_user_id integer NOT NULL,
      caption text NOT NULL DEFAULT '',
      trainer_staff_id integer,
      trainer_yoactiv_staff_id text,
      trainer_name text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'pending',
      public_sharing_consent boolean NOT NULL DEFAULT false,
      rejection_reason text NOT NULL DEFAULT '',
      reviewed_by_admin_id integer,
      submitted_at timestamptz NOT NULL DEFAULT now(),
      reviewed_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS community_media (
      id text PRIMARY KEY,
      post_id integer NOT NULL,
      kind text NOT NULL,
      mime_type text NOT NULL,
      size_bytes integer NOT NULL,
      data_base64 text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS community_posts_status_submitted_idx
      ON community_posts (status, submitted_at DESC);
    CREATE INDEX IF NOT EXISTS community_posts_author_submitted_idx
      ON community_posts (author_user_id, submitted_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS community_media_post_kind_unique
      ON community_media (post_id, kind);
    CREATE INDEX IF NOT EXISTS community_media_post_idx ON community_media (post_id);
  `);
  communityTablesEnsured = true;
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function page(req: Request): { limit: number; beforeId?: number } | null {
  const rawLimit = req.query.limit;
  const rawBefore = req.query.beforeId;
  const limit =
    rawLimit === undefined ? 20 : parsePositiveInteger(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit);
  if (!limit) return null;
  if (rawBefore === undefined) return { limit: Math.min(limit, MAX_PAGE_SIZE) };
  const beforeId = parsePositiveInteger(Array.isArray(rawBefore) ? rawBefore[0] : rawBefore);
  return beforeId ? { limit: Math.min(limit, MAX_PAGE_SIZE), beforeId } : null;
}

function mediaUrl(id: string): string {
  return `/api/community/media/${id}`;
}

function cleanCaption(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const caption = value.trim();
  return caption.length <= MAX_CAPTION_LENGTH ? caption : null;
}

async function loadCurrentCommunityAdmin(req: Request): Promise<number | null> {
  const id = req.session.adminId;
  if (!id) return null;
  const [admin] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.id, id))
    .limit(1);
  return admin?.id ?? null;
}

// Unlike the broad legacy admin middleware, community's sensitive photos
// re-check the session id against admins on every request. A deleted account's
// old cookie must never retain moderation or private-media access.
async function requireCurrentCommunityAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireAdmin(req, res, async () => {
    try {
      const adminId = await loadCurrentCommunityAdmin(req);
      if (!adminId) {
        req.session.destroy(() => undefined);
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      res.locals.communityAdminId = adminId;
      next();
    } catch (error) {
      req.log?.error({ err: error }, "Community admin verification failed");
      res.status(500).json({ error: "Admin verification failed" });
    }
  });
}

async function optionalMemberOrCurrentAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session.adminId) {
    optionalUser(req, res, next);
    return;
  }
  try {
    const adminId = await loadCurrentCommunityAdmin(req);
    if (!adminId) {
      req.session.destroy(() => undefined);
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.locals.communityAdminId = adminId;
    next();
  } catch (error) {
    req.log?.error({ err: error }, "Community admin verification failed");
    res.status(500).json({ error: "Admin verification failed" });
  }
}


async function postMedia(postIds: number[]) {
  if (!postIds.length) return new Map<number, { beforeUrl: string; afterUrl: string }>();
  const rows = await db
    .select({ postId: communityMediaTable.postId, id: communityMediaTable.id, kind: communityMediaTable.kind })
    .from(communityMediaTable)
    .where(inArray(communityMediaTable.postId, postIds));
  const result = new Map<number, { beforeUrl: string; afterUrl: string }>();
  for (const row of rows) {
    const existing = result.get(row.postId) ?? { beforeUrl: "", afterUrl: "" };
    if (row.kind === "before") existing.beforeUrl = mediaUrl(row.id);
    if (row.kind === "after") existing.afterUrl = mediaUrl(row.id);
    result.set(row.postId, existing);
  }
  return result;
}

// Match the branch-scoped live roster rule used by routes/trainers.ts. A local
// staff record alone is not enough: it must be active, PT-enabled, mapped to
// this gym, and currently present in that gym's YoActiv roster.
async function availableCommunityTrainers(gymId: number): Promise<
  { id: number; name: string; yoactivStaffId: string }[]
> {
  const [gym] = await db
    .select({ yoactivBranchId: gymsTable.yoactivBranchId })
    .from(gymsTable)
    .where(eq(gymsTable.id, gymId));
  if (!gym?.yoactivBranchId) return [];
  const [staff, live] = await Promise.all([
    db
      .select({ id: staffTable.id, name: staffTable.name, yoactivStaffId: staffTable.yoactivStaffId })
      .from(staffTable)
      .where(and(
        eq(staffTable.gymId, gymId),
        eq(staffTable.isActive, true),
        sql`${staffTable.permissions} @> ARRAY['pt.manage']::text[]`,
        sql`${staffTable.yoactivStaffId} IS NOT NULL AND ${staffTable.yoactivStaffId} <> ''`,
      )),
    fetchYoactivTrainers(gym.yoactivBranchId),
  ]);
  const liveNames = new Map(live.map((trainer) => [trainer.id, trainer.name]));
  return staff
    .filter((member): member is typeof member & { yoactivStaffId: string } =>
      Boolean(member.yoactivStaffId && liveNames.has(member.yoactivStaffId)),
    )
    .map((member) => ({
      id: member.id,
      // YoActiv is the source of truth for the live identity/display name.
      name: liveNames.get(member.yoactivStaffId) || member.name,
      yoactivStaffId: member.yoactivStaffId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function postDto(
  row: {
    id: number; caption: string; trainerName: string; status: string; rejectionReason: string;
    publicSharingConsent: boolean; submittedAt: Date; reviewedAt: Date | null;
    authorName: string | null; authorAvatarUrl: string | null;
  },
  media: { beforeUrl: string; afterUrl: string } | undefined,
  includeModeration: boolean,
) {
  return {
    id: row.id,
    caption: row.caption,
    trainerName: row.trainerName || null,
    authorName: row.authorName || "Member",
    authorAvatarUrl: row.authorAvatarUrl || null,
    beforeImageUrl: media?.beforeUrl || null,
    afterImageUrl: media?.afterUrl || null,
    submittedAt: row.submittedAt,
    ...(includeModeration
      ? {
          status: row.status,
          rejectionReason: row.rejectionReason || null,
          publicSharingConsent: row.publicSharingConsent,
          reviewedAt: row.reviewedAt,
        }
      : {}),
  };
}

async function selectPosts(where: ReturnType<typeof and> | undefined, limit: number) {
  return db
    .select({
      id: communityPostsTable.id,
      caption: communityPostsTable.caption,
      trainerName: communityPostsTable.trainerName,
      status: communityPostsTable.status,
      rejectionReason: communityPostsTable.rejectionReason,
      publicSharingConsent: communityPostsTable.publicSharingConsent,
      submittedAt: communityPostsTable.submittedAt,
      reviewedAt: communityPostsTable.reviewedAt,
      authorName: usersTable.name,
      authorAvatarUrl: usersTable.avatarUrl,
    })
    .from(communityPostsTable)
    .leftJoin(usersTable, eq(communityPostsTable.authorUserId, usersTable.id))
    .where(where)
    .orderBy(desc(communityPostsTable.id))
    .limit(limit);
}

// Approved-only public feed. It never returns review metadata or non-approved
// records, even when callers guess a post id.
router.get("/community", async (req: Request, res: Response): Promise<void> => {
  const pagination = page(req);
  if (!pagination) {
    res.status(400).json({ error: "limit and beforeId must be positive integers" });
    return;
  }
  const where = pagination.beforeId
    ? and(
        eq(communityPostsTable.status, "approved"),
        eq(communityPostsTable.publicSharingConsent, true),
        lt(communityPostsTable.id, pagination.beforeId),
      )
    : and(
        eq(communityPostsTable.status, "approved"),
        eq(communityPostsTable.publicSharingConsent, true),
      );
  const rows = await selectPosts(where, pagination.limit + 1);
  const hasMore = rows.length > pagination.limit;
  const items = rows.slice(0, pagination.limit);
  const media = await postMedia(items.map((item) => item.id));
  res.setHeader("Cache-Control", "no-store");
  res.json({
    items: items.map((item) => postDto(item, media.get(item.id), false)),
    nextBeforeId: hasMore ? items.at(-1)?.id ?? null : null,
  });
});

router.get("/community/trainers", requireUser, async (req: Request, res: Response): Promise<void> => {
  const gymId = parsePositiveInteger(req.query.gymId);
  if (!gymId) {
    res.status(400).json({ error: "gymId must be a positive integer" });
    return;
  }
  const trainers = await availableCommunityTrainers(gymId);
  res.json(trainers.map(({ id, name }) => ({ id, name })));
});

router.post("/community", requireUser, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown> | undefined;
  const caption = cleanCaption(body?.caption);
  if (caption === null) {
    res.status(400).json({ error: `caption must be a string up to ${MAX_CAPTION_LENGTH} characters` });
    return;
  }
  if (body?.publicSharingConsent !== true) {
    res.status(400).json({ error: "Explicit public sharing consent is required" });
    return;
  }
  let before: { data: Buffer; mimeType: string };
  let after: { data: Buffer; mimeType: string };
  try {
    [before, after] = await Promise.all([
      prepareCommunityStill(body?.beforeImage),
      prepareCommunityStill(body?.afterImage),
    ]);
  } catch (error) {
    res.status(422).json({ error: error instanceof Error ? error.message : "Invalid photos" });
    return;
  }

  let trainer: { id: number; name: string; yoactivStaffId: string | null } | undefined;
  if (body?.trainerStaffId !== undefined || body?.gymId !== undefined) {
    const trainerStaffId = parsePositiveInteger(body?.trainerStaffId);
    const gymId = parsePositiveInteger(body?.gymId);
    if (!trainerStaffId || !gymId) {
      res.status(400).json({ error: "trainerStaffId and gymId must be positive integers when selecting a trainer" });
      return;
    }
    trainer = (await availableCommunityTrainers(gymId)).find((candidate) => candidate.id === trainerStaffId);
    if (!trainer) {
      res.status(400).json({ error: "Selected trainer is not available for this branch" });
      return;
    }
  }

  const beforeId = randomUUID();
  const afterId = randomUUID();
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(communityPostsTable).values({
      ...newCommunitySubmission(req.userId!),
      caption,
      trainerStaffId: trainer?.id,
      trainerYoactivStaffId: trainer?.yoactivStaffId ?? null,
      trainerName: trainer?.name ?? "",
    }).returning({ id: communityPostsTable.id, submittedAt: communityPostsTable.submittedAt });
    const post = rows[0]!;
    await tx.insert(communityMediaTable).values([
      { id: beforeId, postId: post.id, kind: "before", mimeType: before.mimeType, sizeBytes: before.data.length, dataBase64: before.data.toString("base64") },
      { id: afterId, postId: post.id, kind: "after", mimeType: after.mimeType, sizeBytes: after.data.length, dataBase64: after.data.toString("base64") },
    ]);
    return [post];
  });
  res.status(201).json({ id: created.id, status: "pending", submittedAt: created.submittedAt });
});

router.get("/community/mine", requireUser, async (req: Request, res: Response): Promise<void> => {
  const pagination = page(req);
  if (!pagination) {
    res.status(400).json({ error: "limit and beforeId must be positive integers" });
    return;
  }
  const where = pagination.beforeId
    ? and(eq(communityPostsTable.authorUserId, req.userId!), lt(communityPostsTable.id, pagination.beforeId))
    : eq(communityPostsTable.authorUserId, req.userId!);
  const rows = await selectPosts(where, pagination.limit + 1);
  const hasMore = rows.length > pagination.limit;
  const items = rows.slice(0, pagination.limit);
  const media = await postMedia(items.map((item) => item.id));
  res.setHeader("Cache-Control", "no-store");
  res.json({ items: items.map((item) => postDto(item, media.get(item.id), true)), nextBeforeId: hasMore ? items.at(-1)?.id ?? null : null });
});

router.post("/community/:id/withdraw", requireUser, async (req: Request, res: Response): Promise<void> => {
  const id = parsePositiveInteger(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid community post id" });
    return;
  }
  const [updated] = await db.update(communityPostsTable)
    .set({ status: "withdrawn" })
    .where(and(eq(communityPostsTable.id, id), eq(communityPostsTable.authorUserId, req.userId!)))
    .returning({ id: communityPostsTable.id, submittedAt: communityPostsTable.submittedAt });
  if (!updated) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  res.json({ id, status: "withdrawn", submittedAt: updated.submittedAt });
});

router.get("/community/media/:id", optionalMemberOrCurrentAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  const [row] = await db
    .select({
      mimeType: communityMediaTable.mimeType,
      dataBase64: communityMediaTable.dataBase64,
      status: communityPostsTable.status,
      publicSharingConsent: communityPostsTable.publicSharingConsent,
      authorUserId: communityPostsTable.authorUserId,
    })
    .from(communityMediaTable)
    .innerJoin(communityPostsTable, eq(communityMediaTable.postId, communityPostsTable.id))
    .where(eq(communityMediaTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  const allowed = canReadCommunityPost(row, {
    userId: req.userId,
    isCurrentAdmin: Boolean(res.locals.communityAdminId),
  });
  if (!allowed) {
    res.status(403).json({ error: "You cannot access this image" });
    return;
  }
  const data = Buffer.from(row.dataBase64, "base64");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", row.mimeType);
  res.setHeader("Content-Length", data.length);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(data);
});

// This route intentionally uses the community post id, not a trainer id.
router.get("/community/:id/coach", optionalMemberOrCurrentAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parsePositiveInteger(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid community post id" });
    return;
  }

  const [post] = await db
    .select({
      status: communityPostsTable.status,
      publicSharingConsent: communityPostsTable.publicSharingConsent,
      authorUserId: communityPostsTable.authorUserId,
      trainerStaffId: communityPostsTable.trainerStaffId,
      trainerYoactivStaffId: communityPostsTable.trainerYoactivStaffId,
    })
    .from(communityPostsTable)
    .where(eq(communityPostsTable.id, id))
    .limit(1);
  if (!post) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const requester = {
    userId: req.userId,
    isCurrentAdmin: Boolean(res.locals.communityAdminId),
  };
  if (!canReadCommunityPost(post, requester)) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  if (post.trainerStaffId === null || post.trainerYoactivStaffId === null) {
    res.status(404).json({ error: "Coach not found" });
    return;
  }

  const [staff] = await db
    .select({
      id: staffTable.id,
      gymId: staffTable.gymId,
      yoactivStaffId: staffTable.yoactivStaffId,
      isActive: staffTable.isActive,
      permissions: staffTable.permissions,
      gymDbId: gymsTable.id,
      gymName: gymsTable.name,
    })
    .from(staffTable)
    .leftJoin(gymsTable, eq(staffTable.gymId, gymsTable.id))
    .where(eq(staffTable.id, post.trainerStaffId))
    .limit(1);
  const candidates = staff?.gymId ? await availableCommunityTrainers(staff.gymId) : [];
  const candidate = candidates.find((trainer) => trainer.id === post.trainerStaffId) ?? null;
  const coach = resolveCommunityCoach(
    post,
    requester,
    staff ?? null,
    candidate,
    staff?.gymDbId !== null && staff?.gymDbId !== undefined && staff.gymName !== null
      ? { id: staff.gymDbId, name: staff.gymName }
      : null,
  );
  if (!coach) {
    res.status(404).json({ error: "Coach not found" });
    return;
  }

  const photos = await trainerPhotoMap([coach.trainerId]);
  res.setHeader("Cache-Control", "no-store");
  res.json(GetCommunityCoachResponse.parse({
    ...coach,
    photoUrl: photos.get(coach.trainerId) ?? null,
  }));
});

router.get("/community/:id", optionalMemberOrCurrentAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parsePositiveInteger(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid community post id" });
    return;
  }
  const rows = await selectPosts(eq(communityPostsTable.id, id), 1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  const isAdmin = Boolean(res.locals.communityAdminId);
  const own = await db.select({ authorUserId: communityPostsTable.authorUserId }).from(communityPostsTable).where(eq(communityPostsTable.id, id));
  if (!canReadCommunityPost({
    status: row.status,
    publicSharingConsent: row.publicSharingConsent,
    authorUserId: own[0]?.authorUserId ?? 0,
  }, { userId: req.userId, isCurrentAdmin: isAdmin })) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  const media = await postMedia([id]);
  res.setHeader("Cache-Control", "no-store");
  res.json(postDto(row, media.get(id), isAdmin || own[0]?.authorUserId === req.userId));
});

router.get("/admin/community", requireCurrentCommunityAdmin, async (req: Request, res: Response): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  if (!ADMIN_STATUSES.includes(status as CommunityStatus)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const pagination = page(req);
  if (!pagination) {
    res.status(400).json({ error: "limit and beforeId must be positive integers" });
    return;
  }
  const where = pagination.beforeId
    ? and(eq(communityPostsTable.status, status), lt(communityPostsTable.id, pagination.beforeId))
    : eq(communityPostsTable.status, status);
  const rows = await selectPosts(where, pagination.limit + 1);
  const hasMore = rows.length > pagination.limit;
  const items = rows.slice(0, pagination.limit);
  const media = await postMedia(items.map((item) => item.id));
  res.setHeader("Cache-Control", "no-store");
  res.json({ items: items.map((item) => postDto(item, media.get(item.id), true)), nextBeforeId: hasMore ? items.at(-1)?.id ?? null : null });
});

router.patch("/admin/community/:id", requireCurrentCommunityAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parsePositiveInteger(req.params.id);
  const action = (req.body as { action?: unknown } | undefined)?.action;
  const rawReason = (req.body as { reason?: unknown } | undefined)?.reason;
  if (!id || (action !== "approve" && action !== "reject" && action !== "unpublish")) {
    res.status(400).json({ error: "Valid id and action (approve, reject, or unpublish) are required" });
    return;
  }
  const reason = typeof rawReason === "string" ? rawReason.trim().slice(0, 500) : "";
  if (action === "reject" && !reason) {
    res.status(400).json({ error: "A rejection reason is required" });
    return;
  }
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "unpublished";
  const allowedStatuses = communityModerationSourceStatuses(action);
  const [updated] = await db.update(communityPostsTable)
    .set({
      status,
      rejectionReason: action === "reject" ? reason : "",
      reviewedByAdminId: res.locals.communityAdminId,
      reviewedAt: new Date(),
    })
    // Status + consent are part of the UPDATE predicate, not a stale
    // read-before-write decision. This prevents a concurrent member withdrawal
    // (or consent repair) from being overwritten into a public post.
    .where(and(
      eq(communityPostsTable.id, id),
      inArray(communityPostsTable.status, allowedStatuses),
      ...(action === "approve" ? [eq(communityPostsTable.publicSharingConsent, true)] : []),
    ))
    .returning({ id: communityPostsTable.id, status: communityPostsTable.status, rejectionReason: communityPostsTable.rejectionReason });
  if (!updated) {
    // Do not retry or force a write: a withdrawn/de-consented concurrent row
    // remains private. The caller can refresh moderation state.
    res.status(409).json({ error: "Submission changed or cannot be moderated" });
    return;
  }
  res.json(updated);
});

export default router;