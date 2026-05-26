import { useEffect, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerGym } from "@/lib/partnerApi";
import FileUpload from "@/components/FileUpload";
import {
  Building2,
  MapPin,
  Star,
  Edit3,
  X,
  Save,
  Activity,
  Plus,
  Dot,
  Image as ImageIcon,
  Clock,
  Sparkles,
  ListChecks,
  IndianRupee,
  ExternalLink,
  CheckCircle2,
  Navigation,
  Search,
} from "lucide-react";
import * as LucideIcons from "lucide-react";

type WorkoutCatalogItem = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  imageUrl: string;
};

type WorkoutSession = {
  workoutId: number;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  instructor: string;
};

function WorkoutIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const lookup = (LucideIcons as unknown as Record<string, unknown>)[name];
  const Comp =
    typeof lookup === "function" || typeof lookup === "object"
      ? (lookup as React.ComponentType<{ className?: string }>)
      : Dot;
  try {
    return <Comp className={className} />;
  } catch {
    return <Dot className={className} />;
  }
}

export default function PartnerGyms() {
  const [rows, setRows] = useState<PartnerGym[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PartnerGym | null>(null);

  const load = () => {
    setBusy(true);
    partnerApi.gyms
      .list()
      .then(setRows)
      .catch((e) => setErr(String(e)))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  return (
    <PartnerLayout title="My Gyms">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}
      {rows.length === 0 && !busy ? (
        <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-gradient-to-br from-white via-orange-50/60 to-amber-50 p-12 text-center shadow-[0_30px_60px_-30px_rgba(249,115,22,0.35)]">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-[0_15px_30px_-10px_rgba(249,115,22,0.6)]">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="mt-5 text-xl font-bold text-slate-900">
              No gyms assigned yet
            </div>
            <div className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Once GYMCO admin assigns gyms to your partner account, they'll
              appear here for you to brand, manage, and grow.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map((g) => (
            <div
              key={g.id}
              className="group relative overflow-hidden rounded-2xl bg-white border border-orange-100 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.15)] hover:shadow-[0_24px_50px_-20px_rgba(249,115,22,0.45)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={g.heroImage}
                  alt={g.name}
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent" />
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[11px] font-bold text-amber-700 shadow">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {g.rating.toFixed(1)}
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur shadow ${
                      g.openNow
                        ? "bg-emerald-500/95 text-white"
                        : "bg-slate-900/80 text-slate-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        g.openNow ? "bg-white animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    {g.openNow ? "Open now" : "Closed"}
                  </div>
                </div>
                <div className="absolute left-4 -bottom-6 h-14 w-14 rounded-2xl bg-white border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
                  {g.logoUrl ? (
                    <img
                      src={g.logoUrl}
                      alt={`${g.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-extrabold text-lg">
                      {g.name[0]?.toUpperCase() ?? "G"}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 pt-8 pb-4 flex-1 flex flex-col">
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {g.name}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
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

                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                    <div className="text-slate-400 uppercase tracking-wide font-bold text-[9px]">
                      Starts at
                    </div>
                    <div className="flex items-center text-slate-900 font-bold">
                      <IndianRupee className="h-3 w-3" />
                      {g.priceFrom}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                    <div className="text-slate-400 uppercase tracking-wide font-bold text-[9px]">
                      Hours
                    </div>
                    <div className="text-slate-900 font-semibold truncate flex items-center gap-1">
                      <Clock className="h-3 w-3 text-orange-500 shrink-0" />
                      {g.hours}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setEditing(g)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-[0_8px_20px_-8px_rgba(249,115,22,0.6)]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Manage gym
                  </button>
                  <a
                    href={`/g/${g.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="View public page"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditGymModal
          gym={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </PartnerLayout>
  );
}

function EditGymModal({
  gym,
  onClose,
  onSaved,
}: {
  gym: PartnerGym;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(gym.name);
  const [address, setAddress] = useState(gym.address);
  const [area, setArea] = useState(gym.area);
  const [city, setCity] = useState(gym.city);
  const [about, setAbout] = useState(gym.about);
  const [hours, setHours] = useState(gym.hours);
  const [heroImage, setHeroImage] = useState(gym.heroImage);
  const [logoUrl, setLogoUrl] = useState(gym.logoUrl ?? "");
  const [galleryText, setGalleryText] = useState(
    (gym.gallery ?? []).join("\n"),
  );
  const [priceFrom, setPriceFrom] = useState(String(gym.priceFrom));
  const [openNow, setOpenNow] = useState(gym.openNow);
  const [lat, setLat] = useState(
    gym.lat !== undefined && gym.lat !== null ? String(gym.lat) : "",
  );
  const [lng, setLng] = useState(
    gym.lng !== undefined && gym.lng !== null ? String(gym.lng) : "",
  );
  const [geoBusy, setGeoBusy] = useState<"none" | "device" | "address">("none");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const useDeviceLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Geolocation not supported on this device.");
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
      (err) => {
        setGeoBusy("none");
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser address bar."
            : "Couldn't read your location. Try again.",
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("basics");

  const [amenityCatalog, setAmenityCatalog] = useState<
    { id: number; name: string; icon: string; category: string }[]
  >([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<Set<number>>(
    new Set(),
  );
  const [customAmenities, setCustomAmenities] = useState<
    { name: string; description: string; icon: string }[]
  >([]);
  const [customDraft, setCustomDraft] = useState<{
    name: string;
    description: string;
    icon: string;
  }>({ name: "", description: "", icon: "Dot" });

  const [weeklyHours, setWeeklyHours] = useState<
    {
      dayOfWeek: number;
      isClosed: boolean;
      openMinute: number;
      closeMinute: number;
    }[]
  >([]);

  const [workoutCatalog, setWorkoutCatalog] = useState<WorkoutCatalogItem[]>(
    [],
  );
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<Set<number>>(
    new Set(),
  );
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [cat, am, hrs, wcat, wsel, wses] = await Promise.all([
          partnerApi.amenityCatalog(),
          partnerApi.getGymAmenities(gym.id),
          partnerApi.getGymHours(gym.id),
          partnerApi.workoutCatalog(),
          partnerApi.getGymWorkouts(gym.id),
          partnerApi.getGymWorkoutSessions(gym.id),
        ]);
        setAmenityCatalog(cat as any[]);
        setSelectedAmenityIds(new Set(am.catalogIds));
        setCustomAmenities(
          am.custom.map((c) => ({
            name: c.name,
            description: c.description ?? "",
            icon: c.icon ?? "Dot",
          })),
        );
        setWeeklyHours(hrs);
        setWorkoutCatalog(wcat);
        setSelectedWorkoutIds(new Set(wsel.workoutIds));
        setWorkoutSessions(
          wses.map((s) => ({
            workoutId: s.workoutId,
            dayOfWeek: s.dayOfWeek,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
            instructor: s.instructor ?? "",
          })),
        );
      } catch {
        // soft-fail; modal still works for basic fields
      }
    })();
  }, [gym.id]);

  const toggleWorkout = (id: number) => {
    setSelectedWorkoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setWorkoutSessions((s) => s.filter((row) => row.workoutId !== id));
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addSession = (workoutId: number) => {
    setWorkoutSessions((prev) => [
      ...prev,
      {
        workoutId,
        dayOfWeek: 1,
        startMinute: 360,
        endMinute: 420,
        instructor: "",
      },
    ]);
  };

  const updateSession = (idx: number, patch: Partial<WorkoutSession>) => {
    setWorkoutSessions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const removeSession = (idx: number) => {
    setWorkoutSessions((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAmenity = (id: number) => {
    setSelectedAmenityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomAmenity = () => {
    const name = customDraft.name.trim();
    if (!name) return;
    setCustomAmenities((prev) => [
      ...prev,
      {
        name,
        description: customDraft.description.trim(),
        icon: customDraft.icon.trim() || "Dot",
      },
    ]);
    setCustomDraft({ name: "", description: "", icon: "Dot" });
  };

  const removeCustomAmenity = (idx: number) => {
    setCustomAmenities((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateHour = (
    day: number,
    patch: Partial<{
      isClosed: boolean;
      openMinute: number;
      closeMinute: number;
    }>,
  ) => {
    setWeeklyHours((prev) =>
      prev.map((h) => (h.dayOfWeek === day ? { ...h, ...patch } : h)),
    );
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const gallery = galleryText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const latNum = lat.trim() === "" ? undefined : Number(lat);
      const lngNum = lng.trim() === "" ? undefined : Number(lng);
      await partnerApi.gyms.update(gym.id, {
        name,
        address,
        area,
        city,
        about,
        hours,
        heroImage,
        logoUrl,
        gallery,
        priceFrom: Number(priceFrom) || 0,
        openNow,
        ...(latNum !== undefined && Number.isFinite(latNum) ? { lat: latNum } : {}),
        ...(lngNum !== undefined && Number.isFinite(lngNum) ? { lng: lngNum } : {}),
      });
      await partnerApi.saveGymAmenities(gym.id, {
        catalogIds: Array.from(selectedAmenityIds),
        custom: customAmenities,
      });
      if (weeklyHours.length === 7) {
        await partnerApi.saveGymHours(gym.id, weeklyHours);
      }
      await partnerApi.saveGymWorkouts(
        gym.id,
        Array.from(selectedWorkoutIds),
      );
      const validSessions = workoutSessions.filter(
        (s) =>
          selectedWorkoutIds.has(s.workoutId) && s.endMinute > s.startMinute,
      );
      await partnerApi.saveGymWorkoutSessions(gym.id, validSessions);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const galleryList = galleryText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "basics", label: "Basics", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "media", label: "Media", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    {
      id: "amenities",
      label: "Amenities",
      icon: <ListChecks className="h-3.5 w-3.5" />,
    },
    {
      id: "workouts",
      label: "Workouts",
      icon: <Activity className="h-3.5 w-3.5" />,
    },
    { id: "hours", label: "Hours", icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white border border-orange-100 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35)]">
        <div className="relative">
          <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage || gym.heroImage})` }} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-slate-900/40" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/95 hover:bg-white text-slate-700 shadow"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-0 flex items-end gap-4 px-6 pb-4">
            <div className="h-16 w-16 rounded-2xl bg-white border-2 border-white shadow-lg overflow-hidden flex items-center justify-center shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-extrabold text-xl">
                  {gym.name[0]?.toUpperCase() ?? "G"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-orange-300 font-bold">
                Editing
              </div>
              <div className="text-xl font-extrabold text-white truncate">
                {name || gym.name}
              </div>
              <div className="text-xs text-slate-200 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-orange-400" />
                {area || gym.area}, {city || gym.city}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-3 border-b border-orange-100 bg-white overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px ${
                  tab === t.id
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tab === "basics" && (
            <Field label="Name" value={name} onChange={setName} className="sm:col-span-2" />
          )}

          {tab === "media" && (
          <div className="sm:col-span-2 rounded-xl border border-orange-100 p-4 bg-white">
            <div className="text-xs uppercase tracking-wide text-orange-500 font-bold mb-3">
              Media assets
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
                  Gym logo
                </label>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Upload or paste a URL"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
                <div className="mt-2 flex items-start gap-3">
                  <div className="h-24 w-24 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        Logo preview
                      </span>
                    )}
                  </div>
                  <FileUpload
                    label="Upload logo"
                    onUploaded={(urls) => urls[0] && setLogoUrl(urls[0])}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
                  Hero / profile image
                </label>
                <input
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  placeholder="Upload or paste a URL"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
                <div className="mt-2 flex items-start gap-3">
                  <div className="h-24 flex-1 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
                    {heroImage && (
                      <img
                        src={heroImage}
                        alt="Hero preview"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <FileUpload
                    label="Upload hero"
                    onUploaded={(urls) => urls[0] && setHeroImage(urls[0])}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs uppercase tracking-wide text-slate-400 font-medium block">
                    Gallery
                  </label>
                  <FileUpload
                    label="Upload photos"
                    multiple
                    onUploaded={(urls) => {
                      const cur = galleryText
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const merged = Array.from(new Set([...cur, ...urls]));
                      setGalleryText(merged.join("\n"));
                    }}
                  />
                </div>
                <textarea
                  value={galleryText}
                  onChange={(e) => setGalleryText(e.target.value)}
                  rows={4}
                  placeholder="Upload photos or paste one image URL per line"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 font-mono"
                />
                {galleryList.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {galleryList.slice(0, 12).map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="aspect-square rounded-lg bg-slate-800 border border-slate-700 overflow-hidden"
                      >
                        <img
                          src={src}
                          alt={`Gallery ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 mt-2">
                  Upload photos directly, or paste public image URLs (one per line).
                </div>
              </div>
            </div>
          </div>
          )}

          {tab === "basics" && (
            <>
          <Field label="Area" value={area} onChange={setArea} />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="Address" value={address} onChange={setAddress} className="sm:col-span-2" />

          <div className="sm:col-span-2 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wide text-orange-700 font-bold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Map location
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Pin where this gym is on the map. Members use this for "near me" search and directions.
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
              <Field
                label="Latitude"
                value={lat}
                onChange={setLat}
                type="number"
              />
              <Field
                label="Longitude"
                value={lng}
                onChange={setLng}
                type="number"
              />
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
                Preview on Google Maps →
              </a>
            )}
          </div>

          <Field label="Hours" value={hours} onChange={setHours} />
          <Field label="Starting price (₹)" value={priceFrom} onChange={setPriceFrom} type="number" />
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
              About
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpenNow(!openNow)}
            className={`sm:col-span-2 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition ${
              openNow
                ? "bg-emerald-50 border-emerald-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${openNow ? "text-emerald-600" : "text-slate-400"}`} />
              <div className="text-sm font-semibold text-slate-800">
                Currently open
              </div>
            </div>
            <div
              className={`h-6 w-11 rounded-full p-0.5 transition ${
                openNow ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  openNow ? "translate-x-5" : ""
                }`}
              />
            </div>
          </button>
            </>
          )}

          {tab === "amenities" && (
          <div className="sm:col-span-2 rounded-xl border border-orange-100 p-4 bg-white">
            <div className="text-xs uppercase tracking-wide text-orange-500 font-bold mb-3">
              Amenities (from catalog)
            </div>
            {amenityCatalog.length === 0 ? (
              <div className="text-xs text-slate-500">
                No catalog amenities available yet. Ask an admin to add some.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {amenityCatalog.map((a) => {
                  const active = selectedAmenityIds.has(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                        active
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:border-orange-500/60"
                      }`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5">
              <div className="text-xs uppercase tracking-wide text-orange-500 font-bold mb-2">
                Custom amenities
              </div>
              {customAmenities.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {customAmenities.map((c, i) => (
                    <div
                      key={`${c.name}-${i}`}
                      className="flex items-center justify-between rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium truncate">
                          {c.name}{" "}
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide ml-1">
                            {c.icon}
                          </span>
                        </div>
                        {c.description && (
                          <div className="text-xs text-slate-400 truncate">
                            {c.description}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomAmenity(i)}
                        className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={customDraft.name}
                  onChange={(e) =>
                    setCustomDraft({ ...customDraft, name: e.target.value })
                  }
                  placeholder="Name (e.g. Rooftop Sauna)"
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
                <input
                  value={customDraft.icon}
                  onChange={(e) =>
                    setCustomDraft({ ...customDraft, icon: e.target.value })
                  }
                  placeholder="Icon (Lucide name)"
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
                <input
                  value={customDraft.description}
                  onChange={(e) =>
                    setCustomDraft({
                      ...customDraft,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description (optional)"
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                />
              </div>
              <button
                type="button"
                onClick={addCustomAmenity}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold border border-slate-700"
              >
                Add custom amenity
              </button>
            </div>
          </div>
          )}

          {tab === "workouts" && (
          <div className="sm:col-span-2 rounded-xl border border-orange-100 p-4 bg-white">
            <div className="text-xs uppercase tracking-wide text-orange-500 font-bold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Workout types
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Choose the workouts your gym offers. Then add session times for
              each one below.
            </p>
            {workoutCatalog.length === 0 ? (
              <div className="text-xs text-slate-500">
                No workout catalog yet. Ask an admin to add some in
                /admin/workouts.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {workoutCatalog.map((w) => {
                  const active = selectedWorkoutIds.has(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWorkout(w.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        active
                          ? "border-orange-500/70 bg-gradient-to-br from-orange-500/15 to-amber-500/10"
                          : "border-slate-700 bg-slate-800 hover:border-orange-500/40"
                      }`}
                    >
                      <div
                        className={`h-12 w-12 rounded-xl bg-gradient-to-br ${w.color} flex items-center justify-center text-white shadow`}
                      >
                        <WorkoutIcon name={w.icon} className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold text-white text-center leading-tight">
                        {w.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedWorkoutIds.size > 0 && (
              <div className="mt-5 space-y-4">
                <div className="text-xs uppercase tracking-wide text-orange-500 font-bold">
                  Session times
                </div>
                {workoutCatalog
                  .filter((w) => selectedWorkoutIds.has(w.id))
                  .map((w) => {
                    const rows = workoutSessions
                      .map((s, idx) => ({ s, idx }))
                      .filter(({ s }) => s.workoutId === w.id);
                    return (
                      <div
                        key={w.id}
                        className="rounded-xl bg-slate-800/60 border border-slate-700 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-8 w-8 rounded-lg bg-gradient-to-br ${w.color} flex items-center justify-center text-white`}
                            >
                              <WorkoutIcon
                                name={w.icon}
                                className="h-4 w-4"
                              />
                            </div>
                            <div className="text-sm font-bold text-white">
                              {w.name}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSession(w.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 text-[11px] font-bold"
                          >
                            <Plus className="h-3 w-3" /> Add slot
                          </button>
                        </div>
                        {rows.length === 0 ? (
                          <div className="text-[11px] text-slate-500">
                            No sessions yet. Click "Add slot".
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {rows.map(({ s, idx }) => (
                              <SessionRow
                                key={idx}
                                row={s}
                                onChange={(patch) =>
                                  updateSession(idx, patch)
                                }
                                onRemove={() => removeSession(idx)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          )}

          {tab === "hours" && (
          <div className="sm:col-span-2 rounded-xl border border-orange-100 p-4 bg-white">
            <div className="text-xs uppercase tracking-wide text-orange-500 font-bold mb-3">
              Weekly hours
            </div>
            {weeklyHours.length === 0 ? (
              <div className="text-xs text-slate-500">Loading hours…</div>
            ) : (
              <div className="space-y-2">
                {weeklyHours.map((h) => (
                  <HourRow
                    key={h.dayOfWeek}
                    row={h}
                    onChange={(patch) => updateHour(h.dayOfWeek, patch)}
                  />
                ))}
                <div className="text-[11px] text-slate-500">
                  Times are local to the gym. Use 24h format.
                </div>
              </div>
            )}
          </div>
          )}
          {err && (
            <div className="sm:col-span-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {err}
            </div>
          )}
        </div>
        </div>
        <div className="px-6 py-4 border-t border-orange-100 flex items-center justify-between gap-2 bg-white">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            Changes save across all tabs at once.
          </div>
          <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save changes"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type TabId = "basics" | "media" | "amenities" | "workouts" | "hours";

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

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function minutesToHHMM(m: number): string {
  const safe = Math.max(0, Math.min(1440, Math.round(m)));
  const h = Math.floor(safe / 60);
  const mm = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map((n) => Number(n) || 0);
  return Math.max(0, Math.min(1440, h * 60 + m));
}

function SessionRow({
  row,
  onChange,
  onRemove,
}: {
  row: WorkoutSession;
  onChange: (patch: Partial<WorkoutSession>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-1.5">
      <select
        value={row.dayOfWeek}
        onChange={(e) => onChange({ dayOfWeek: Number(e.target.value) })}
        className="col-span-3 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/60"
      >
        {DAY_NAMES.map((d, i) => (
          <option key={i} value={i}>
            {d.slice(0, 3)}
          </option>
        ))}
      </select>
      <input
        type="time"
        value={minutesToHHMM(row.startMinute)}
        onChange={(e) =>
          onChange({ startMinute: hhmmToMinutes(e.target.value) })
        }
        className="col-span-3 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/60"
      />
      <input
        type="time"
        value={minutesToHHMM(row.endMinute)}
        onChange={(e) =>
          onChange({ endMinute: hhmmToMinutes(e.target.value) })
        }
        className="col-span-3 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/60"
      />
      <input
        value={row.instructor}
        onChange={(e) => onChange({ instructor: e.target.value })}
        placeholder="Coach"
        className="col-span-2 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/60"
      />
      <button
        type="button"
        onClick={onRemove}
        className="col-span-1 p-1.5 rounded-md hover:bg-slate-700 text-slate-400 flex items-center justify-center"
        aria-label="Remove slot"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function HourRow({
  row,
  onChange,
}: {
  row: {
    dayOfWeek: number;
    isClosed: boolean;
    openMinute: number;
    closeMinute: number;
  };
  onChange: (
    patch: Partial<{
      isClosed: boolean;
      openMinute: number;
      closeMinute: number;
    }>,
  ) => void;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-2">
      <div className="col-span-3 text-sm font-semibold text-slate-200">
        {DAY_NAMES[row.dayOfWeek]}
      </div>
      <label className="col-span-3 flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={row.isClosed}
          onChange={(e) => onChange({ isClosed: e.target.checked })}
          className="rounded border-slate-700 bg-slate-800"
        />
        Closed
      </label>
      <input
        type="time"
        disabled={row.isClosed}
        value={minutesToHHMM(row.openMinute)}
        onChange={(e) => onChange({ openMinute: hhmmToMinutes(e.target.value) })}
        className="col-span-3 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/60 disabled:opacity-40"
      />
      <input
        type="time"
        disabled={row.isClosed}
        value={minutesToHHMM(row.closeMinute)}
        onChange={(e) =>
          onChange({ closeMinute: hhmmToMinutes(e.target.value) })
        }
        className="col-span-3 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/60 disabled:opacity-40"
      />
    </div>
  );
}
