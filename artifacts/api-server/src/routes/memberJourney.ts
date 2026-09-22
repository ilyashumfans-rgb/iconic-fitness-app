import { Router, type Request, type Response, type NextFunction } from "express";
import type { PoolClient } from "pg";
import { pool } from "@workspace/db";
import { z } from "zod";
import { requireUser } from "../lib/currentUser";
import { requireAdmin } from "../lib/adminAuth";
import { requirePartner } from "../lib/partnerAuth";
import { requireAgency } from "../lib/agencyAuth";
import { requireStaff } from "../lib/staffAuth";
import { journeyInScope, journeyScopeWhere, type JourneyScope as Scope } from "../lib/memberJourneyScope";
import { saveConfirmedJourneyBranch } from "../lib/memberJourneyBranchLink";
import { clerkClient } from "@clerk/express";
import { trustedMobileSyncIdentity } from "../lib/fitnessJourney";
import { fetchYoactivMemberByMobile, pickPrimaryMembership, normalizeMobile } from "../lib/yoactiv";
import { chartLabels, completedJourneyStages, journeyPlanDay, healthHistorySchema, journeyActionSchema, journeyStage, nextThirtyDays, permittedAction } from "../lib/memberJourneyPolicy";

const router = Router();
type Q = Pick<PoolClient, "query">;
class JourneyError extends Error { constructor(public status: number, message: string) { super(message); } }
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(e => {
    if (e instanceof JourneyError) res.status(e.status).json({ error: e.message });
    else if (e instanceof z.ZodError) res.status(400).json({ error: e.message });
    else next(e);
  });
};
async function scope(req: Request, portal: string): Promise<Scope> {
  if (portal === "admin") return { actor: `admin:${req.session.adminId}`, gyms: null, manage: true, clinical: true };
  if (portal === "staff") {
    const { rows: [s] } = await pool.query("SELECT * FROM staff WHERE id=$1 AND is_active", [req.session.staffId]);
    if (!s || !(s.permissions.includes("journey.view") || s.permissions.includes("journey.manage"))) throw new JourneyError(403, "Journey permission required");
    return { actor: `staff:${s.id}`, gyms: s.journey_gym_ids, manage: s.journey_role !== "corporate" && s.permissions.includes("journey.manage"), clinical: ["club_manager", "trainer", "dietician"].includes(s.journey_role) && s.permissions.includes("journey.manage"), trainerId: ["trainer", "dietician"].includes(s.journey_role) ? s.id : undefined };
  }
  if (portal === "agency") {
    const { rows: [s] } = await pool.query("SELECT gym_ids FROM agency_users WHERE id=$1", [req.session.agencyUserId]);
    if (!s) throw new JourneyError(403, "Account access revoked");
    return { actor: `agency:${req.session.agencyUserId}`, gyms: s.gym_ids, manage: false };
  }
  if (req.session.partnerStaffId) throw new JourneyError(403, "Journey access is owner-only");
  const { rows } = await pool.query("SELECT id FROM gyms WHERE owner_partner_id=$1", [req.session.partnerId]);
  return { actor: `partner:${req.session.partnerId}`, gyms: rows.map(r => r.id), manage: true };
}
function guard(s: Scope, row: any, write = false) {
  if (!row) throw new JourneyError(404, "Journey not found");
  if (!journeyInScope(s, row)) throw new JourneyError(403, "Member is outside your assigned scope");
  if (write && !s.manage) throw new JourneyError(403, "Read-only journey access");
}
// Only explicit internal user IDs; NEVER fuzzy phone/email or name matching.
const associations = `SELECT user_id,gym_id FROM pt_programs WHERE user_id IS NOT NULL AND gym_id IS NOT NULL
 UNION SELECT user_id,gym_id FROM member_journey_branch_links
 UNION SELECT user_id,gym_id FROM trainer_bookings WHERE user_id IS NOT NULL AND status='paid'
 UNION SELECT user_id,gym_id FROM package_bookings WHERE user_id IS NOT NULL AND status='paid'`;
