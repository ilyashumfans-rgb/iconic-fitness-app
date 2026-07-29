/**
 * Admin routes for WhatsApp/SMS messaging settings and delivery log.
 *
 * GET  /admin/messaging-config          → current config (auth token redacted)
 * PUT  /admin/messaging-config          → save config
 * GET  /admin/lead-messages?leadId=N   → delivery log for a lead
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdmin } from "../lib/adminAuth";
import {
  getMessagingConfig,
  saveMessagingConfig,
  getLeadMessages,
  ensureMessagingTables,
  sendLeadWelcome,
} from "../lib/messaging";
import { db, leadMessagesTable, leadsTable, gymsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

// Ensure tables exist when the server first handles a messaging request.
void ensureMessagingTables();

// Return the config with the auth token masked so the UI can show whether it
// has been set without revealing the secret.
router.get(
  "/admin/messaging-config",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const cfg = await getMessagingConfig();
    res.json({
      ...cfg,
      // Redact auth token: show "***" if set, empty string if not
      twilioAuthToken: cfg.twilioAuthToken ? "***" : "",
    });
  },
);

router.put(
  "/admin/messaging-config",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Parameters<typeof saveMessagingConfig>[0] = {};

    if (typeof b.twilioAccountSid === "string")
      patch.twilioAccountSid = b.twilioAccountSid.trim();
    // Only overwrite the auth token when the frontend sends a real value
    // (not the masked "***" sentinel we return on GET).
    if (
      typeof b.twilioAuthToken === "string" &&
      b.twilioAuthToken !== "***"
    )
      patch.twilioAuthToken = b.twilioAuthToken.trim();
    if (typeof b.smsFrom === "string") patch.smsFrom = b.smsFrom.trim();
    if (typeof b.whatsappFrom === "string")
      patch.whatsappFrom = b.whatsappFrom.trim();
    if (typeof b.smsEnabled === "boolean") patch.smsEnabled = b.smsEnabled;
    if (typeof b.whatsappEnabled === "boolean")
      patch.whatsappEnabled = b.whatsappEnabled;
    if (typeof b.leadWelcomeTemplate === "string" && b.leadWelcomeTemplate.trim())
      patch.leadWelcomeTemplate = b.leadWelcomeTemplate.trim();
    if (
      typeof b.memberWelcomeTemplate === "string" &&
      b.memberWelcomeTemplate.trim()
    )
      patch.memberWelcomeTemplate = b.memberWelcomeTemplate.trim();

    const saved = await saveMessagingConfig(patch);
    res.json({
      ...saved,
      twilioAuthToken: saved.twilioAuthToken ? "***" : "",
    });
  },
);

// Delivery log: optionally filtered by leadId, otherwise returns latest 100.
router.get(
  "/admin/lead-messages",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const leadId =
      typeof req.query.leadId === "string" && req.query.leadId
        ? Number(req.query.leadId)
        : null;

    if (leadId !== null && !Number.isNaN(leadId)) {
      const msgs = await getLeadMessages(leadId);
      res.json(msgs);
      return;
    }

    // Recent log (admin overview)
    const rows = await db
      .select()
      .from(leadMessagesTable)
      .orderBy(desc(leadMessagesTable.createdAt))
      .limit(100);
    res.json(rows);
  },
);

// Manual (re)send of the lead welcome template from the CRM drawer.
// Returns the outcome plus the refreshed message log for the lead.
router.post(
  "/admin/lead-messages/:leadId/send",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const leadId = Number(req.params.leadId);
    if (!Number.isInteger(leadId) || leadId <= 0) {
      res.status(400).json({ error: "Invalid lead id" });
      return;
    }

    const [lead] = await db
      .select({
        id: leadsTable.id,
        name: leadsTable.name,
        phone: leadsTable.phone,
        gymId: leadsTable.gymId,
      })
      .from(leadsTable)
      .where(eq(leadsTable.id, leadId))
      .limit(1);
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    if (!lead.phone || !lead.phone.trim()) {
      res.status(400).json({ error: "This lead has no phone number" });
      return;
    }

    let gymName: string | undefined;
    if (lead.gymId) {
      const [gym] = await db
        .select({ name: gymsTable.name })
        .from(gymsTable)
        .where(eq(gymsTable.id, lead.gymId))
        .limit(1);
      gymName = gym?.name ?? undefined;
    }

    const outcome = await sendLeadWelcome({
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      gymName,
    });

    // Every staff-triggered attempt must leave an audit-trail row — even when
    // the send was blocked by missing/disabled config and Twilio was never hit.
    if (!outcome.attempted) {
      await db.insert(leadMessagesTable).values({
        leadId: lead.id,
        toNumber: lead.phone.trim(),
        body: "(manual send — welcome template)",
        channel: "sms",
        status: "failed",
        errorMessage: outcome.reason,
      });
      const messages = await getLeadMessages(leadId);
      res.status(409).json({ error: outcome.reason, messages });
      return;
    }

    const messages = await getLeadMessages(leadId);
    res.json({
      ok: outcome.ok,
      error: outcome.ok ? null : (outcome.error ?? null),
      messages,
    });
  },
);

export default router;
