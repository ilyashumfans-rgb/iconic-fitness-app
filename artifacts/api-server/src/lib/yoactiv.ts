import { logger } from "./logger";

/**
 * YoActiv gym-management API client (https://api.yoactiv.com).
 *
 * Auth: every request carries `API_Key` + `Branch_Id` headers. The business
 * runs two production API keys, each covering a different set of branch ids;
 * development uses the sandbox key + sandbox branch. Mode is picked from
 * YOACTIV_MODE if set, otherwise NODE_ENV (production → live keys).
 */

const BASE_URL = process.env.YOACTIV_BASE_URL ?? "https://api.yoactiv.com";
const REQUEST_TIMEOUT_MS = 8000;

type KeyConfig = { apiKey: string; branchIds: number[] };

function parseBranchIds(raw: string | undefined): number[] {
  return (raw ?? "")
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function isProductionMode(): boolean {
  const override = process.env.YOACTIV_MODE;
  if (override === "production") return true;
  if (override === "sandbox") return false;
  return process.env.NODE_ENV === "production";
}

function availableKeys(): string[] {
  const keys = [
    process.env.YOACTIV_SANDBOX_API_KEY,
    process.env.YOACTIV_API_KEY_1,
    process.env.YOACTIV_API_KEY_2,
  ]
    .map((k) => (k ?? "").trim())
    .filter((k) => k.length > 0);
  return [...new Set(keys)];
}

function branchTargets(): { branchIds: number[] }[] {
  if (isProductionMode()) {
    return [
      { branchIds: parseBranchIds(process.env.YOACTIV_BRANCH_IDS_1) },
      { branchIds: parseBranchIds(process.env.YOACTIV_BRANCH_IDS_2) },
    ].filter((t) => t.branchIds.length > 0);
  }
  const sandboxBranch = Number.parseInt(
    process.env.YOACTIV_SANDBOX_BRANCH_ID ?? "7820",
    10,
  );
  return Number.isFinite(sandboxBranch) ? [{ branchIds: [sandboxBranch] }] : [];
}

async function validateKey(apiKey: string, branchId: number): Promise<boolean> {
  try {
    const res = await yoactivPost<{ MSG?: string; Results?: unknown }>(
      "/Users/GetUserList",
      apiKey,
      branchId,
      { Page_No: "1" },
    );
    return res.Results !== undefined;
  } catch {
    return false;
  }
}

// API keys arrive as three secrets, but which key covers which branch set
// isn't guaranteed (they have been pasted in swapped order before). Probe
// each key against each target's first branch once and cache the match.
let resolvedConfigs: Promise<KeyConfig[]> | null = null;
let resolvedAt = 0;
const RESOLVE_RETRY_MS = 60 * 1000;

async function resolveKeyConfigs(): Promise<KeyConfig[]> {
  const keys = availableKeys();
  const targets = branchTargets();
  const configs: KeyConfig[] = [];
  const used = new Set<string>();
  for (const target of targets) {
    for (const key of keys) {
      if (used.has(key)) continue;
      if (await validateKey(key, target.branchIds[0]!)) {
        configs.push({ apiKey: key, branchIds: target.branchIds });
        used.add(key);
        break;
      }
    }
  }
  if (configs.length === 0) {
    logger.warn("yoactiv: no API key matched any configured branch set");
  } else {
    logger.info(
      { targets: configs.map((c) => c.branchIds.length) },
      "yoactiv: key/branch-set assignment resolved",
    );
  }
  return configs;
}

/** Key configs for the current environment, resolved by live probing. */
export async function yoactivKeyConfigs(): Promise<KeyConfig[]> {
  const now = Date.now();
  if (resolvedConfigs) {
    const settled = await resolvedConfigs.catch(() => []);
    // Fully resolved (every branch set matched a key) → cache forever.
    // Partially or not resolved → retry after the TTL so a transient
    // outage during probing can't permanently drop a branch set.
    if (
      settled.length >= branchTargets().length ||
      now - resolvedAt < RESOLVE_RETRY_MS
    ) {
      return settled;
    }
  }
  resolvedAt = now;
  resolvedConfigs = resolveKeyConfigs();
  return resolvedConfigs.catch(() => []);
}

export function yoactivConfigured(): boolean {
  return availableKeys().length > 0 && branchTargets().length > 0;
}

export async function yoactivPost<T = unknown>(
  path: string,
  apiKey: string,
  branchId: number,
  body: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        API_Key: apiKey,
        Branch_Id: String(branchId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`YoActiv ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Keep only the last 10 digits — YoActiv stores bare Indian mobile numbers. */
export function normalizeMobile(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * YoActiv returns an `Image` URL for members, but uses a generic
 * "noimg" placeholder when no real photo was uploaded there. Treat the
 * placeholder (and anything that isn't an http(s) URL) as "no photo".
 */
export function normalizeYoactivImage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  if (/noimg/i.test(url)) return null;
  return url;
}

// ─── Member membership lookup ────────────────────────────────────────────────

export type YoactivMembership = {
  branchId: number;
  branchName: string;
  serviceName: string;
  planName: string;
  status: "active" | "paused" | "expired";
  startDate: string | null; // ISO date
  expiryDate: string | null; // ISO date
  sessionsTotal: number | null;
  sessionsUsed: number | null;
  billId: string;
  invoiceDate: string | null; // ISO date
  amountInr: number | null;
  discountInr: number | null;
};

export type YoactivMemberProfile = {
  memberId: number;
  name: string;
  mobile: string;
  /** Real member photo hosted by YoActiv, or null (placeholder filtered out). */
  photoUrl: string | null;
  branchCount: number;
  memberships: YoactivMembership[];
};

type FetchResult = {
  MemberId?: number;
  Name?: string;
  Mobile?: string;
  Image?: string;
  Error?: string;
  Results?: Array<{
    Studio_ID?: string;
    Studio_Name?: string;
    Service_Name?: string;
    Service_Variation_Name?: string;
    Status?: string;
    Start_Date?: string;
    Expiry_date?: string;
    Total_Sessions?: string;
    Used_Sessions?: string;
    Bill_ID?: string;
    upgradeDetails?: {
      total_due?: number;
      discount_value?: number;
      invoice_date?: string;
    };
  }>;
};

/** Convert YoActiv "DD-MM-YYYY" to ISO "YYYY-MM-DD" (null if unparseable). */
function toIsoDate(raw: string | undefined): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw ?? "");
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toCount(raw: string | undefined): number | null {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? n : null;
}

/** Map YoActiv status strings to our enum without losing freeze/hold info. */
function toStatus(raw: string | undefined): "active" | "paused" | "expired" {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("freez") || s.includes("froze") || s.includes("hold") || s.includes("pause")) {
    return "paused";
  }
  return s === "active" ? "active" : "expired";
}

// Small in-memory cache so /memberships/mine doesn't hit YoActiv on every
// poll. Successes cached 5 min; failures cached 60s (avoids hammering a
// struggling upstream while still recovering quickly).
const cache = new Map<
  string,
  { at: number; ttlMs: number; value: YoactivMemberProfile | null }
>();
const SUCCESS_TTL_MS = 5 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 1000;

/**
 * Look up a member across all configured YoActiv keys/branches by mobile.
 * Returns null when the mobile isn't found anywhere (or nothing configured).
 * Throws only on unexpected transport errors when nothing cached.
 */
export async function fetchYoactivMemberByMobile(
  rawMobile: string | null | undefined,
): Promise<YoactivMemberProfile | null> {
  const mobile = normalizeMobile(rawMobile);
  if (!mobile) return null;
  const configs = await yoactivKeyConfigs();
  if (configs.length === 0) return null;

  const cached = cache.get(mobile);
  if (cached && Date.now() - cached.at < cached.ttlMs) return cached.value;

  try {
    const profile = await withDeadline(
      lookupAcrossKeys(mobile, configs),
      LOOKUP_BUDGET_MS,
    );
    cache.set(mobile, { at: Date.now(), ttlMs: SUCCESS_TTL_MS, value: profile });
    return profile;
  } catch (err) {
    logger.warn({ err, mobile: `…${mobile.slice(-4)}` }, "yoactiv lookup failed");
    cache.set(mobile, { at: Date.now(), ttlMs: FAILURE_TTL_MS, value: null });
    return null;
  }
}

// Overall time budget for one member lookup — /memberships/mine is polled
// frequently, so a degraded upstream must fail fast to the local fallback.
const LOOKUP_BUDGET_MS = 6000;

async function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("yoactiv lookup deadline exceeded")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function lookupAcrossKeys(
  mobile: string,
  configs: KeyConfig[],
): Promise<YoactivMemberProfile | null> {
  const results = await Promise.all(
    configs.map((config) => lookupForKey(mobile, config)),
  );
  const found = results.filter((r): r is YoactivMemberProfile => r !== null);
  if (found.length === 0) return null;
  // A member can theoretically exist under both keys — merge their plans.
  return {
    memberId: found[0]!.memberId,
    name: found[0]!.name,
    mobile,
    photoUrl: found.find((p) => p.photoUrl)?.photoUrl ?? null,
    branchCount: found.reduce((n, p) => n + p.branchCount, 0),
    memberships: found.flatMap((p) => p.memberships),
  };
}

async function lookupForKey(
  mobile: string,
  config: KeyConfig,
): Promise<YoactivMemberProfile | null> {
  // Ask which branches this member belongs to (any branch header works for
  // the key), then fetch the full profile from each matching branch.
  const probeBranch = config.branchIds[0]!;
  let memberBranches: number[] = [];
  try {
    const res = await yoactivPost<{
      Results?: Array<{ Branch_Id?: number }>;
    }>("/Users/Branches", config.apiKey, probeBranch, { Mobile_No: mobile });
    memberBranches = (res.Results ?? [])
      .map((b) => b.Branch_Id ?? 0)
      .filter((id) => config.branchIds.includes(id));
  } catch {
    // Branch discovery failed — fall back to probing every branch directly
    // (in parallel below, bounded by the overall lookup deadline).
    memberBranches = config.branchIds;
  }
  if (memberBranches.length === 0) return null;

  const fetches = await Promise.allSettled(
    memberBranches.map((branchId) =>
      yoactivPost<FetchResult>("/Users/Fetch", config.apiKey, branchId, {
        Mobile_No: mobile,
      }).then((data) => ({ branchId, data })),
    ),
  );

  const memberships: YoactivMembership[] = [];
  let memberId = 0;
  let name = "";
  let photoUrl: string | null = null;
  let branchCount = 0;
  for (const settled of fetches) {
    if (settled.status !== "fulfilled") continue;
    const { branchId, data } = settled.value;
    if (data.Error || !data.MemberId) continue;
    memberId = data.MemberId;
    name = data.Name ?? name;
    photoUrl = normalizeYoactivImage(data.Image) ?? photoUrl;
    branchCount += 1;
    for (const row of data.Results ?? []) {
      memberships.push({
        branchId,
        branchName: row.Studio_Name ?? "",
        serviceName: row.Service_Name ?? "",
        planName:
          row.Service_Variation_Name || row.Service_Name || "Membership",
        status: toStatus(row.Status),
        startDate: toIsoDate(row.Start_Date),
        expiryDate: toIsoDate(row.Expiry_date),
        sessionsTotal: toCount(row.Total_Sessions),
        sessionsUsed: toCount(row.Used_Sessions),
        billId: row.Bill_ID ?? "",
        invoiceDate: toIsoDate(row.upgradeDetails?.invoice_date),
        amountInr:
          typeof row.upgradeDetails?.total_due === "number"
            ? row.upgradeDetails.total_due
            : null,
        discountInr:
          typeof row.upgradeDetails?.discount_value === "number"
            ? row.upgradeDetails.discount_value
            : null,
      });
    }
  }
  if (!memberId) return null;
  return { memberId, name, mobile, photoUrl, branchCount, memberships };
}

/**
 * Pick the membership to surface as "the" plan: an active one with the
 * latest expiry wins; otherwise the most recently expired one.
 */
export function pickPrimaryMembership(
  profile: YoactivMemberProfile,
): YoactivMembership | null {
  const rows = [...profile.memberships];
  if (rows.length === 0) return null;
  const rank = { active: 0, paused: 1, expired: 2 } as const;
  rows.sort((a, b) => {
    if (a.status !== b.status) return rank[a.status] - rank[b.status];
    return (b.expiryDate ?? "").localeCompare(a.expiryDate ?? "");
  });
  return rows[0] ?? null;
}

// ─── Personal trainer roster ─────────────────────────────────────────────────

export type YoactivTrainer = {
  id: string;
  name: string;
};

type StaffRow = { ID?: unknown; Staff?: unknown; Mobile?: unknown };
type GetStaffResponse = { Data?: { PTStaffs?: StaffRow[] } };

const TRAINERS_SUCCESS_TTL_MS = 10 * 60 * 1000;
const TRAINERS_FAILURE_TTL_MS = 60 * 1000;
const TRAINERS_BUDGET_MS = 10_000;

const trainersCacheByBranch = new Map<
  string,
  { at: number; ttlMs: number; value: YoactivTrainer[] }
>();

/**
 * Fetch the personal-trainer (PT staff) roster, deduped by mobile number.
 * Trainer mobile numbers are intentionally NOT exposed on the returned
 * shape — they are staff PII.
 *
 * When `branchId` is provided (a gym's mapped YoActiv branch), only that
 * branch's staff is returned; otherwise the roster spans every configured
 * branch. Branch-scoped requests share the same cache keyed by branch.
 */
export async function fetchYoactivTrainers(
  branchId?: number,
): Promise<YoactivTrainer[]> {
  const configs = await yoactivKeyConfigs();
  if (configs.length === 0) return [];
  const scoped =
    branchId !== undefined
      ? configs
          .filter((c) => c.branchIds.includes(branchId))
          .map((c) => ({ apiKey: c.apiKey, branchIds: [branchId] }))
      : configs;
  // A branch id that no key covers (bad mapping) yields an empty roster —
  // never show another branch's trainers as if they were this branch's.
  if (branchId !== undefined && scoped.length === 0) return [];
  const effective = scoped.length > 0 ? scoped : configs;
  const cacheKey = branchId !== undefined ? `b:${branchId}` : "all";

  const cached = trainersCacheByBranch.get(cacheKey);
  if (cached && Date.now() - cached.at < cached.ttlMs) return cached.value;
  try {
    const value = await withDeadline(
      fetchTrainersAcrossKeys(effective),
      TRAINERS_BUDGET_MS,
    );
    trainersCacheByBranch.set(cacheKey, {
      at: Date.now(),
      ttlMs: TRAINERS_SUCCESS_TTL_MS,
      value,
    });
    return value;
  } catch (err) {
    logger.warn({ err }, "yoactiv trainer roster fetch failed");
    const stale = cached?.value ?? [];
    trainersCacheByBranch.set(cacheKey, {
      at: Date.now(),
      ttlMs: TRAINERS_FAILURE_TTL_MS,
      value: stale,
    });
    return stale;
  }
}

async function fetchTrainersAcrossKeys(
  configs: KeyConfig[],
): Promise<YoactivTrainer[]> {
  const perBranch = configs.flatMap((config) =>
    config.branchIds.map(async (branchId) => {
      try {
        const res = await yoactivPost<GetStaffResponse>(
          "/Billing/GetStaff",
          config.apiKey,
          branchId,
          { PT: 1 },
        );
        return res.Data?.PTStaffs ?? [];
      } catch {
        return [] as StaffRow[];
      }
    }),
  );
  const rows = (await Promise.all(perBranch)).flat();
  const seen = new Set<string>();
  const trainers: YoactivTrainer[] = [];
  for (const row of rows) {
    const id = String(row.ID ?? "").trim();
    const name = String(row.Staff ?? "").trim();
    if (!id || !name) continue;
    // Dedupe: the same trainer can appear under multiple branches. Mobile is
    // the stable identity when present; fall back to the staff id.
    const mobile = normalizeMobile(typeof row.Mobile === "string" ? row.Mobile : null);
    const dedupeKey = mobile ?? `id:${id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    trainers.push({ id, name });
  }
  trainers.sort((a, b) => a.name.localeCompare(b.name));
  return trainers;
}

// ─── Branch trainer directory (admin/partner) ───────────────────────────────

export type YoactivStaffTrainer = {
  id: string;
  name: string;
  mobile: string;
};

const staffTrainersCache = new Map<
  number,
  { at: number; ttlMs: number; value: YoactivStaffTrainer[] }
>();

/**
 * PT staff roster for a single branch, INCLUDING mobile numbers — for the
 * admin/partner trainer directory only (both are staff-facing, access is
 * gated at the route level). The public member-facing roster must keep
 * using `fetchYoactivTrainers`, which strips mobiles.
 */
export async function fetchYoactivBranchTrainers(
  branchId: number,
): Promise<YoactivStaffTrainer[]> {
  const target = await resolveBranchTarget(branchId);
  if (!target) return [];
  const cached = staffTrainersCache.get(branchId);
  if (cached && Date.now() - cached.at < cached.ttlMs) return cached.value;
  try {
    const res = await withDeadline(
      yoactivPost<GetStaffResponse>("/Billing/GetStaff", target.apiKey, target.branchId, {
        PT: 1,
      }),
      TRAINERS_BUDGET_MS,
    );
    const rows = res.Data?.PTStaffs ?? [];
    const trainers: YoactivStaffTrainer[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const id = String(row.ID ?? "").trim();
      const name = String(row.Staff ?? "").trim();
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      trainers.push({
        id,
        name,
        mobile: typeof row.Mobile === "string" ? row.Mobile.trim() : "",
      });
    }
    trainers.sort((a, b) => a.name.localeCompare(b.name));
    staffTrainersCache.set(branchId, {
      at: Date.now(),
      ttlMs: TRAINERS_SUCCESS_TTL_MS,
      value: trainers,
    });
    return trainers;
  } catch (err) {
    logger.warn({ err, branchId }, "yoactiv branch trainer roster fetch failed");
    const stale = cached?.value ?? [];
    staffTrainersCache.set(branchId, {
      at: Date.now(),
      ttlMs: TRAINERS_FAILURE_TTL_MS,
      value: stale,
    });
    return stale;
  }
}

// ─── Branch member directory (admin) ────────────────────────────────────────

export type YoactivMemberRow = {
  memberId: number;
  name: string;
  mobile: string;
  email: string;
  status: string; // "Active" | "Inactive" (as reported by YoActiv)
  /** Real member photo hosted by YoActiv, or null (placeholder filtered out). */
  photoUrl: string | null;
};

type UserListRow = {
  MemberId?: number;
  Name?: string;
  Mail?: string;
  Mobile?: string;
  Member_Status?: string;
  Image?: string;
};

const MEMBER_LIST_SUCCESS_TTL_MS = 5 * 60 * 1000;
const MEMBER_LIST_FAILURE_TTL_MS = 60 * 1000;
const MEMBER_LIST_BUDGET_MS = 20_000;
const MEMBER_LIST_MAX_PAGES = 200;

const memberListCache = new Map<
  number,
  { at: number; ttlMs: number; value: YoactivMemberRow[] }
>();

/**
 * Full member directory for a branch via paginated `Users/GetUserList`.
 * Pages are fetched until a page adds no new member ids (the API keeps
 * returning the last page for out-of-range page numbers). Cached per branch.
 */
export async function fetchYoactivMemberList(
  branchId: number,
): Promise<YoactivMemberRow[]> {
  const target = await resolveBranchTarget(branchId);
  if (!target) return [];
  const cached = memberListCache.get(branchId);
  if (cached && Date.now() - cached.at < cached.ttlMs) return cached.value;
  try {
    const value = await withDeadline(
      fetchMemberListAllPages(target),
      MEMBER_LIST_BUDGET_MS,
    );
    memberListCache.set(branchId, {
      at: Date.now(),
      ttlMs: MEMBER_LIST_SUCCESS_TTL_MS,
      value,
    });
    return value;
  } catch (err) {
    logger.warn({ err, branchId }, "yoactiv member list fetch failed");
    const stale = cached?.value ?? [];
    memberListCache.set(branchId, {
      at: Date.now(),
      ttlMs: MEMBER_LIST_FAILURE_TTL_MS,
      value: stale,
    });
    return stale;
  }
}

async function fetchMemberListAllPages(target: {
  apiKey: string;
  branchId: number;
}): Promise<YoactivMemberRow[]> {
  const byId = new Map<number, YoactivMemberRow>();
  for (let page = 1; page <= MEMBER_LIST_MAX_PAGES; page++) {
    const res = await yoactivPost<{ Results?: UserListRow[] }>(
      "/Users/GetUserList",
      target.apiKey,
      target.branchId,
      { Page_No: String(page) },
    );
    const rows = res.Results ?? [];
    if (rows.length === 0) break;
    let added = 0;
    for (const row of rows) {
      const memberId = Number(row.MemberId ?? 0);
      if (!memberId || byId.has(memberId)) continue;
      added += 1;
      byId.set(memberId, {
        memberId,
        name: String(row.Name ?? "").trim(),
        mobile: String(row.Mobile ?? "").trim(),
        email: String(row.Mail ?? "").trim(),
        status: String(row.Member_Status ?? "").trim() || "Unknown",
        photoUrl: normalizeYoactivImage(row.Image),
      });
    }
    if (added === 0) break;
  }
  const members = [...byId.values()];
  members.sort((a, b) => a.name.localeCompare(b.name));
  return members;
}

// ─── PT packages, member creation & hosted payment ──────────────────────────

export type YoactivPackage = {
  id: number; // serviceVariationid — the id APIPayment books against
  serviceName: string;
  name: string;
  amountInr: number;
  sessions: number | null;
  duration: string;
  pt: boolean;
};

type ServiceRow = { serviceId?: number; serviceName?: string };
type VariationRow = {
  ServiceName?: string;
  ServiceVariation?: string;
  duration?: string;
  amount?: number;
  serviceVariationid?: number;
  Session?: string;
  PT?: number;
};

const PACKAGES_SUCCESS_TTL_MS = 10 * 60 * 1000;
const PACKAGES_FAILURE_TTL_MS = 60 * 1000;
const PACKAGES_BUDGET_MS = 12_000;

const packagesCache = new Map<
  string,
  { at: number; ttlMs: number; value: YoactivPackage[] }
>();

/** Pick the key config + concrete branch to use for a gym's mapped branch. */
export async function resolveBranchTarget(
  branchId: number | null | undefined,
): Promise<{ apiKey: string; branchId: number } | null> {
  const configs = await yoactivKeyConfigs();
  if (configs.length === 0) return null;
  // Strict mapping: an unmapped or mis-mapped gym must NOT silently use some
  // other branch — money would land in the wrong branch's account. Callers
  // treat null as "paid flow unavailable" and fall back to enquiry capture.
  if (!branchId) return null;
  const match = configs.find((c) => c.branchIds.includes(branchId));
  if (!match) return null;
  return { apiKey: match.apiKey, branchId };
}

/**
 * Purchasable session packages for a branch: every paid service variation,
 * PT-flagged ones first. Cached per branch.
 */
export async function fetchYoactivPackages(
  branchId: number | null | undefined,
): Promise<YoactivPackage[]> {
  const target = await resolveBranchTarget(branchId);
  if (!target) return [];
  const cacheKey = `b:${target.branchId}`;
  const cached = packagesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < cached.ttlMs) return cached.value;
  try {
    const value = await withDeadline(fetchPackagesForBranch(target), PACKAGES_BUDGET_MS);
    packagesCache.set(cacheKey, { at: Date.now(), ttlMs: PACKAGES_SUCCESS_TTL_MS, value });
    return value;
  } catch (err) {
    logger.warn({ err }, "yoactiv packages fetch failed");
    const stale = cached?.value ?? [];
    packagesCache.set(cacheKey, { at: Date.now(), ttlMs: PACKAGES_FAILURE_TTL_MS, value: stale });
    return stale;
  }
}

async function fetchPackagesForBranch(target: {
  apiKey: string;
  branchId: number;
}): Promise<YoactivPackage[]> {
  const services = await yoactivPost<{ Data?: { Services?: ServiceRow[] } }>(
    "/Billing/GetServices",
    target.apiKey,
    target.branchId,
    {},
  );
  const rows = (services.Data?.Services ?? []).filter(
    (s) => typeof s.serviceId === "number",
  );
  const variationLists = await Promise.allSettled(
    rows.map((s) =>
      yoactivPost<{ Data?: { ServiceVariations?: VariationRow[] } }>(
        "/Billing/GetServiceVariations",
        target.apiKey,
        target.branchId,
        { ServiceId: s.serviceId },
      ),
    ),
  );
  const packages: YoactivPackage[] = [];
  for (const settled of variationLists) {
    if (settled.status !== "fulfilled") continue;
    for (const v of settled.value.Data?.ServiceVariations ?? []) {
      if (typeof v.serviceVariationid !== "number") continue;
      const amount = typeof v.amount === "number" ? v.amount : 0;
      if (amount <= 0) continue; // free/test variations aren't sellable
      const sessions = Number.parseInt(v.Session ?? "", 10);
      packages.push({
        id: v.serviceVariationid,
        serviceName: v.ServiceName ?? "",
        name: v.ServiceVariation ?? "",
        amountInr: amount,
        sessions: Number.isFinite(sessions) ? sessions : null,
        duration: v.duration ?? "",
        pt: v.PT === 1,
      });
    }
  }
  // PT-flagged packages first, then cheapest first inside each group.
  packages.sort((a, b) =>
    a.pt !== b.pt ? (a.pt ? -1 : 1) : a.amountInr - b.amountInr,
  );
  return packages;
}

/**
 * Find (or create) the YoActiv member id for a mobile number on a branch.
 * APIPayment needs a memberId; new customers are registered via AddMember.
 */
export async function ensureYoactivMemberId(
  target: { apiKey: string; branchId: number },
  mobile: string,
  name: string,
  email: string | null,
): Promise<number | null> {
  try {
    const res = await yoactivPost<{ MemberId?: number; Error?: string }>(
      "/Users/Fetch",
      target.apiKey,
      target.branchId,
      { Mobile_No: mobile },
    );
    if (typeof res.MemberId === "number" && res.MemberId > 0) return res.MemberId;
  } catch {
    // fall through to AddMember
  }
  try {
    const created = await yoactivPost<{
      Data?: { Member_Id?: number };
      Error?: string | null;
    }>("/Billing/AddMember", target.apiKey, target.branchId, {
      Name: name,
      Mail: email ?? "",
      Ccode: "+91",
      Mobile: mobile,
    });
    const id = created.Data?.Member_Id;
    if (typeof id === "number" && id > 0) return id;
    // "already exists" without an id → re-fetch once.
    const refetch = await yoactivPost<{ MemberId?: number }>(
      "/Users/Fetch",
      target.apiKey,
      target.branchId,
      { Mobile_No: mobile },
    );
    return typeof refetch.MemberId === "number" && refetch.MemberId > 0
      ? refetch.MemberId
      : null;
  } catch (err) {
    logger.warn({ err }, "yoactiv member ensure failed");
    return null;
  }
}

/** Format a Date as YoActiv's DD-MM-YYYY in IST. */
export function toYoactivDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) throw new Error(`invalid ISO date: ${isoDate}`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Create a hosted Razorpay payment link for a service booking via YoActiv's
 * Billing/APIPayment. The link is valid for ~5 minutes.
 */
export async function createYoactivPaymentUrl(args: {
  target: { apiKey: string; branchId: number };
  memberId: number;
  variationId: number;
  amountInr: number;
  startDateIso: string;
  successUrl: string;
  failedUrl: string;
}): Promise<string | null> {
  try {
    const res = await yoactivPost<{ PaymentURL?: string; Error?: string }>(
      "/Billing/APIPayment",
      args.target.apiKey,
      args.target.branchId,
      {
        memberId: String(args.memberId),
        Busid: "1",
        Booktype: 0,
        ServiceDetails: [
          {
            Fee: args.amountInr,
            ServiceVariationID: args.variationId,
            TotAmt: args.amountInr,
            discount: 0,
            disctype: 0,
            Qty: 1,
            StartDate: toYoactivDate(args.startDateIso),
          },
        ],
        Amount: args.amountInr,
        SuccessURL: args.successUrl,
        FailedURL: args.failedUrl,
      },
    );
    return typeof res.PaymentURL === "string" && res.PaymentURL.length > 0
      ? res.PaymentURL
      : null;
  } catch (err) {
    logger.warn({ err }, "yoactiv APIPayment failed");
    return null;
  }
}