async function materialize(q: Q, userId: number, actor: string, gymId?: number) {
  const { rows: old } = await q.query("SELECT * FROM member_journeys WHERE user_id=$1", [userId]);
  if (old[0]) return old[0];
  const { rows: branches } = await q.query(`SELECT DISTINCT gym_id FROM (${associations}) a WHERE user_id=$1`, [userId]);
  if (gymId ? !branches.some(b => b.gym_id === gymId) : branches.length !== 1) return null;
  const selectedGym = gymId ?? branches[0].gym_id;
  const { rows } = await q.query(`INSERT INTO member_journeys(user_id,gym_id,trainer_id)
    VALUES($1,$2,(SELECT staff_id FROM pt_programs WHERE user_id=$1 AND gym_id=$2 ORDER BY accepted_at DESC LIMIT 1)) ON CONFLICT DO NOTHING RETURNING *`, [userId, selectedGym]);
  if (rows[0]) await q.query("INSERT INTO member_journey_events(user_id,version,action,actor,payload) VALUES($1,0,'enroll',$2,'{}')", [userId, actor]);
  return rows[0] ?? (await q.query("SELECT * FROM member_journeys WHERE user_id=$1", [userId])).rows[0];
}
async function project(q: Q, row: any, s: Scope) {
  const id = row.user_id;
  const { rows: [u] } = await q.query("SELECT name FROM users WHERE id=$1", [id]);
  const { rows: programs } = await q.query("SELECT * FROM pt_programs WHERE user_id=$1 AND gym_id=$2 AND ref_type='enquiry' ORDER BY accepted_at DESC LIMIT 1", [id, row.gym_id]);
  const p = programs[0];
  const { rows: feedback } = await q.query("SELECT session_no,rating,comment FROM pt_trial_feedback WHERE user_id=$1", [id]);
  const { rows: [f] } = await q.query(`SELECT
    EXISTS(SELECT 1 FROM member_bmi_records WHERE user_id=$1 AND (bmi IS NOT NULL OR (height_cm IS NOT NULL AND weight_kg IS NOT NULL))) AS bmi,
    EXISTS(SELECT 1 FROM trainer_bookings WHERE user_id=$1 AND gym_id=$2 AND status='paid') AS paid`, [id, row.gym_id]);
  const facts = { bmi: !!f.bmi, trial1: !!p?.session1_done_at, trial2: !!p?.session2_done_at,
    feedback1: feedback.some(r => r.session_no === 1 && r.rating >= 1 && r.rating <= 5),
    feedback2: feedback.some(r => r.session_no === 2 && r.rating >= 1 && r.rating <= 5 && r.comment?.trim()), paidPt: !!f.paid };
  const { rows: charts } = await q.query('SELECT id,chart_no AS "chartNo",label,content,issued_at AS "issuedAt" FROM member_journey_charts WHERE user_id=$1 ORDER BY id', [id]);
  const { rows: events } = await q.query('SELECT id,action,actor,created_at AS "createdAt" FROM member_journey_events WHERE user_id=$1 ORDER BY id', [id]);
  const { rows: followups } = await q.query('SELECT id,kind,response,next_date AS "nextDate",created_at AS "createdAt" FROM member_journey_followups WHERE user_id=$1 ORDER BY id', [id]);
  const { rows: [att] } = await q.query("SELECT count(*)::int AS count FROM checkins WHERE user_id=$1 AND gym_id=$2 AND method='qr' AND checked_in_at >= now()-interval '30 days'", [id, row.gym_id]);
  const assigneeId = row.general_trainer_id ?? row.trainer_id ?? p?.staff_id ?? null;
  const { rows: [assignee] } = await q.query("SELECT name FROM staff WHERE id=$1", [assigneeId]);
  const currentStage = journeyStage(row, facts, charts.map(c => c.chartNo));
  const dueAt = row.due_at ?? (facts.paidPt ? nextThirtyDays(new Date(row.created_at).getTime()) : null);
  const planDay = row.general_started_at ? journeyPlanDay(row.general_started_at) : null;
  const completedStages = completedJourneyStages(row, facts, charts.map(c => c.chartNo), followups);
  return { userId: id, gymId: row.gym_id, memberName: u?.name, version: row.version,
    currentStage, nextAction: planDay && planDay > 125 && currentStage === "regular_continue" ? "cycle_complete_continue_attendance" : currentStage,
    planDay, completedStages, cycleComplete: !!planDay && planDay > 125 && [1, 2, 3].every(no => charts.some(c => c.chartNo === no)),
    assigneeId, assigneeName: assignee?.name ?? null, trialProgramId: p?.id ?? null,
    overdue: !!dueAt && new Date(dueAt).getTime() < Date.now(), dueAt, canManage: s.manage,
    canReviewHealth: !!s.clinical,
    ...(s.clinical ? { healthHistory: row.health_history, reviewedAt: row.reviewed_at, reviewNote: row.review_note } : {}),
    trainerId: row.trainer_id, generalTrainerId: row.general_trainer_id, dieticianId: row.dietician_id,
    ptDecision: facts.paidPt ? "yes" : row.pt_decision, facts, attendance: { checkinsLast30Days: att.count },
    charts: s.manage ? charts : charts.map(({ content, ...r }) => r),
    events: s.manage ? events : [], followups: s.manage ? followups : followups.map(({ response, ...r }) => r),
  };
}
async function transaction<T>(fn: (q: PoolClient) => Promise<T>): Promise<T> {
  const q = await pool.connect();
  try { await q.query("BEGIN"); const result = await fn(q); await q.query("COMMIT"); return result; }
  catch (e) { await q.query("ROLLBACK"); throw e; } finally { q.release(); }
}
router.get("/member-journey/mine", requireUser, wrap(async (req, res) => {
  const s: Scope = { actor: `member:${req.userId}`, gyms: null, manage: true, clinical: true };
  // A private receipt proves explicit sync; profile phone/email alone never does.
  const { rows: existing } = await pool.query("SELECT user_id FROM member_journeys WHERE user_id=$1", [req.userId]);
  if (!existing.length && req.clerkUserId) {
    const account = await clerkClient.users.getUser(req.clerkUserId);
    const receipt = trustedMobileSyncIdentity(account.privateMetadata.iconicMobileSync, Date.now());
    if (receipt) {
      const { rows: [user] } = await pool.query("SELECT mobile FROM users WHERE id=$1", [req.userId]);
      if (normalizeMobile(user?.mobile) === receipt.mobile) {
        const profile = await fetchYoactivMemberByMobile(receipt.mobile, { requireComplete: true });
        const primary = profile && profile.memberId === receipt.memberId ? pickPrimaryMembership(profile) : null;
        if (primary?.status === "active") await saveConfirmedJourneyBranch(req.userId!, primary.branchId, receipt.mobile);
      }
    }
  }
  const journey = await transaction(async q => {
    const row = await materialize(q, req.userId!, s.actor);
    return row ? project(q, row, s) : null;
  });
  res.json({ journey, branchRequired: !journey });
}));
router.post("/member-journey/mine/feedback", requireUser, wrap(async (req, res) => {
  const body = z.object({ version: z.number().int().nonnegative(), kind: z.enum(["pt", "attendance"]), rating: z.number().int().min(1).max(5).optional(), response: z.string().trim().min(1).max(10000) }).strict().parse(req.body);
  res.json(await transaction(async q => {
    const { rows: [row] } = await q.query("SELECT * FROM member_journeys WHERE user_id=$1 FOR UPDATE", [req.userId]);
    if (!row) throw new JourneyError(404, "Journey not found");
    if (row.version !== body.version) throw new JourneyError(409, "Journey changed; refresh and retry");
    const s: Scope = { actor: `member:${req.userId}`, gyms: null, manage: true, clinical: true };
    const dto = await project(q, row, s);
    if (body.kind === "pt" && (dto.currentStage !== "pt_followup" || !dto.dueAt || new Date(dto.dueAt).getTime() > Date.now())) throw new JourneyError(400, "PT feedback is not due yet");
    if (body.kind === "attendance" && dto.currentStage !== "attendance_followup") throw new JourneyError(400, "No attendance follow-up is pending");
    const next = body.kind === "pt" ? nextThirtyDays() : row.due_at;
    if (!next) throw new JourneyError(400, "Staff must schedule an attendance follow-up first");
    await q.query("INSERT INTO member_journey_followups(user_id,kind,response,next_date) VALUES($1,$2,$3,$4)", [req.userId, `member_${body.kind}`, body.response, next]);
    const { rows: [updated] } = await q.query("UPDATE member_journeys SET version=version+1,due_at=$2 WHERE user_id=$1 RETURNING *", [req.userId, next]);
    await q.query("INSERT INTO member_journey_events(user_id,version,action,actor,payload) VALUES($1,$2,'member_feedback',$3,$4)", [req.userId, updated.version, s.actor, body]);
    return project(q, updated, s);
  }));
}));
router.put("/member-journey/mine/health-history", requireUser, wrap(async (req, res) => {
  const { version, ...history } = healthHistorySchema.parse(req.body);
  res.json(await transaction(async q => {
    const { rows: [row] } = await q.query("SELECT * FROM member_journeys WHERE user_id=$1 FOR UPDATE", [req.userId]);
    if (!row) throw new JourneyError(409, "Branch association required; contact your branch administrator");
    if (row.version !== version) throw new JourneyError(409, "Journey changed; refresh and retry");
    const { rows: [updated] } = await q.query("UPDATE member_journeys SET health_history=$2,reviewed_at=NULL,review_note=NULL,version=version+1 WHERE user_id=$1 RETURNING *", [req.userId, { ...history, submittedAt: new Date().toISOString() }]);
    await q.query("INSERT INTO member_journey_events(user_id,version,action,actor,payload) VALUES($1,$2,'health_history',$3,$4)", [req.userId, updated.version, `member:${req.userId}`, history]);
    return project(q, updated, { actor: `member:${req.userId}`, gyms: null, manage: true, clinical: true });
  }));
}));

