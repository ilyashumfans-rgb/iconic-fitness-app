import { Platform } from "react-native";
// Expo re-exports expo-modules-core; pnpm does not expose its transitive package
// as a direct app dependency.
import { requireOptionalNativeModule } from "expo";
import type { HealthProvider, WatchRecord } from "./watchHealth";

export type HealthAvailability = { available: boolean; reason?: string; provider: HealthProvider };
type NativeHealth = {
  getAvailability(): Promise<HealthAvailability>;
  requestPermissions(): Promise<void>;
  readDailyRecords(startDate: string, endDate: string): Promise<WatchRecord[]>;
  openSettings(): Promise<void>;
};
const native = Platform.OS === "ios" || Platform.OS === "android" ? requireOptionalNativeModule<NativeHealth>("IconicHealth") : null;
export async function getHealthAvailability(): Promise<HealthAvailability> {
  if (!native) return {
    available: false, provider: Platform.OS === "ios" ? "apple-health" : "health-connect",
    reason: Platform.OS === "web" ? "Health records are not available in a browser. Use a custom native Iconic Fitness build on iOS or Android 14+." : "This requires a custom native Iconic Fitness build with health support. Expo Go is not supported.",
  };
  return native.getAvailability();
}
export function healthNative(): NativeHealth {
  if (!native) throw new Error("Native health support is unavailable in this build.");
  return native;
}