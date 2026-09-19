import {
  primarySsoVerificationField,
  ssoCompletionTransition,
} from "./ssoCompletion";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Pure regression cases kept beside the transition helper. They can run in a
// lightweight TypeScript test harness without React Native, Clerk, or a Google
// account, and document the branches the welcome screen uses at runtime.
export function runSsoCompletionTransitionRegressionTests() {
  const existing = ssoCompletionTransition({ createdSessionId: "sess_existing" });
  assert(existing.kind === "activate", "existing SSO session must activate");

  const newGoogle = ssoCompletionTransition({
    signUpStatus: "missing_requirements",
    missingFields: ["username", "phone_number"],
  });
  assert(
    newGoogle.kind === "collectRequirements" &&
      newGoogle.missingFields.includes("username"),
    "new Google signup must collect Clerk-required fields",
  );

  assert(
    ssoCompletionTransition({
      signUpStatus: "missing_requirements",
      missingFields: [],
      unverifiedFields: [],
    }).kind === "completeEmptySignUp",
    "a transferred signup with no required fields must use Clerk completion",
  );

  const pendingVerification = ssoCompletionTransition({
    signUpStatus: "missing_requirements",
    unverifiedFields: ["phone_number"],
  });
  assert(
    pendingVerification.kind === "collectRequirements" &&
      primarySsoVerificationField(pendingVerification.unverifiedFields) ===
        "phone_number",
    "a pending mobile verification must not be treated as a session",
  );

  assert(
    ssoCompletionTransition({ authSessionType: "cancel" }).kind === "cancelled",
    "browser cancellation must remain distinct from an error",
  );
  assert(
    ssoCompletionTransition({}).kind === "missingSession",
    "a successful-looking callback without a session must be explicit",
  );
}

// This file has no React Native or Clerk dependency. Executing it with the
// workspace TypeScript runner fails the process on any regression above.
runSsoCompletionTransitionRegressionTests();