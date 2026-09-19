import type { Href } from "expo-router";

export const MEMBER_WELCOME_ROUTE = "/(auth)/welcome" as const;

/**
 * Keep a member auth hand-off inside the mobile app. Auth links can be opened
 * from a deep link, so never let a query parameter turn the post-auth
 * destination into an external URL or another auth route.
 */
export function normalizeMemberAuthReturnTo(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string" || !candidate) return undefined;

  let decoded = candidate;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return undefined;
  }

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.startsWith(MEMBER_WELCOME_ROUTE) ||
    decoded.startsWith("/(auth)/") ||
    decoded === "/staff-login" ||
    decoded === "/staff-home" ||
    decoded.startsWith("/staff-") ||
    decoded.startsWith("/api/")
  ) {
    return undefined;
  }
  return decoded;
}

export function memberAuthHref(returnTo?: unknown): Href {
  const safeReturnTo = normalizeMemberAuthReturnTo(returnTo);
  return safeReturnTo
    ? { pathname: MEMBER_WELCOME_ROUTE, params: { returnTo: safeReturnTo } }
    : MEMBER_WELCOME_ROUTE;
}

export function memberAuthDestination(value: unknown): string {
  return normalizeMemberAuthReturnTo(value) ?? "/(tabs)";
}