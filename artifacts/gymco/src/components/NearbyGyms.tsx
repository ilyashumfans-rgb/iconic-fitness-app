import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListGyms,
  getListGymsQueryKey,
} from "@workspace/api-client-react";
import { locationsApi, type City } from "@/lib/locationsApi";
import {
  MapPin,
  Star,
  Navigation,
  Loader2,
  Search,
  ArrowRight,
  IndianRupee,
} from "lucide-react";

type Props = {
  variant?: "light" | "dark";
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
};

type Coords = { lat: number; lng: number };

const POPULAR_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Pune",
  "Chennai",
];

export default function NearbyGyms({
  variant = "light",
  title = "Gyms near you",
  subtitle = "Find premium gyms close to your location and book instantly.",
  limit = 6,
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string | undefined>();
  const [cityCatalog, setCityCatalog] = useState<City[]>([]);
  const [defaultCity, setDefaultCity] = useState<string | null>(null);
  const [cityTouched, setCityTouched] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "loading" | "granted" | "denied" | "unsupported"
  >("idle");
  const [geoLabel, setGeoLabel] = useState<string>("");

  const { data: gyms, isLoading } = useListGyms(
    { q: query || undefined, city },
    { query: { queryKey: getListGymsQueryKey({ q: query || undefined, city }) } },
  );

  // Load the admin's chosen default city + the full active city catalog on mount.
  useEffect(() => {
    let cancelled = false;
    Promise.all([locationsApi.listCities(), locationsApi.getDefaultCity()])
      .then(([all, def]) => {
        if (cancelled) return;
        const active = all.filter((c) => c.isActive);
        setCityCatalog(active);
        if (def?.name) {
          setDefaultCity(def.name);
          // Only auto-apply if the user hasn't manually chosen a city yet.
          setCity((prev) => (prev === undefined && !cityTouched ? def.name : prev));
        }
      })
      .catch(() => {
        /* soft fail — popular cities fallback still works */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user grants geolocation, try to reverse-geocode to a city name for filtering.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=10&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.address) return;
        const addr = data.address as Record<string, string>;
        const detectedCity =
          addr.city || addr.town || addr.state_district || addr.state || "";
        if (detectedCity) {
          setGeoLabel(detectedCity);
          setCity(detectedCity);
          setCityTouched(true);
        }
      })
      .catch(() => {
        /* soft fail */
      });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const useLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const nearby = useMemo(() => {
    if (!gyms) return [];
    return [...gyms]
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }, [gyms, limit]);

  const isDark = variant === "dark";
  const styles = isDark
    ? {
        section: "bg-slate-950 text-white",
        eyebrow: "text-orange-400",
        heading: "text-white",
        subtitle: "text-slate-300",
        card: "bg-slate-900/60 border border-white/10 hover:border-orange-500/60",
        input:
          "bg-slate-900 border-white/15 text-white placeholder:text-slate-500",
        chip: "bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10",
        chipActive: "bg-orange-500 text-white border-orange-500",
        muted: "text-slate-400",
      }
    : {
        section: "bg-white text-slate-900",
        eyebrow: "text-orange-600",
        heading: "text-slate-900",
        subtitle: "text-slate-600",
        card: "bg-white border border-orange-100 hover:border-orange-300 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)]",
        input:
          "bg-white border-orange-100 text-slate-900 placeholder:text-slate-400",
        chip: "bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-100",
        chipActive: "bg-orange-500 text-white border-orange-500",
        muted: "text-slate-500",
      };

  return (
    <section className={`${styles.section} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div
              className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-bold ${styles.eyebrow}`}
            >
              <Navigation className="h-3 w-3" />
              Nearby gyms
            </div>
            <h2
              className={`mt-2 text-3xl md:text-4xl font-black tracking-tight ${styles.heading}`}
            >
              {title}
            </h2>
            <p className={`mt-2 text-sm md:text-base max-w-xl ${styles.subtitle}`}>
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={useLocation}
            disabled={geoStatus === "loading"}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold shadow-[0_10px_25px_-10px_rgba(249,115,22,0.6)] disabled:opacity-60 shrink-0"
          >
            {geoStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {geoStatus === "granted"
              ? geoLabel
                ? `Showing near ${geoLabel}`
                : "Location enabled"
              : "Use my location"}
          </button>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-3 sm:p-4 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search gym name, area, or activity"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-orange-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60 text-sm"
              />
            </div>
            <select
              value={city ?? ""}
              onChange={(e) => {
                setCityTouched(true);
                setCity(e.target.value || undefined);
              }}
              className="px-3 py-2.5 rounded-xl bg-white border border-orange-100 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            >
              <option value="">All cities</option>
              {(cityCatalog.length
                ? cityCatalog.map((c) => c.name)
                : POPULAR_CITIES
              ).map((c) => (
                <option key={c} value={c}>
                  {c}
                  {defaultCity === c ? " (default)" : ""}
                </option>
              ))}
            </select>
            <Link
              href={`/explore${query || city ? `?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(city ? { city } : {}) }).toString()}` : ""}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold"
            >
              See all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] uppercase tracking-wide font-bold ${styles.muted}`}>
              Popular:
            </span>
            {(cityCatalog.length
              ? cityCatalog.map((c) => c.name)
              : POPULAR_CITIES
            )
              .slice(0, 8)
              .map((c) => {
                const active = city === c;
                const isDef = defaultCity === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCityTouched(true);
                      setCity(active ? undefined : c);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                      active ? styles.chipActive : styles.chip
                    }`}
                  >
                    {c}
                    {isDef && !active && (
                      <span className="ml-1 text-amber-500">★</span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {geoStatus === "denied" && (
          <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Location permission was denied. We're showing the closest gyms based
            on your selected city instead.
          </div>
        )}
        {geoStatus === "unsupported" && (
          <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Your browser doesn't support location. Pick a city above to narrow
            results.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className={`rounded-2xl ${styles.card} h-72 animate-pulse`}
              />
            ))}
          </div>
        ) : nearby.length === 0 ? (
          <div
            className={`rounded-2xl ${styles.card} p-10 text-center`}
          >
            <MapPin className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-base font-bold">No gyms match yet</div>
            <div className={`text-sm mt-1 ${styles.muted}`}>
              Try a different city or clear your search to see all gyms.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearby.map((g) => (
              <Link
                key={g.id}
                href={`/gyms/${g.id}`}
                className={`group rounded-2xl overflow-hidden flex flex-col ${styles.card} transition-all hover:-translate-y-1`}
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={g.heroImage}
                    alt={g.name}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 text-[11px] font-bold text-amber-700 shadow">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {g.rating.toFixed(1)}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-bold shadow">
                    <Navigation className="h-3 w-3" />
                    {g.distanceKm.toFixed(1)} km
                  </div>
                  {g.openNow && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/95 text-white text-[10px] font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      Open now
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-base font-extrabold leading-snug text-slate-900">
                    {g.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-orange-500" />
                    {g.area}, {g.city}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {g.categories.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-100 text-[10px] uppercase tracking-wide font-bold text-orange-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-50 border border-orange-100 text-[10px] uppercase tracking-wider font-bold text-orange-700">
                      Included with plan
                    </span>
                    <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-bold">
                      View
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
