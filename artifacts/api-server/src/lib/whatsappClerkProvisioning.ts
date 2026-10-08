import { createHash, randomBytes } from "node:crypto";
import { OtpError, normalizeOtpPhone } from "./whatsappOtp";

// Deliberately independent of the rotating OTP HMAC secret: an interrupted
// Clerk/DB provision must resolve to the same identity after a secret rotation.
export function whatsappExternalId(phone: string): string {
  if (normalizeOtpPhone(phone) !== phone) throw new OtpError(400, "Invalid verified mobile number.");
  return `iconic_whatsapp_v1_${createHash("sha256").update(`iconic:whatsapp:member:v1\0${phone}`).digest("hex")}`;
}

export type ProvisionedClerkUser = {
  id: string;
  externalId: string | null;
  privateMetadata: Record<string, unknown>;
  banned: boolean;
  locked: boolean;
};
export type WhatsappClerkDependencies<User extends ProvisionedClerkUser> = {
  find: (externalId: string) => Promise<{ data: User[]; totalCount: number }>;
  create: (params: {
    externalId: string;
    username: string;
    skipPasswordRequirement: true;
    privateMetadata: { whatsappOtp: { source: "iconic_whatsapp_otp"; version: 1; externalId: string } };
  }) => Promise<User>;
};

const provenanceConflict = () => new OtpError(409, "Unable to sign in with this number. Please contact your gym.");

export async function provisionWhatsappClerkUser<User extends ProvisionedClerkUser>(
  phone: string,
  deps: WhatsappClerkDependencies<User>,
): Promise<User> {
  const externalId = whatsappExternalId(phone);
  const validate = (user: User): User => {
    const marker = user.privateMetadata?.whatsappOtp as Record<string, unknown> | undefined;
    if (!user.id || user.externalId !== externalId || marker?.source !== "iconic_whatsapp_otp" ||
        marker.version !== 1 || marker.externalId !== externalId) throw provenanceConflict();
    if (user.banned || user.locked) throw new OtpError(403, "This account is disabled. Please contact your gym.");
    return user;
  };
  const find = async (): Promise<User | undefined> => {
    const result = await deps.find(externalId);
    if (result.totalCount === 0 && result.data.length === 0) return undefined;
    if (result.totalCount !== 1 || result.data.length !== 1) throw provenanceConflict();
    return validate(result.data[0]!);
  };
  const existing = await find();
  if (existing) return existing;
  let created: User;
  try {
    created = await deps.create({
      externalId,
      // An opaque, 51-character, allowed username is the only Clerk identifier.
      // Never search/adopt by username, including on an identifier collision.
      username: `wa_${randomBytes(24).toString("hex")}`,
      skipPasswordRequirement: true,
      privateMetadata: { whatsappOtp: { source: "iconic_whatsapp_otp", version: 1, externalId } },
    });
  } catch (error) {
    // Handles a lost successful response or a concurrent externalId winner.
    // If creation failed before persistence, a fresh OTP can retry. Do not
    // invent emails, attach Clerk phone attributes, or bypass password/legal
    // policy checks to work around instance configuration failures.
    const recovered = await find();
    if (recovered) return recovered;
    throw error;
  }
  return validate(created);
}