import { LogBox } from "react-native";

/**
 * expo-notifications auto-registers a device push-token listener as a side effect
 * the moment the module is imported. In Expo Go (SDK 53+) that logs a scary
 * "Push notifications (remote notifications) ... was removed from Expo Go" notice
 * on every launch (console.error → red box on Android, console.warn → yellow on
 * iOS). We only use LOCAL notifications, which work fine in Expo Go, so this notice
 * is noise. It never appears in a real dev/production build.
 *
 * This module must be imported BEFORE `expo-notifications` so the console patch is
 * in place before the side effect fires.
 */
const NOTICE =
  "Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go";

if (__DEV__) {
  const originalError = console.error;
  console.error = (...args: Parameters<typeof console.error>) => {
    if (typeof args[0] === "string" && args[0].includes(NOTICE)) return;
    originalError(...args);
  };

  const originalWarn = console.warn;
  console.warn = (...args: Parameters<typeof console.warn>) => {
    if (typeof args[0] === "string" && args[0].includes(NOTICE)) return;
    originalWarn(...args);
  };

  try {
    LogBox.ignoreLogs([NOTICE]);
  } catch {
    // LogBox may be unavailable (web); the console patch above already covers it.
  }
}
