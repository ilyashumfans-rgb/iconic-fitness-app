import { Router, type IRouter } from "express";
import { RegisterPushTokenBody, RemovePushTokenBody } from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { isExpoPushToken, registerPushToken, removePushToken } from "../lib/pushNotifications";

const router: IRouter = Router();

// Device push registration. Tokens are never echoed or logged.
router.post("/me/push-tokens", requireUser, async (req, res): Promise<void> => {
  const parsed = RegisterPushTokenBody.safeParse(req.body);
  if (!parsed.success || !isExpoPushToken(parsed.data.token)) {
    res.status(400).json({ error: "Invalid push token" });
    return;
  }
  await registerPushToken(req.userId!, parsed.data.token, parsed.data.platform ?? "");
  res.json({ ok: true });
});

router.post("/me/push-tokens/remove", requireUser, async (req, res): Promise<void> => {
  const parsed = RemovePushTokenBody.safeParse(req.body);
  if (!parsed.success || !isExpoPushToken(parsed.data.token)) {
    res.status(400).json({ error: "Invalid push token" });
    return;
  }
  await removePushToken(parsed.data.token);
  res.json({ ok: true });
});

export default router;
