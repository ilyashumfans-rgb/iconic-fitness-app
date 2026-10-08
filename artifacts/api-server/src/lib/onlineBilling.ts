import { pool } from "@workspace/db";
import { expireHolds } from "./networkCoach";

export type BillingScope = { kind: "admin" } | { kind: "partner"; id: number } | { kind: "member"; id: number };

/** Receipts are derived from immutable settled order IDs and captured amounts.
 * No receipt is issued for a hold or a zero-charge plan-covered session.
 * Ownership is filtered in SQL, never by a caller-supplied branch selector.
 */
export async function onlineBilling(scope: BillingScope) {
  await expireHolds();
  const where = scope.kind === "admin" ? "TRUE" :
    scope.kind === "member" ? "r.user_id=$1" : "g.owner_partner_id=$1";
  const { rows } = await pool.query(`
    WITH records AS (
      SELECT id,'session'::text AS kind,'Online coaching session'::text AS description,
        user_id,gym_id,staff_id,status,amount_inr,tax,paid_at,airpay_order_ref,airpay_txn_id,
        refund_status,starts_at,ends_at,created_at,plan_entitlement_id IS NOT NULL AS plan_covered
      FROM network_coach_bookings
      UNION ALL
      SELECT id,'plan',plan_name,user_id,gym_id,staff_id,
        CASE WHEN status='held' AND hold_expires_at < now() THEN 'expired' ELSE status END,
        amount_inr,tax,paid_at,airpay_order_ref,airpay_txn_id,refund_status,starts_at,ends_at,created_at,false
      FROM network_coach_plan_purchases
    )
    SELECT r.*,coalesce(u.name,'Member') AS member_name,coalesce(s.name,'Coach') AS trainer_name,
      coalesce(g.name,'Branch') AS branch_name
    FROM records r LEFT JOIN gyms g ON g.id=r.gym_id
      LEFT JOIN users u ON u.id=r.user_id LEFT JOIN staff s ON s.id=r.staff_id
    WHERE ${where} ORDER BY r.created_at DESC,r.kind,r.id DESC
  `, scope.kind === "admin" ? [] : [scope.id]);
  return rows.map(r => {
    const paid = !!r.paid_at && !r.plan_covered && r.amount_inr > 0;
    const iso = (value: unknown) => value ? new Date(value as string).toISOString() : null;
    return {
      id: Number(r.id), kind: r.kind as "session" | "plan", description: r.description as string,
      memberName: r.member_name as string, trainerName: r.trainer_name as string, branchName: r.branch_name as string,
      status: r.status as string, amountInr: Number(r.amount_inr), paid, planCovered: !!r.plan_covered,
      subtotalInr: Number(r.tax?.subtotalInr ?? r.amount_inr),
      cgstInr: Number(r.tax?.cgstInr ?? 0), sgstInr: Number(r.tax?.sgstInr ?? 0),
      cgstPercent: Number(r.tax?.cgstPercent ?? 0), sgstPercent: Number(r.tax?.sgstPercent ?? 0),
      createdAt: iso(r.created_at)!, paidAt: iso(r.paid_at),
      invoiceNumber: paid ? `IC-ONLINE-${r.kind === "plan" ? "P" : "S"}-${r.id}` : null,
      paymentReference: paid ? (r.airpay_txn_id || r.airpay_order_ref || null) as string | null : null,
      refundStatus: (r.refund_status || null) as string | null,
      startsAt: iso(r.starts_at), endsAt: iso(r.ends_at),
    };
  });
}
