import {
  createSignup,
  verifySignup,
  type SignupVendorResult,
} from "./authPopupSignup";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(
    actual === expected,
    `${message}: expected ${String(expected)}, got ${String(actual)}`,
  );
}

/**
 * These are executable regression cases for AuthPopup's signup orchestration.
 * They use Clerk-shaped return values and callbacks, but never create a Clerk
 * user or send an email.
 */
export async function runAuthPopupSignupRegressionTests() {
  const createEvents: string[] = [];
  let clerkPayload: { emailAddress: string; password: string } | undefined;
  const createResult = await createSignup(
    {
      username: "member.one",
      emailAddress: "member@example.com",
      password: "password-123",
    },
    {
      checkUsernameAvailability: async (username) => {
        createEvents.push(`availability:${username}`);
        return { available: true };
      },
      createPasswordSignup: async (payload) => {
        createEvents.push("clerk-create");
        clerkPayload = payload;
        return {};
      },
      sendEmailCode: async () => {
        createEvents.push("send-email-code");
        return {};
      },
      onError: () => {
        throw new Error("successful signup must not report an error");
      },
      onVerificationReady: () => {
        createEvents.push("verify-ui");
      },
    },
  );
  assertEqual(
    createResult.kind,
    "verificationReady",
    "successful vendor response must enter verification",
  );
  assertEqual(
    createEvents.join("|"),
    "availability:member.one|clerk-create|send-email-code|verify-ui",
    "username availability must precede Clerk signup and verification UI",
  );
  assert(clerkPayload, "Clerk signup payload should be captured");
  assertEqual(
    clerkPayload.emailAddress,
    "member@example.com",
    "Clerk signup must receive the email",
  );
  assertEqual(
    clerkPayload.password,
    "password-123",
    "Clerk signup must receive the password",
  );
  assert(
    !("username" in clerkPayload),
    "Clerk signup payload must not contain the app-owned username",
  );

  const unavailableEvents: string[] = [];
  const unavailableResult = await createSignup(
    {
      username: "taken.member",
      emailAddress: "taken@example.com",
      password: "password-123",
    },
    {
      checkUsernameAvailability: async () => {
        unavailableEvents.push("availability");
        return { available: false };
      },
      createPasswordSignup: async () => {
        unavailableEvents.push("clerk-create");
        return {};
      },
      sendEmailCode: async () => {
        unavailableEvents.push("send-email-code");
        return {};
      },
      onError: (error) =>
        assertEqual(
          error,
          "That username is already taken.",
          "unavailable username must surface the app API error",
        ),
      onVerificationReady: () => {
        unavailableEvents.push("verify-ui");
      },
    },
  );
  assertEqual(
    unavailableResult.kind,
    "usernameUnavailable",
    "taken username must stop signup before Clerk",
  );
  assertEqual(
    unavailableEvents.join("|"),
    "availability",
    "taken username must not call Clerk or send a code",
  );

  const sendError = new Error("email provider rejected request");
  let sendErrorSurface: unknown;
  let sendErrorProgressed = false;
  const sendErrorResult = await createSignup(
    {
      username: "mail.member",
      emailAddress: "mail@example.com",
      password: "password-123",
    },
    {
      checkUsernameAvailability: async () => ({ available: true }),
      createPasswordSignup: async () => ({}),
      sendEmailCode: async () => ({ error: sendError }),
      onError: (error) => {
        sendErrorSurface = error;
      },
      onVerificationReady: () => {
        sendErrorProgressed = true;
      },
    },
  );
  assertEqual(
    sendErrorResult.kind,
    "vendorError",
    "send-email-code errors must stop signup",
  );
  assertEqual(
    sendErrorSurface,
    sendError,
    "send-email-code errors must surface",
  );
  assert(
    !sendErrorProgressed,
    "send-email-code errors must not enter verification",
  );

  const verificationError = new Error("invalid verification code");
  let verificationErrorSurface: unknown;
  let pendingWrites = 0;
  let finalizeCalls = 0;
  let completionCalls = 0;
  const verificationErrorResult = await verifySignup(
    { code: "000000", username: "verify.member", name: "Verify Member" },
    {
      verifyEmailCode: async () => ({ error: verificationError }),
      getStatus: () => "complete",
      getCreatedUserId: () => "user_verify_error",
      setPendingUsername: async () => {
        pendingWrites += 1;
      },
      updateName: async () => {},
      exitGuest: () => {},
      finalize: async () => {
        finalizeCalls += 1;
        return {};
      },
      onError: (error) => {
        verificationErrorSurface = error;
      },
      onComplete: () => {
        completionCalls += 1;
      },
    },
  );
  assertEqual(
    verificationErrorResult.kind,
    "verificationError",
    "verify-email-code errors must stop progression",
  );
  assertEqual(
    verificationErrorSurface,
    verificationError,
    "verify-email-code errors must surface",
  );
  assertEqual(
    pendingWrites,
    0,
    "failed verification must not write pending username",
  );
  assertEqual(finalizeCalls, 0, "failed verification must not activate");
  assertEqual(completionCalls, 0, "failed verification must not route");

  const activationError = new Error("activation failed");
  let activationErrorSurface: unknown;
  let activationCompletionCalls = 0;
  const activationResult = await verifySignup(
    { code: "123456", username: "activate.member", name: "" },
    {
      verifyEmailCode: async () => ({}),
      getStatus: () => "complete",
      getCreatedUserId: () => "user_activation_error",
      setPendingUsername: async () => {},
      updateName: async () => {},
      exitGuest: () => {},
      finalize: async () => ({ error: activationError }),
      onError: (error) => {
        activationErrorSurface = error;
      },
      onComplete: () => {
        activationCompletionCalls += 1;
      },
    },
  );
  assertEqual(
    activationResult.kind,
    "activationError",
    "activation errors must stop progression",
  );
  assertEqual(
    activationErrorSurface,
    activationError,
    "activation errors must surface",
  );
  assertEqual(activationCompletionCalls, 0, "activation errors must not route");

  const sequence: string[] = [];
  let releaseActivation!: (result: SignupVendorResult) => void;
  const activationPending = new Promise<SignupVendorResult>((resolve) => {
    releaseActivation = resolve;
  });
  let signupStatus = "missing_requirements";
  let createdUserId: string | null = null;
  let pendingUsername: { username: string; clerkUserId: string } | undefined;
  const completionPending = verifySignup(
    { code: "123456", username: "  Ready.Member ", name: "Ready Member" },
    {
      verifyEmailCode: async () => {
        sequence.push("verify-email-code");
        signupStatus = "complete";
        createdUserId = "user_ready";
        return {};
      },
      getStatus: () => signupStatus,
      getCreatedUserId: () => createdUserId,
      setPendingUsername: async (username, clerkUserId) => {
        pendingUsername = { username, clerkUserId };
        sequence.push("pending-username");
      },
      updateName: async () => {
        sequence.push("update-name");
      },
      exitGuest: () => {
        sequence.push("exit-guest");
      },
      finalize: async () => {
        sequence.push("await-activation");
        return activationPending;
      },
      onError: (error) => {
        throw new Error(
          `successful activation must not report: ${String(error)}`,
        );
      },
      onComplete: () => {
        sequence.push("route");
      },
    },
  );

  for (let i = 0; i < 10 && sequence.length < 5; i += 1) {
    await Promise.resolve();
  }
  assertEqual(
    sequence.join("|"),
    "verify-email-code|pending-username|update-name|exit-guest|await-activation",
    "routing must wait for awaited activation",
  );
  assert(pendingUsername, "successful signup must persist a pending username");
  assertEqual(
    pendingUsername.username,
    "ready.member",
    "pending username must be normalized",
  );
  assertEqual(
    pendingUsername.clerkUserId,
    "user_ready",
    "pending username must be bound to the created Clerk user",
  );
  releaseActivation({});
  const completionResult = await completionPending;
  assertEqual(
    completionResult.kind,
    "complete",
    "successful activation must complete signup",
  );
  assertEqual(
    sequence.at(-1),
    "route",
    "route must happen only after activation resolves",
  );
}

runAuthPopupSignupRegressionTests().catch((error: unknown) => {
  throw error instanceof Error ? error : new Error(String(error));
});
