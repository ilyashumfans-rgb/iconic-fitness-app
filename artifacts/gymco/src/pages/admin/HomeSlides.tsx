import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Youtube,
  Eye,
  EyeOff,
  Link2,
} from "lucide-react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type HomeSlide } from "@/lib/adminApi";

type Audience = "all" | "members" | "customers";

const AUDIENCE_OPTIONS: { value: Audience; label: string; hint: string }[] = [
  { value: "all", label: "Everyone", hint: "All app users" },
  {
    value: "members",
    label: "Members only",
    hint: "Anyone logged in to the app",
  },
  {
    value: "customers",
    label: "Customers only",
    hint: "Guests browsing without an account",
  },
];

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Everyone",
  members: "Members",
  customers: "Customers",
};

type Draft = {
  mediaType: "upload" | "youtube";
  kind: "image" | "gif" | "youtube";
  mediaUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  audience: Audience;
  isActive: boolean;
};

const EMPTY_DRAFT: Draft = {
  mediaType: "upload",
  kind: "image",
  mediaUrl: "",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaUrl: "",
  audience: "all",
  isActive: true,
};

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type ShortcutDraft = {
  title: string;
  mediaUrl: string;
  ctaUrl: string;
  audience: Audience;
  isActive: boolean;
};

const EMPTY_SHORTCUT: ShortcutDraft = {
  title: "",
  mediaUrl: "",
  ctaUrl: "/trainers",
  audience: "all",
  isActive: true,
};

const SHORTCUT_DESTINATIONS = [
  { value: "/trainers", label: "PT Trainers" },
  { value: "/store", label: "Store" },
  { value: "/challenges", label: "Challenges" },
  { value: "app://my-plan", label: "My Plan / Packages" },
  { value: "/gyms", label: "Branches" },
  { value: "/classes", label: "Classes" },
  { value: "/diet", label: "Diet" },
  { value: "/workouts", label: "Workouts" },
  { value: "/refer", label: "Refer & Earn" },
  { value: "/coach", label: "AI Fitness Agent" },
  { value: "/assessment", label: "Fitness Assessment" },
  { value: "/meal-plans", label: "Meal Plans" },
  { value: "/habits", label: "Habits" },
  { value: "/water", label: "Water Tracker" },
  { value: "/plans", label: "Plans" },
  { value: "/orders", label: "My Orders" },
  { value: "/invoices", label: "Invoices" },
  { value: "/notifications", label: "Notifications" },
  { value: "/complaint", label: "Complaints" },
  { value: "/faq", label: "Help & FAQs" },
] as const;

