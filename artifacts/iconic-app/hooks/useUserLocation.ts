import * as Location from "expo-location";
import { useCallback, useState } from "react";

export type LocationStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "error";

export type Coords = { lat: number; lng: number };

/**
 * Asks for foreground location permission and resolves the device's current
 * coordinates. Works in Expo Go (expo-location ships in the SDK) and on web
 * (falls back to the browser geolocation prompt). Always resilient — any
 * failure resolves to a terminal status instead of throwing.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const request = useCallback(async () => {
    setStatus("loading");
    try {
      const { status: perm } =
        await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        setStatus("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setStatus("granted");
    } catch {
      setStatus("error");
    }
  }, []);

  return { coords, status, request };
}