for (const [portal, auth] of [["admin", requireAdmin], ["staff", requireStaff], ["partner", requirePartner], ["agency", requireAgency]] as const) {
  const root = `/${portal}/member-journey`;
  router.get(`${root}/options`, auth, wrap(async (req, res) => {
    const s = await scope(req, portal);
    const { rows: gyms } = await pool.query("SELECT id,name FROM gyms WHERE ($1::int[] IS NULL OR id=ANY($1))", [s.gyms]);
    const { rows: members } = await pool.query(`SELECT DISTINCT u.id,u.name,a.gym_id AS "gymId" FROM (${associations}) a JOIN users u ON u.id=a.user_id
      WHERE ($1::int[] IS NULL OR a.gym_id=ANY($1)) AND ($2::int IS NULL OR EXISTS(SELECT 1 FROM member_journeys j WHERE j.user_id=u.id AND $2 IN(j.trainer_id,j.general_trainer_id,j.dietician_id)))`, [s.gyms, s.trainerId ?? null]);
    const { rows: assignees } = await pool.query(`SELECT id,name,gym_id AS "gymId",journey_role AS "journeyRole" FROM staff WHERE is_active AND journey_role IS DISTINCT FROM 'corporate' AND ($1::int[] IS NULL OR gym_id=ANY($1)) AND gym_id=ANY(journey_gym_ids)`, [s.gyms]);
    res.json({ members, assignees, gyms, canManage: s.manage });
  }));
  router.get(root, auth, wrap(async (req, res) => {
    const s = await scope(req, portal);
    // Batch materialization is an additive projection, not mandatory onboarding.
    // Resolve uniqueness globally BEFORE applying branch scope to avoid making an
    // ambiguous cross-brand member look unambiguous to a narrow viewer.
    await transaction(async q => {
      const { rows: inserted } = await q.query(`WITH trusted AS (
          SELECT user_id,min(gym_id) AS gym_id FROM (${associations}) all_branches
          GROUP BY user_id HAVING count(DISTINCT gym_id)=1
        ), candidates AS (
          SELECT t.*, (SELECT staff_id FROM pt_programs p WHERE p.user_id=t.user_id AND p.gym_id=t.gym_id ORDER BY accepted_at DESC LIMIT 1) AS trainer_id
          FROM trusted t WHERE ($1::int[] IS NULL OR t.gym_id=ANY($1))
        )
        INSERT INTO member_journeys(user_id,gym_id,trainer_id)
        SELECT user_id,gym_id,trainer_id FROM candidates WHERE ($2::int IS NULL OR trainer_id=$2)
        ON CONFLICT DO NOTHING RETURNING user_id`, [s.gyms, s.trainerId ?? null]);
      for (const row of inserted) await q.query("INSERT INTO member_journey_events(user_id,version,action,actor,payload) VALUES($1,0,'enroll',$2,'{}')", [row.user_id, s.actor]);
    });
    const { rows } = await pool.query(`SELECT * FROM member_journeys WHERE ${journeyScopeWhere} ORDER BY created_at DESC`, [s.gyms, s.trainerId ?? null]);
    res.json({ journeys: await Promise.all(rows.map(row => project(pool, row, s))), canManage: s.manage });
  }));
  router.post(`${root}/enroll`, auth, wrap(async (req, res) => {
    const s = await scope(req, portal);
    const body = z.object({ userId: z.number().int().positive(), gymId: z.number().int().positive() }).strict().parse(req.body);
    guard(s, { gym_id: body.gymId }, true);
    const result = await transaction(async q => {
      const row = await materialize(q, body.userId, s.actor, body.gymId);
      if (!row) throw new JourneyError(409, "No trusted membership association for this branch");
      guard(s, row, true);
      return project(q, row, s);
    });
    res.json(result);
  }));
  router.get(`${root}/:userId`, auth, wrap(async (req, res) => {
    const s = await scope(req, portal);
    const userId = z.coerce.number().int().positive().parse(req.params.userId);
    const { rows: [row] } = await pool.query("SELECT * FROM member_journeys WHERE user_id=$1", [userId]);
    guard(s, row);
    res.json(await project(pool, row, s));
  }));
  router.post(`${root}/:userId/actions`, auth, wrap(async (req, res) => {
    const s = await scope(req, portal);
    const userId = z.coerce.number().int().positive().parse(req.params.userId);
    const body = journeyActionSchema.parse(req.body);
    res.json(await transaction(async q => {
      const { rows: [row] } = await q.query("SELECT * FROM member_journeys WHERE user_id=$1 FOR UPDATE", [userId]);
      guard(s, row, true);
      if (row.version !== body.version) throw new JourneyError(409, "Journey changed; refresh and retry");
      const dto = await project(q, row, s);
      if (!permittedAction(dto.currentStage, body.action)) throw new JourneyError(400, `Complete ${dto.currentStage} first`);
      if (["review_health", "dietician_review"].includes(body.action) && !s.clinical) throw new JourneyError(403, "Clinical review requires authorized branch staff");
      if (body.action === "pt_followup" && (!dto.dueAt || new Date(dto.dueAt).getTime() > Date.now())) throw new JourneyError(400, "PT feedback is not due yet");
      if ("staffId" in body) {
        const { rows: [assignee] } = await q.query("SELECT * FROM staff WHERE id=$1 AND is_active AND gym_id=$2 AND $2=ANY(journey_gym_ids) AND journey_role IS DISTINCT FROM 'corporate'", [body.staffId, row.gym_id]);
        if (!assignee || !assignee.permissions.includes("journey.manage") || (body.action === "assign_trainer" && (!assignee.yoactiv_staff_id || !assignee.permissions.includes("pt.manage")))) throw new JourneyError(400, "Select an active authorized branch staff member");
        if (["assign_trainer", "assign_general_trainer"].includes(body.action) && assignee.journey_role !== "trainer") throw new JourneyError(400, "Select a designated branch trainer");
        if (body.action === "dietician_review" && assignee.journey_role !== "dietician") throw new JourneyError(400, "Select a designated branch dietician");
      }
      const patch: Record<string, unknown> = {};
      if (body.action === "review_health") { patch.reviewed_at = new Date(); patch.review_note = body.note; }
      if (body.action === "assign_trainer") {
        patch.trainer_id = body.staffId;
        const { rows: [existing] } = await q.query("SELECT * FROM pt_programs WHERE user_id=$1 AND gym_id=$2 AND ref_type='enquiry' ORDER BY accepted_at DESC LIMIT 1 FOR UPDATE", [userId, row.gym_id]);
        if (existing) {
          if (existing.session1_done_at || existing.session2_done_at) throw new JourneyError(409, "Trial already started; refresh existing program");
          await q.query("UPDATE pt_programs SET staff_id=$2,staff_name=(SELECT name FROM staff WHERE id=$2) WHERE id=$1", [existing.id, body.staffId]);
          await q.query("INSERT INTO pt_trainer_assignments(ref_type,ref_id,trainer_id,trainer_name) SELECT 'enquiry',$1,yoactiv_staff_id,name FROM staff WHERE id=$2 ON CONFLICT(ref_type,ref_id) DO UPDATE SET trainer_id=EXCLUDED.trainer_id,trainer_name=EXCLUDED.trainer_name", [existing.ref_id, body.staffId]);
        } else {
          // Explicit branch-staff assignment creates a genuine enquiry reference,
          // not a paid booking and not a fabricated session completion.
          const { rows: [lead] } = await q.query(`INSERT INTO leads(name,phone,email,gym_id,gym_name,source,status)
            SELECT u.name,u.mobile,u.email,g.id,g.name,'iconic-app-live-trainer','new' FROM users u CROSS JOIN gyms g WHERE u.id=$1 AND g.id=$2 RETURNING id`, [userId, row.gym_id]);
          await q.query(`INSERT INTO pt_programs(ref_type,ref_id,staff_id,staff_name,member_name,member_phone,user_id,gym_id,gym_name)
            SELECT 'enquiry',$1,s.id,s.name,u.name,u.mobile,u.id,g.id,g.name FROM staff s CROSS JOIN users u CROSS JOIN gyms g WHERE s.id=$2 AND u.id=$3 AND g.id=$4`, [lead.id, body.staffId, userId, row.gym_id]);
          await q.query("INSERT INTO pt_trainer_assignments(ref_type,ref_id,trainer_id,trainer_name) SELECT 'enquiry',$1,yoactiv_staff_id,name FROM staff WHERE id=$2", [lead.id, body.staffId]);
        }
      }
      if (body.action === "record_trial") {
        if (dto.currentStage !== `trial${body.sessionNo}`) throw new JourneyError(400, "Complete the preceding trial and feedback first");
        const field = body.sessionNo === 1 ? "session1_done_at" : "session2_done_at";
        const { rowCount } = await q.query(`UPDATE pt_programs SET ${field}=now(),status=$3,started_at=COALESCE(started_at,now()),completed_at=CASE WHEN $3='completed' THEN now() ELSE completed_at END WHERE id=$1 AND user_id=$2 AND ${field} IS NULL`, [dto.trialProgramId, userId, body.sessionNo === 2 ? "completed" : "ongoing"]);
        if (!rowCount) throw new JourneyError(409, "Trial program missing or session already recorded");
      }
      if (body.action === "pt_decision") { patch.pt_decision = body.decision; patch.due_at = body.decision === "yes" ? nextThirtyDays() : null; }
      if (body.action === "assign_general_trainer") { patch.general_trainer_id = body.staffId; patch.general_started_at = new Date(); }
      if (body.action === "dietician_review") { patch.dietician_id = body.staffId; patch.dietician_note = body.note; }
      if (body.action === "issue_chart") {
        const no = Number(dto.currentStage.replace("workout_chart", ""));
        await q.query("INSERT INTO member_journey_charts(user_id,chart_no,label,content) VALUES($1,$2,$3,$4)", [userId, no, chartLabels[no], body.content]);
      }
      if (body.action === "attendance_review") {
        patch.attendance_decision = body.decision;
        patch.due_at = null;
        if (body.decision === "irregular") {
          if (!body.response || !body.nextDate || new Date(body.nextDate).getTime() <= Date.now()) throw new JourneyError(400, "Irregular attendance requires a response and future nextDate");
          patch.due_at = body.nextDate;
          await q.query("INSERT INTO member_journey_followups(user_id,kind,response,next_date) VALUES($1,'attendance_followup',$2,$3)", [userId, body.response, body.nextDate]);
        }
      }
      if (body.action === "pt_followup" || body.action === "attendance_followup") {
        const next = body.action === "pt_followup" ? nextThirtyDays() : body.nextDate;
        if (new Date(next).getTime() <= Date.now()) throw new JourneyError(400, "Next follow-up must be in the future");
        patch.due_at = next;
        if (body.action === "attendance_followup") patch.attendance_decision = "irregular";
        await q.query("INSERT INTO member_journey_followups(user_id,kind,response,next_date) VALUES($1,$2,$3,$4)", [userId, body.action, body.response, next]);
      }
      const entries = Object.entries(patch);
      const { rows: [updated] } = await q.query(`UPDATE member_journeys SET version=version+1${entries.map(([key], i) => `,${key}=$${i + 2}`).join("")} WHERE user_id=$1 RETURNING *`, [userId, ...entries.map(([, value]) => value)]);
      await q.query("INSERT INTO member_journey_events(user_id,version,action,actor,payload) VALUES($1,$2,$3,$4,$5)", [userId, updated.version, body.action, s.actor, body]);
      return project(q, updated, s);
    }));
  }));
}
export default router;