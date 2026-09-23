import { pool } from "@workspace/db";

export const PASSWORD_REQUIRED_ERROR =
  "WhatsApp-linked accounts must use password for admin/staff access.";

export type PrivilegedSsoGateDecision =
  | { allowed: true }
  | {
      allowed: false;
      status: 403 | 503;
      error: string;
      code: "PASSWORD_REQUIRED" | "PASSWORD_GATE_UNAVAILABLE";
      cause?: unknown;
    };

type ExistsQuery = (
  text: string,
  values: unknown[],
) => Promise<{ rows: Array<{ linked: boolean }> }>;

const queryWhatsappLink: ExistsQuery = async (text, values) =>
  pool.query<{ linked: boolean }>(text, values);

/**
 * Fail-closed gate for privileged Clerk login bridges.
 *
 * Keeping the lookup here ensures admin and staff SSO apply the same rule.
 * The query dependency is injectable so all outcomes can be tested without
 * touching customer data.
 */
export async function checkPrivilegedSsoPasswordGate(
  clerkUserId: string,
  query: ExistsQuery = queryWhatsappLink,
): Promise<PrivilegedSsoGateDecision> {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT 1
        FROM whatsapp_phone_links
        WHERE clerk_user_id = $1
      ) AS linked`,
      [clerkUserId],
    );

    const linked = result.rows[0]?.linked;
    if (linked === true) {
      return {
        allowed: false,
        status: 403,
        error: PASSWORD_REQUIRED_ERROR,
        code: "PASSWORD_REQUIRED",
      };
    }

    if (linked === false) return { allowed: true };

    throw new Error("WhatsApp password gate returned no decision");
  } catch (cause) {
    return {
      allowed: false,
      status: 503,
      error: "Could not verify whether password sign-in is required",
      code: "PASSWORD_GATE_UNAVAILABLE",
      cause,
    };
  }
}