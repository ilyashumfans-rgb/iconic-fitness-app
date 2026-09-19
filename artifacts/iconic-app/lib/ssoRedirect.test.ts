import {
  completeSsoWebCallback,
  ssoRedirectOptions,
} from "./ssoRedirect";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// These exercise the helper used by the app startup callback. They deliberately
// do not use the Clerk E2E helper: it can establish a browser Clerk session,
// but cannot create Expo WebBrowser's same-origin popup/session state.
export function runSsoRedirectRegressionTests() {
  let nativeFactoryCalls = 0;
  const native = ssoRedirectOptions("ios", () => {
    nativeFactoryCalls += 1;
    return "iconic-app://";
  });
  assert(
    native.redirectUrl === "iconic-app://" && nativeFactoryCalls === 1,
    "native SSO must retain its registered scheme redirect",
  );

  const web = ssoRedirectOptions("web", () => {
    throw new Error("web must use @clerk/expo's sso-callback default");
  });
  assert(
    !("redirectUrl" in web),
    "web SSO must let @clerk/expo create its supported sso-callback URL",
  );

  let callbackCalls = 0;
  completeSsoWebCallback("web", () => {
    callbackCalls += 1;
  });
  completeSsoWebCallback("android", () => {
    callbackCalls += 1;
  });
  assert(
    callbackCalls === 1,
    "only the web callback page may complete Expo WebBrowser auth",
  );

  // A stale popup opener causes Expo WebBrowser to throw. The callback route
  // must remain safe to load rather than replacing the app with an error page.
  completeSsoWebCallback("web", () => {
    throw new Error("stale opener");
  });
}

runSsoRedirectRegressionTests();