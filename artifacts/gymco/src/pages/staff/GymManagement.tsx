import { useEffect, useMemo, useState } from "react";
import {
  StaffLayout,
  StaffCard,
  PermissionGate,
} from "@/components/staff/StaffLayout";
import { staffApi, type StaffGym } from "@/lib/staffApi";
import {
  Building2,
  Search,
  MapPin,
  Navigation,
  ExternalLink,
  Save,
  X,
  Edit3,
  Loader2,
} from "lucide-react";

export default function StaffGymManagementPage() {
  return (
    <PermissionGate perm="gym.manage">
      <StaffLayout title="Gym Management">
        <Inner />
      </StaffLayout>
    </PermissionGate>
  );
}

function Inner() {
  const [gyms, setGyms] = useState<StaffGym[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<StaffGym | null>(null);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const rows = await staffApi.gyms.list();
      setGyms(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load gyms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return gyms;
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.city.toLowerCase().includes(term) ||
        g.area.toLowerCase().includes(term) ||
        (g.partnerName ?? "").toLowerCase().includes(term),
    );
  }, [gyms, q]);

  return (
    <div className="space-y-5">
      <StaffCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search gym, city, area, partner…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
          </div>
          <div className="text-xs text-slate-400">
            {loading ? "Loading…" : `${filtered.length} of ${gyms.length} gyms`}
          </div>
        </div>
      </StaffCard>

      {err && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching gyms…
        </div>
      ) : filtered.length === 0 ? (
        <StaffCard className="p-10 text-center">
          <Building2 className="h-10 w-10 mx-auto text-slate-600 mb-3" />
          <div className="text-white font-semibold">No gyms found</div>
          <div className="text-sm text-slate-400 mt-1">
            Try a different search term.
          </div>
        </StaffCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <StaffCard key={g.id} className="overflow-hidden flex flex-col">
              <div className="relative h-36 bg-slate-800">
                {g.heroImage ? (
                  <img
                    src={g.heroImage}
                    alt={g.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <Building2 className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                <div className="absolute bottom-2 left-3 right-3 text-white">
                  <div className="text-sm font-bold truncate">{g.name}</div>
                  <div className="text-[11px] opacity-80 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {g.area}, {g.city}
                  </div>
                </div>
                {g.lat != null && g.lng != null ? (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold">
                    <Navigation className="h-3 w-3" /> PINNED
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-bold">
                    NO LOCATION
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  Partner
                </div>
                <div className="text-sm text-white font-medium truncate">
                  {g.partnerName ?? "— unassigned —"}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>From ₹{g.priceFrom?.toLocaleString("en-IN") ?? 0}/mo</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      g.openNow
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {g.openNow ? "Open now" : "Closed"}
                  </span>
                </div>
                <button
                  onClick={() => setEditing(g)}
                  className="mt-4 inline-flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold hover:opacity-95"
                >
                  <Edit3 className="h-4 w-4" /> Edit gym
                </button>
              </div>
            </StaffCard>
          ))}
        </div>
      )}

      {editing && (
        <EditGymModal
          gym={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setGyms((prev) =>
              prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)),
            );
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditGymModal({
  gym,
  onClose,
  onSaved,
}: {
  gym: StaffGym;
  onClose: () => void;
  onSaved: (g: StaffGym) => void;
}) {
  const [name, setName] = useState(gym.name);
  const [address, setAddress] = useState(gym.address);
  const [area, setArea] = useState(gym.area);
  const [city, setCity] = useState(gym.city);
  const [priceFrom, setPriceFrom] = useState(String(gym.priceFrom ?? 0));
  const [openNow, setOpenNow] = useState(gym.openNow);
  const [lat, setLat] = useState(gym.lat != null ? String(gym.lat) : "");
  const [lng, setLng] = useState(gym.lng != null ? String(gym.lng) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState<"none" | "device" | "address">("none");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const useDeviceLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Geolocation not supported.");
      return;
    }
    setGeoBusy("device");
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoBusy("none");
        setGeoMsg("Pinned to your current location.");
      },
      (e) => {
        setGeoBusy("none");
        setGeoMsg(
          e.code === e.PERMISSION_DENIED
            ? "Location permission denied. Enable it in the browser address bar."
            : "Couldn't read your location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const geocodeFromAddress = async () => {
    const q = [address, area, city, "India"].filter(Boolean).join(", ").trim();
    if (!q) {
      setGeoMsg("Fill in the address, area, or city first.");
      return;
    }
    setGeoBusy("address");
    setGeoMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (data && data[0]) {
        setLat(Number(data[0].lat).toFixed(6));
        setLng(Number(data[0].lon).toFixed(6));
        setGeoMsg("Found coordinates from address.");
      } else {
        setGeoMsg("No match found. Try a more specific address.");
      }
    } catch {
      setGeoMsg("Lookup failed. Check your connection.");
    } finally {
      setGeoBusy("none");
    }
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const latNum = lat.trim() === "" ? undefined : Number(lat);
      const lngNum = lng.trim() === "" ? undefined : Number(lng);
      const updated = await staffApi.gyms.update(gym.id, {
        name,
        address,
        area,
        city,
        priceFrom: Number(priceFrom) || 0,
        openNow,
        ...(latNum !== undefined && Number.isFinite(latNum) ? { lat: latNum } : {}),
        ...(lngNum !== undefined && Number.isFinite(lngNum) ? { lng: lngNum } : {}),
      });
      onSaved(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-orange-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-80">
                Editing gym (staff)
              </div>
              <div className="text-lg font-black truncate">{gym.name}</div>
              <div className="text-xs opacity-90 truncate">
                Partner: {gym.partnerName ?? "Unassigned"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name" value={name} onChange={setName} className="sm:col-span-2" />
            <Field label="Area" value={area} onChange={setArea} />
            <Field label="City" value={city} onChange={setCity} />
            <Field
              label="Address"
              value={address}
              onChange={setAddress}
              className="sm:col-span-2"
            />

            <div className="sm:col-span-2 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-wide text-orange-700 font-bold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Map location
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Used for member "near me" search and directions.
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={useDeviceLocation}
                    disabled={geoBusy !== "none"}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-orange-300 text-orange-700 text-xs font-semibold hover:bg-orange-100 disabled:opacity-60"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    {geoBusy === "device" ? "Locating…" : "Use my location"}
                  </button>
                  <button
                    type="button"
                    onClick={geocodeFromAddress}
                    disabled={geoBusy !== "none"}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold hover:opacity-95 disabled:opacity-60"
                  >
                    <Search className="h-3.5 w-3.5" />
                    {geoBusy === "address" ? "Searching…" : "Find from address"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" value={lat} onChange={setLat} type="number" />
                <Field label="Longitude" value={lng} onChange={setLng} type="number" />
              </div>
              {geoMsg && (
                <div className="mt-2 text-[11px] font-medium text-slate-700">{geoMsg}</div>
              )}
              {lat && lng && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 hover:text-orange-800 underline"
                >
                  <ExternalLink className="h-3 w-3" /> Preview on Google Maps
                </a>
              )}
            </div>

            <Field
              label="Starting price (₹)"
              value={priceFrom}
              onChange={setPriceFrom}
              type="number"
            />
            <button
              type="button"
              onClick={() => setOpenNow(!openNow)}
              className={`flex items-center justify-between gap-3 px-4 rounded-xl border transition ${
                openNow
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">
                Currently open
              </span>
              <span
                className={`h-6 w-11 rounded-full p-0.5 transition ${
                  openNow ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    openNow ? "translate-x-5" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-orange-100 bg-orange-50/30 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            Staff edit · changes apply immediately to the partner's gym.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs uppercase tracking-wide text-slate-600 font-semibold mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-400"
      />
    </div>
  );
}
