/**
 * @clerk/expo's installed useSSO implementation uses
 * AuthSession.makeRedirectUri({ path: "sso-callback" }) when no redirect URL
 * is supplied. That path is important on web: the callback page can complete
 * Expo WebBrowser's popup hand-off without navigating the opener.
 *
 * Keep native on its existing scheme root. The released native app has that
 * URL registered with Clerk, whereas adding a native path would require a new
 * redirect URL registration.
 */
export function ssoRedirectOptions(
  platform: string,
  makeNativeRedirectUri: () => string,
): { redirectUrl?: string } {
  return platform === "web"
    ? {}
    : { redirectUrl: makeNativeRedirectUri() };
}

/**
 * Expo WebBrowser stores the pending popup handle in same-origin local
 * storage. The callback bundle must call this before any async app bootstrap
 * work so it can post the callback URL back to the still-open initiating
 * window. A missing/expired opener is harmless and must not crash the route.
 */
export function completeSsoWebCallback(
  platform: string,
  maybeCompleteAuthSession: () => unknown,
): void {
  if (platform !== "web") return;
  try {
    maybeCompleteAuthSession();
  } catch {
    // The original tab can be closed/reloaded while the OAuth popup is open.
    // There is no pending in-memory SSO flow to resume in that situation.
  }
}