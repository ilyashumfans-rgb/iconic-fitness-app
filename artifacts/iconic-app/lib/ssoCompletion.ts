export type SsoCompletionSnapshot = {
  createdSessionId?: string | null;
  authSessionType?: string | null;
  signUpStatus?: string | null;
  missingFields?: readonly string[] | null;
  unverifiedFields?: readonly string[] | null;
};

export type SsoCompletionTransition =
  | { kind: "activate"; sessionId: string }
  | { kind: "completeEmptySignUp" }
  | {
      kind: "collectRequirements";
      missingFields: string[];
      unverifiedFields: string[];
    }
  | { kind: "cancelled" }
  | { kind: "missingSession" };

const CANCELLED_AUTH_SESSION_TYPES = new Set(["cancel", "dismiss"]);

/**
 * Clerk's Expo SSO hook deliberately returns an incomplete SignUpResource for
 * a first-time social identity when the instance requires additional fields.
 * Keep the decision tree independent from React/Clerk so every caller handles
 * a returned session, incomplete signup, cancellation, and malformed callback
 * consistently.
 */
export function ssoCompletionTransition(
  snapshot: SsoCompletionSnapshot,
): SsoCompletionTransition {
  if (snapshot.createdSessionId) {
    return { kind: "activate", sessionId: snapshot.createdSessionId };
  }

  if (
    snapshot.authSessionType &&
    CANCELLED_AUTH_SESSION_TYPES.has(snapshot.authSessionType)
  ) {
    return { kind: "cancelled" };
  }

  const missingFields = [...(snapshot.missingFields ?? [])];
  const unverifiedFields = [...(snapshot.unverifiedFields ?? [])];
  if (snapshot.signUpStatus === "missing_requirements") {
    if (missingFields.length || unverifiedFields.length) {
      return { kind: "collectRequirements", missingFields, unverifiedFields };
    }
    // A transferred social identity can be ready to complete despite Clerk
    // initially reporting missing_requirements. Calling update({}) is Clerk's
    // documented custom-flow completion step; it does not invent user data.
    return { kind: "completeEmptySignUp" };
  }

  return { kind: "missingSession" };
}

export function primarySsoVerificationField(
  unverifiedFields: readonly string[] | null | undefined,
): "email_address" | "phone_number" | undefined {
  if (unverifiedFields?.includes("email_address")) return "email_address";
  if (unverifiedFields?.includes("phone_number")) return "phone_number";
  return undefined;
}

export const supportedSsoRequirementFields = new Set([
  "first_name",
  "last_name",
  "username",
  "email_address",
  "phone_number",
  "password",
  "legal_accepted",
]);