function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function youtubeThumb(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// Compress non-GIF raster images so uploads stay small and reliable.
// GIFs are uploaded untouched so animation is preserved.
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1920;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const type = keepAlpha ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, type, 0.85),
  );
  bitmap.close?.();
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${keepAlpha ? "png" : "jpg"}`, { type });
}

async function uploadInline(file: File): Promise<string> {
  const res = await fetch("/api/storage/uploads/inline", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Filename": encodeURIComponent(file.name),
    },
    body: file,
  });
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      // keep status message
    }
    throw new Error(msg);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

function SlideEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  submitLabel: string;
  onSubmit: (draft: Draft) => Promise<void>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const preview =
    draft.mediaType === "youtube"
      ? youtubeThumb(draft.mediaUrl)
      : draft.mediaUrl || null;

  const handleFile = async (file: File) => {
    setErr(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setErr("File is too large. Please pick one under 15MB.");
      return;
    }
    setUploading(true);
    try {
      const isGif = file.type === "image/gif";
      const toUpload = isGif ? file : await compressImage(file);
      const url = await uploadInline(toUpload);
      set({ mediaUrl: url, kind: isGif ? "gif" : "image" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    setErr(null);
    if (!draft.mediaUrl.trim()) {
      setErr(
        draft.mediaType === "youtube"
          ? "Paste a YouTube link."
          : "Upload an image or GIF.",
      );
      return;
    }
    if (draft.mediaType === "youtube" && !youtubeId(draft.mediaUrl)) {
      setErr("That doesn't look like a valid YouTube link.");
      return;
    }
    setBusy(true);
    try {
      const kind = draft.mediaType === "youtube" ? "youtube" : draft.kind;
      await onSubmit({ ...draft, kind });
      if (!onCancel) setDraft(EMPTY_DRAFT); // reset only for the create form
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-lime-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400";

  return (
    <div className="space-y-4">
      {/* Media type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => set({ mediaType: "upload", kind: "image" })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            draft.mediaType === "upload"
              ? "bg-lime-500 text-white border-lime-500"
              : "bg-white text-slate-600 border-lime-200"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" /> Image / GIF
        </button>
        <button
          type="button"
          onClick={() => set({ mediaType: "youtube", kind: "youtube" })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            draft.mediaType === "youtube"
              ? "bg-lime-500 text-white border-lime-500"
              : "bg-white text-slate-600 border-lime-200"
          }`}
        >
          <Youtube className="h-3.5 w-3.5" /> YouTube link
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        {/* Preview + media picker */}
        <div>
          <div className="aspect-[16/9] rounded-lg overflow-hidden bg-lime-50 border border-lime-200 flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Slide preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] text-slate-400">No media yet</span>
            )}
          </div>
          {draft.mediaType === "upload" ? (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-600 disabled:opacity-60 text-white text-xs font-semibold"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploading ? "Uploading…" : "Upload image / GIF"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {draft.kind === "gif" && draft.mediaUrl ? (
                <div className="mt-1 text-[11px] text-lime-600 font-medium">
                  Animated GIF uploaded
                </div>
              ) : null}
            </>
          ) : (
            <input
              className={`${input} mt-2`}
              placeholder="https://youtu.be/…"
              value={draft.mediaUrl}
              onChange={(e) => set({ mediaUrl: e.target.value })}
            />
          )}
        </div>

        {/* Text fields */}
        <div className="space-y-2">
          <input
            className={input}
            placeholder="Title (e.g. FITSTART DAYS)"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          <input
            className={input}
            placeholder="Subtitle (e.g. India's biggest fitness sale)"
            value={draft.subtitle}
            onChange={(e) => set({ subtitle: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={input}
              placeholder="Button label (optional)"
              value={draft.ctaLabel}
              onChange={(e) => set({ ctaLabel: e.target.value })}
            />
            <input
              className={input}
              placeholder="Button link (optional)"
              value={draft.ctaUrl}
              onChange={(e) => set({ ctaUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1">
              Who sees this slide?
            </label>
            <select
              className={input}
              value={draft.audience}
              onChange={(e) => set({ audience: e.target.value as Audience })}
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => set({ isActive: e.target.checked })}
              className="h-4 w-4 accent-lime-500"
            />
            Active (shown in the app)
          </label>
        </div>
      </div>

      {err ? <div className="text-[12px] text-rose-500">{err}</div> : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-600 disabled:opacity-60 text-white text-sm font-semibold"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-lime-200 text-slate-600 text-sm font-semibold hover:bg-lime-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ShortcutEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ShortcutDraft;
  submitLabel: string;
  onSubmit: (draft: ShortcutDraft) => Promise<void>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const input =
    "w-full rounded-lg border border-lime-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400";
  const isKnownDestination = SHORTCUT_DESTINATIONS.some(
    (destination) => destination.value === draft.ctaUrl,
  );

  const handleFile = async (file: File) => {
    setErr(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setErr("File is too large. Please pick one under 15MB.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await compressImage(file);
      const mediaUrl = await uploadInline(uploaded);
      setDraft((current) => ({ ...current, mediaUrl }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!draft.title.trim()) {
      setErr("Enter a shortcut name.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(draft);
      if (!onCancel) setDraft(EMPTY_SHORTCUT);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save shortcut");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <div>
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-lime-300 bg-lime-50 flex items-center justify-center">
            {draft.mediaUrl ? (
              <img
                src={draft.mediaUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Link2 className="h-7 w-7 text-lime-500" />
            )}
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload logo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
        <div className="space-y-3">
          <input
            className={input}
            placeholder="Shortcut name"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
          />
          <select
            className={input}
            value={isKnownDestination ? draft.ctaUrl : "__custom__"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ctaUrl:
                  event.target.value === "__custom__"
                    ? "/"
                    : event.target.value,
              }))
            }
          >
            {SHORTCUT_DESTINATIONS.map((destination) => (
              <option key={destination.value} value={destination.value}>
                {destination.label}
              </option>
            ))}
            <option value="__custom__">Custom app page…</option>
          </select>
          {!isKnownDestination ? (
            <div>
              <input
                className={input}
                placeholder="/refer or /any-app-page"
                value={draft.ctaUrl}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ctaUrl: event.target.value,
                  }))
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Enter the app page path beginning with /. Dynamic pages can
                include their ID, for example /gym/12.
              </p>
            </div>
          ) : null}
          <select
            className={input}
            value={draft.audience}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                audience: event.target.value as Audience,
              }))
            }
          >
            {AUDIENCE_OPTIONS.map((audience) => (
              <option key={audience.value} value={audience.value}>
                {audience.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-lime-500"
            />
            Active (shown in the app)
          </label>
        </div>
      </div>
      {err ? <div className="text-xs text-rose-500">{err}</div> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 rounded-lg bg-lime-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-lime-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function slideToDraft(s: HomeSlide): Draft {
  return {
    mediaType: s.kind === "youtube" ? "youtube" : "upload",
    kind: s.kind === "shortcut" ? "image" : s.kind,
    mediaUrl: s.mediaUrl,
    title: s.title,
    subtitle: s.subtitle,
    ctaLabel: s.ctaLabel,
    ctaUrl: s.ctaUrl,
    audience: s.audience,
    isActive: s.isActive,
  };
}

export default function AdminHomeSlides() {
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const slideItems = slides.filter((slide) => slide.kind !== "shortcut");
  const shortcutItems = slides.filter((slide) => slide.kind === "shortcut");

  const load = async () => {
    setErr(null);
    try {
      setSlides(await adminApi.homeSlides.list());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load slides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (draft: Draft) => {
    await adminApi.homeSlides.create({
      kind: draft.kind,
      mediaUrl: draft.mediaUrl,
      title: draft.title,
      subtitle: draft.subtitle,
      ctaLabel: draft.ctaLabel,
      ctaUrl: draft.ctaUrl,
      audience: draft.audience,
      isActive: draft.isActive,
    });
    await load();
  };

  const createShortcut = async (draft: ShortcutDraft) => {
    await adminApi.homeSlides.create({
      kind: "shortcut",
      mediaUrl: draft.mediaUrl,
      title: draft.title,
      subtitle: "",
      ctaLabel: "",
      ctaUrl: draft.ctaUrl,
      audience: draft.audience,
      isActive: draft.isActive,
    });
    await load();
  };

  const update = async (id: number, draft: Draft) => {
    await adminApi.homeSlides.update(id, {
      kind: draft.kind,
      mediaUrl: draft.mediaUrl,
      title: draft.title,
      subtitle: draft.subtitle,
      ctaLabel: draft.ctaLabel,
      ctaUrl: draft.ctaUrl,
      audience: draft.audience,
      isActive: draft.isActive,
    });
    setEditingId(null);
    await load();
  };

  const updateShortcut = async (id: number, draft: ShortcutDraft) => {
    await adminApi.homeSlides.update(id, {
      kind: "shortcut",
      mediaUrl: draft.mediaUrl,
      title: draft.title,
      subtitle: "",
      ctaLabel: "",
      ctaUrl: draft.ctaUrl,
      audience: draft.audience,
      isActive: draft.isActive,
    });
    setEditingId(null);
    await load();
  };

  const toggleActive = async (s: HomeSlide) => {
    await adminApi.homeSlides.update(s.id, { isActive: !s.isActive });
    await load();
  };

  const move = async (
    items: HomeSlide[],
    index: number,
    dir: -1 | 1,
  ) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    await Promise.all([
      adminApi.homeSlides.update(a.id, { sortOrder: b.sortOrder }),
      adminApi.homeSlides.update(b.id, { sortOrder: a.sortOrder }),
    ]);
    await load();
  };

  const remove = async (id: number, label = "item") => {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    await adminApi.homeSlides.remove(id);
    await load();
  };

  const previewFor = (s: HomeSlide) =>
    s.kind === "youtube" ? youtubeThumb(s.mediaUrl) : s.mediaUrl;

  return (
    <AdminLayout title="Home Slider">
      <div className="max-w-5xl space-y-6">
        <AdminCard className="p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Home shortcut circles
          </h2>
          <p className="text-[12px] text-slate-500 mb-4">
            Add a name and logo for the small circular links shown near the top
            of the app Home screen.
          </p>
          <ShortcutEditor
            initial={EMPTY_SHORTCUT}
            submitLabel="Add shortcut"
            onSubmit={createShortcut}
          />
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Current shortcuts
          </h2>
          {loading ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              Loading…
            </div>
          ) : (
            <div className="space-y-3">
              {shortcutItems.map((shortcut, index) => (
                <div
                  key={shortcut.id}
                  className="rounded-xl border border-lime-100 p-3"
                >
                  {editingId === shortcut.id ? (
                    <ShortcutEditor
                      initial={{
                        title: shortcut.title,
                        mediaUrl: shortcut.mediaUrl,
                        ctaUrl: shortcut.ctaUrl,
                        audience: shortcut.audience,
                        isActive: shortcut.isActive,
                      }}
                      submitLabel="Save shortcut"
                      onSubmit={(draft) =>
                        updateShortcut(shortcut.id, draft)
                      }
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-lime-200 bg-lime-50 flex items-center justify-center">
                        {shortcut.mediaUrl ? (
                          <img
                            src={shortcut.mediaUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Link2 className="h-5 w-5 text-lime-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {shortcut.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {SHORTCUT_DESTINATIONS.find(
                            (item) => item.value === shortcut.ctaUrl,
                          )?.label ?? shortcut.ctaUrl}
                          {" · "}
                          {AUDIENCE_LABEL[shortcut.audience]}
                        </div>
                      </div>
                      {!shortcut.isActive ? (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-bold">
                          hidden
                        </span>
                      ) : null}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => move(shortcutItems, index, -1)}
                          disabled={index === 0}
                          title="Move left"
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-lime-200 text-slate-500 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => move(shortcutItems, index, 1)}
                          disabled={index === shortcutItems.length - 1}
                          title="Move right"
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-lime-200 text-slate-500 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(shortcut)}
                          title={shortcut.isActive ? "Hide" : "Show"}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-lime-200 text-slate-500"
                        >
                          {shortcut.isActive ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingId(shortcut.id)}
                          className="px-3 h-8 rounded-lg border border-lime-200 text-xs font-semibold text-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(shortcut.id, "shortcut")}
                          title="Delete"
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-rose-200 text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Add a slide
          </h2>
          <p className="text-[12px] text-slate-500 mb-4">
            Upload a photo or animated GIF, or paste a YouTube link. Slides show
            in the banner at the top of the app Home screen.
          </p>
          <SlideEditor
            initial={EMPTY_DRAFT}
            submitLabel="Add slide"
            onSubmit={create}
          />
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Current slides
          </h2>
          {err ? (
            <div className="text-[12px] text-rose-500 mb-3">{err}</div>
          ) : null}
          {loading ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              Loading…
            </div>
          ) : slideItems.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              No slides yet. Add your first one above.
            </div>
          ) : (
            <div className="space-y-3">
              {slideItems.map((s, i) => {
                const preview = previewFor(s);
                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-lime-100 p-3"
                  >
                    {editingId === s.id ? (
                      <SlideEditor
                        initial={slideToDraft(s)}
                        submitLabel="Save changes"
                        onSubmit={(d) => update(s.id, d)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-28 shrink-0 aspect-[16/9] rounded-lg overflow-hidden bg-lime-50 border border-lime-100 flex items-center justify-center">
                          {preview ? (
                            <img
                              src={preview}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              no media
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {s.title || "(no title)"}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-lime-100 text-lime-700 font-bold">
                              {s.kind}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold">
                              {AUDIENCE_LABEL[s.audience]}
                            </span>
                            {!s.isActive ? (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-bold">
                                hidden
                              </span>
                            ) : null}
                          </div>
                          {s.subtitle ? (
                            <div className="text-[12px] text-slate-500 truncate">
                              {s.subtitle}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => move(slideItems, i, -1)}
                            disabled={i === 0}
                            title="Move up"
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-lime-200 text-slate-500 hover:bg-lime-50 disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => move(slideItems, i, 1)}
                            disabled={i === slideItems.length - 1}
                            title="Move down"
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-lime-200 text-slate-500 hover:bg-lime-50 disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(s)}
                            title={s.isActive ? "Hide" : "Show"}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-lime-200 text-slate-500 hover:bg-lime-50"
                          >
                            {s.isActive ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingId(s.id)}
                            className="px-3 h-8 flex items-center rounded-lg border border-lime-200 text-slate-600 text-xs font-semibold hover:bg-lime-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(s.id, "slide")}
                            title="Delete"
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
