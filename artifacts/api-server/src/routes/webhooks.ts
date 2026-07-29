/**
 * Public webhook endpoints (no auth — validated by provider signatures).
 *
 * POST /webhooks/twilio-status — Twilio message status callback.
 * Twilio POSTs (form-encoded) MessageSid + MessageStatus (queued, sent,
 * delivered, read, failed, undelivered…) as a message progresses. We validate
 * the X-Twilio-Signature header against the stored auth token and update the
 * matching lead_messages row so the CRM shows real delivery outcomes.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  getMessagingConfig,
  updateMessageStatus,
  validateTwilioSignature,
} from "../lib/messaging";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Rebuild the exact public URL Twilio signed (behind Replit's HTTPS proxy). */
function requestUrl(req: Request): string {
  return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
}

router.post(
  "/webhooks/twilio-status",
  async (req: Request, res: Response): Promise<void> => {
    const cfg = await getMessagingConfig();
    if (!cfg.twilioAuthToken) {
      // Messaging isn't configured; nothing to validate against.
      res.status(503).json({ error: "Messaging not configured" });
      return;
    }

    const signature = req.get("X-Twilio-Signature") ?? "";
    const body = (req.body ?? {}) as Record<string, unknown>;
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === "string") params[k] = v;
    }

    const valid =
      signature !== "" &&
      validateTwilioSignature({
        authToken: cfg.twilioAuthToken,
        signature,
        url: requestUrl(req),
        params,
      });

    if (!valid) {
      logger.warn(
        { sid: params.MessageSid ?? null },
        "Rejected Twilio status callback: bad signature",
      );
      res.status(403).json({ error: "Invalid signature" });
      return;
    }

    const sid = params.MessageSid ?? params.SmsSid ?? "";
    const status = params.MessageStatus ?? params.SmsStatus ?? "";
    if (!sid || !status) {
      res.status(400).json({ error: "Missing MessageSid/MessageStatus" });
      return;
    }

    const updated = await updateMessageStatus({
      twilioSid: sid,
      status,
      errorCode: params.ErrorCode ?? null,
    });
    logger.info({ sid, status, updated }, "Twilio status callback");

    // Always 200 so Twilio doesn't retry for messages we don't track.
    res.status(200).send("ok");
  },
);

export default router;
