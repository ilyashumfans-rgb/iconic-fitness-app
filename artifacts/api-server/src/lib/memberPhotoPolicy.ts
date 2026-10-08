// Clerk/social-provider defaults are not a member's uploaded verification photo.
export function isUploadedMemberPhoto(value: unknown): boolean {
  return typeof value === "string" && /\/(?:api\/)?storage\/db-images\/[0-9a-f-]{36}(?:$|[?#])/i.test(value);
}

export function canSaveMemberPhoto(current: string, requested: unknown): boolean {
  return requested === undefined || requested === current || !isUploadedMemberPhoto(current);
}
