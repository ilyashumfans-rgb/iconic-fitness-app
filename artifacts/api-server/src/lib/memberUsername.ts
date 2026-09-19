export const MEMBER_USERNAME_RULE =
  "Username must be 3–30 characters, start with a letter, and use only letters, numbers, dots, or underscores.";

export function normalizeMemberUsername(
  value: unknown,
): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return /^[a-z][a-z0-9._]{2,29}$/.test(normalized)
    ? normalized
    : undefined;
}