/**
 * The signup sequence used by AuthPopup.
 *
 * Clerk exposes errors as return values for these methods rather than always
 * throwing. Keeping the orchestration here makes it possible to exercise the
 * same production sequence without mounting React Native or creating a Clerk
 * user in a regression test.
 */

export type SignupVendorResult = { error?: unknown } | void;

export type CreateSignupInput = {
  username: string;
  emailAddress: string;
  password: string;
};

export type CreateSignupDependencies = {
  checkUsernameAvailability: (
    username: string,
  ) => Promise<{ available: boolean }>;
  createPasswordSignup: (input: {
    emailAddress: string;
    password: string;
  }) => Promise<SignupVendorResult>;
  sendEmailCode: () => Promise<SignupVendorResult>;
  onError: (error: unknown) => void;
  onVerificationReady: () => void;
};

export type CreateSignupResult =
  | { kind: "usernameUnavailable" }
  | { kind: "vendorError"; phase: "create" | "sendEmailCode" }
  | { kind: "verificationReady" };

function returnedError(result: SignupVendorResult): unknown | null {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    result.error
  ) {
    return result.error;
  }
  return null;
}

/**
 * Check the app-owned username before creating the Clerk signup. Usernames
 * intentionally never cross this boundary into Clerk.
 */
export async function createSignup(
  input: CreateSignupInput,
  dependencies: CreateSignupDependencies,
): Promise<CreateSignupResult> {
  const availability = await dependencies.checkUsernameAvailability(
    input.username,
  );
  if (!availability.available) {
    dependencies.onError("That username is already taken.");
    return { kind: "usernameUnavailable" };
  }

  const createResult = await dependencies.createPasswordSignup({
    emailAddress: input.emailAddress,
    password: input.password,
  });
  const createError = returnedError(createResult);
  if (createError) {
    dependencies.onError(createError);
    return { kind: "vendorError", phase: "create" };
  }

  const sendResult = await dependencies.sendEmailCode();
  const sendError = returnedError(sendResult);
  if (sendError) {
    dependencies.onError(sendError);
    return { kind: "vendorError", phase: "sendEmailCode" };
  }

  dependencies.onVerificationReady();
  return { kind: "verificationReady" };
}

export type VerifySignupInput = {
  code: string;
  username: string;
  name: string;
};

export type VerifySignupDependencies = {
  verifyEmailCode: (input: { code: string }) => Promise<SignupVendorResult>;
  getStatus: () => string | null;
  getCreatedUserId: () => string | null | undefined;
  setPendingUsername: (username: string, clerkUserId: string) => Promise<void>;
  updateName: (input: { firstName: string }) => Promise<void>;
  exitGuest: () => void;
  finalize: () => Promise<SignupVendorResult>;
  onError: (error: unknown) => void;
  onComplete: () => void;
};

export type VerifySignupResult =
  | { kind: "verificationError" }
  | { kind: "incomplete" }
  | { kind: "activationError" }
  | { kind: "complete" };

/**
 * Verify and activate a signup. The completion callback is deliberately after
 * the awaited activation result, so routing cannot race Clerk session setup.
 */
export async function verifySignup(
  input: VerifySignupInput,
  dependencies: VerifySignupDependencies,
): Promise<VerifySignupResult> {
  const verificationResult = await dependencies.verifyEmailCode({
    code: input.code,
  });
  const verificationError = returnedError(verificationResult);
  if (verificationError) {
    dependencies.onError(verificationError);
    return { kind: "verificationError" };
  }

  if (dependencies.getStatus() !== "complete") {
    dependencies.onError("Invalid code. Please try again.");
    return { kind: "incomplete" };
  }

  const normalizedUsername = input.username.trim().toLowerCase();
  const createdUserId = dependencies.getCreatedUserId();
  if (createdUserId && normalizedUsername) {
    await dependencies.setPendingUsername(normalizedUsername, createdUserId);
  }
  if (input.name.trim()) {
    try {
      await dependencies.updateName({ firstName: input.name.trim() });
    } catch {
      // Name is optional; the account remains valid if it is rejected.
    }
  }
  dependencies.exitGuest();

  const activationResult = await dependencies.finalize();
  const activationError = returnedError(activationResult);
  if (activationError) {
    dependencies.onError(activationError);
    return { kind: "activationError" };
  }

  dependencies.onComplete();
  return { kind: "complete" };
}
