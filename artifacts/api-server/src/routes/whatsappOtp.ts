import { Router, type IRouter, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import { RequestWhatsappOtpBody, VerifyWhatsappOtpBody, CompleteWhatsappOtpBody } from "@workspace/api-zod";
import { OtpError, sendWhatsappOtp, WhatsappOtpService } from "../lib/whatsappOtp";
import { grantSignupBonus } from "../lib/signupBonus";

const router: IRouter = Router();
function service() {
  // Domain-separated HMAC derives from an existing high-entropy server secret;
  // no plaintext OTP or separate unmanaged persistent key is needed. Rotating
  // this secret intentionally invalidates outstanding challenges/continuations.
  const secret = process.env.WHATSAPP_OTP_HASH_SECRET ?? process.env.W4U_API_SECRET;
  if (!secret || secret.length < 16) throw new OtpError(503, "WhatsApp sign-in is temporarily unavailable.");
  return new WhatsappOtpService({
    pool, secret, send: sendWhatsappOtp,
    identity: async (id) => {
      const user = await clerkClient.users.getUser(id);
      const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId && e.verification?.status === "verified");
      return {
        id: user.id, createdAt: user.createdAt,
        email: primary?.emailAddress.toLowerCase() ?? null,
        emails: user.emailAddresses.map((e) => e.emailAddress.toLowerCase()),
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Member",
        avatarUrl: user.imageUrl ?? "",
        disabled: user.banned || user.locked,
      };
    },
    ticket: async (id) => (await clerkClient.signInTokens.createSignInToken({ userId: id, expiresInSeconds: 300 })).token,
  });
}
function fail(res: Response, error: unknown) {
  // Do not log Clerk errors, request bodies, credentials, codes or tickets.
  if (error instanceof OtpError) {
    if (error.status === 429) res.setHeader("Retry-After", "60");
    res.status(error.status).json({ error: error.message });
  } else {
    res.status(503).json({ error: "Sign-in is temporarily unavailable. Please request a new code and try again." });
  }
}
router.use("/auth/whatsapp", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
router.post("/auth/whatsapp/request", async (req, res): Promise<void> => {
  const body = RequestWhatsappOtpBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Enter a valid Indian mobile number." }); return; }
  try { res.json(await service().request(body.data.mobile, req.ip ?? req.socket.remoteAddress ?? "unknown")); }
  catch (error) { fail(res, error); }
});
router.post("/auth/whatsapp/verify", async (req, res): Promise<void> => {
  const body = VerifyWhatsappOtpBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Enter the six-digit code." }); return; }
  try { res.json(await service().verify(body.data.challengeId, body.data.code)); }
  catch (error) { fail(res, error); }
});
router.post("/auth/whatsapp/complete", async (req, res): Promise<void> => {
  const body = CompleteWhatsappOtpBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid signup continuation." }); return; }
  const clerkId = getAuth(req).userId;
  if (!clerkId) { res.status(401).json({ error: "Verify your email before completing sign-up." }); return; }
  try {
    const result = await service().complete(body.data.continuationToken, clerkId);
    if (result.isNewUser) void grantSignupBonus(result.userId);
    res.json({ isNewUser: result.isNewUser });
  } catch (error) { fail(res, error); }
});
export default router;