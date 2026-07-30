import { randomUUID } from "node:crypto";
import { db, notificationsTable, complaintsTable } from "@workspace/db";

type ComplaintRow = typeof complaintsTable.$inferSelect;

// Tell the member when the gym actually replied or resolved their complaint.
// Compares the row before and after the PATCH so re-saving the same text or
// status doesn't ping the member again. Fire-and-forget: a notification
// hiccup must never fail the staff's save.
export async function notifyMemberOfComplaintUpdate(
  before: ComplaintRow,
  after: ComplaintRow,
): Promise<void> {
  try {
    if (!after.userId) return;
    const replyChanged =
      (after.response ?? "").trim() !== "" &&
      (after.response ?? "").trim() !== (before.response ?? "").trim();
    const nowResolved =
      after.status === "resolved" && before.status !== "resolved";
    if (!replyChanged && !nowResolved) return;

    const gym = after.gymName ? ` from ${after.gymName}` : "";
    let title: string;
    let body: string;
    if (nowResolved && replyChanged) {
      title = "Your complaint was resolved";
      body = `Reply${gym} on "${after.subject}": ${after.response!.trim()}`;
    } else if (nowResolved) {
      title = "Your complaint was resolved";
      body = `"${after.subject}" has been marked resolved${gym}.`;
    } else {
      title = "The gym replied to your complaint";
      body = `Reply${gym} on "${after.subject}": ${after.response!.trim()}`;
    }
    if (body.length > 500) body = `${body.slice(0, 497)}...`;

    await db.insert(notificationsTable).values({
      recipientType: "user",
      recipientId: after.userId,
      title,
      body,
      link: "/complaints",
      batchId: randomUUID(),
      createdByAdminId: null,
    });
  } catch (err) {
    console.error("complaint member notification failed", err);
  }
}
