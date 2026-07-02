const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

// --- Clerk Expo Go compatibility ---------------------------------------------
// `@clerk/expo` v3 ships native modules. On Android its native spec files call
// `requireNativeModule("ClerkExpo")` at import time, which THROWS when the module
// is absent — e.g. in Expo Go, which cannot load third-party native modules. That
// throw happens before Clerk's own graceful-fallback try/catch runs, so the whole
// app crashes at startup with "Cannot find native module 'ClerkExpo'".
//
// The platform-default specs (NativeClerkModule.js / NativeClerkGoogleSignIn.js)
// use the non-throwing `TurboModuleRegistry.get` / `requireOptionalNativeModule`
// instead, returning null when the module is missing. We redirect the Android
// spec requires to those defaults so the app runs in Expo Go (auth still works,
// it's network-based). A real production/dev build still autolinks and resolves
// the native module normally, so nothing is lost there.
const CLERK_SAFE_SPECS = /\/specs\/(NativeClerkModule|NativeClerkGoogleSignIn)$/;

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === "android" &&
    CLERK_SAFE_SPECS.test(moduleName) &&
    context.originModulePath.includes(
      `${path.sep}@clerk${path.sep}expo${path.sep}`,
    )
  ) {
    const filePath = path.resolve(
      path.dirname(context.originModulePath),
      `${moduleName}.js`,
    );
    // Only redirect if the safe default spec actually exists; otherwise fall
    // through so a future Clerk layout change can't hard-break resolution.
    if (fs.existsSync(filePath)) {
      return { type: "sourceFile", filePath };
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
