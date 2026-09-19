import { logger } from "./logger";

const CLERK_API_BASE = "https://api.clerk.com/v1";
const REQUIRED_NATIVE_REDIRECTS = ["iconic-app://", "iconic-app:///"];

type RedirectUrl = {
  id?: string;
  url?: string;
};

/**
 * Keep the production Clerk instance compatible with the already-shipped
 * native app. This is server-managed so correcting the allow-list does not
 * require another App Store binary.
 */
export async function ensureClerkNativeRedirectUrls(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    logger.warn("Clerk native redirect setup skipped: missing secret key");
    return;
  }

  const headers = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };

  try {
    const listResponse = await fetch(`${CLERK_API_BASE}/redirect_urls`, {
      headers,
    });
    if (!listResponse.ok) {
      logger.warn(
        { status: listResponse.status },
        "Clerk native redirect list failed",
      );
      return;
    }

    const body = (await listResponse.json()) as
      | RedirectUrl[]
      | { data?: RedirectUrl[] };
    const current = Array.isArray(body) ? body : (body.data ?? []);
    const existing = new Set(current.map((entry) => entry.url));

    for (const url of REQUIRED_NATIVE_REDIRECTS) {
      if (existing.has(url)) continue;
      const createResponse = await fetch(`${CLERK_API_BASE}/redirect_urls`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url }),
      });
      if (!createResponse.ok && createResponse.status !== 409) {
        logger.warn(
          { status: createResponse.status, url },
          "Clerk native redirect create failed",
        );
        continue;
      }
      logger.info({ url }, "Clerk native redirect enabled");
    }
  } catch (err) {
    logger.warn({ err }, "Clerk native redirect setup failed");
  }
}