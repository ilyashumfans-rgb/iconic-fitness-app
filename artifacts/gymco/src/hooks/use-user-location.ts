import { useEffect, useState } from "react";

export type Coords = { lat: number; lng: number };

export type GeoStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "unsupported";

/**
 * Requests the visitor's geolocation. Auto-requests once on mount (browsers
 * remember a prior grant, so returning visitors get coords with no prompt) and
 * exposes a `request` callback for an explicit "use my location" button.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  useEffect(() => {
    request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, status, request };
}
