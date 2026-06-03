import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

type Props = {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded: (objectPaths: string[]) => void;
  className?: string;
};

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;
// Production's edge proxy can intermittently reject large request bodies with a
// 403 before they ever reach our server, and multi-MB uploads are slow (a big
// PNG can appear to "hang"). So we never pass raster images through untouched —
// every image is re-encoded down to a small, fast, reliably-accepted payload.
const TARGET_MAX_BYTES = 3 * 1024 * 1024;

// Normalise an image the user picked so the upload is small and the server will
// accept it:
// - phone/desktop formats the server rejects (HEIC, BMP, TIFF, AVIF, …) are
//   re-encoded to JPEG
// - every image is downscaled to MAX_IMAGE_DIMENSION and compressed under
//   TARGET_MAX_BYTES (quality first, then dimensions)
// - EXIF orientation is baked in so photos aren't rotated
// Only PDFs pass through untouched (size-checked).
async function prepareForUpload(file: File): Promise<File> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("This file is too large. Please pick one under 15MB.");
    }
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(
        "This image format isn't supported. Please use a JPG, PNG, or WEBP file.",
      );
    }
  }

  // Preserve transparency for PNG/WebP sources (e.g. logos with alpha);
  // photos become JPEG to keep the upload small.
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";

  const renderToBlob = (
    maxDim: number,
    type: string,
    quality: number,
  ): Promise<Blob | null> => {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process this image. Try a different file.");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  };

  try {
    let outType = keepAlpha ? "image/png" : "image/jpeg";
    let ext = keepAlpha ? "png" : "jpg";
    let dim = MAX_IMAGE_DIMENSION;
    let quality = 0.85;

    let blob = await renderToBlob(dim, outType, quality);
    if (!blob) {
      throw new Error("Could not process this image. Try a different file.");
    }

    // A transparent PNG photo can still be huge; drop to JPEG (loses alpha)
    // when it won't fit, since a reliable upload is the priority.
    if (blob.size > TARGET_MAX_BYTES && outType === "image/png") {
      outType = "image/jpeg";
      ext = "jpg";
      blob = (await renderToBlob(dim, outType, quality)) ?? blob;
    }

    // Progressively reduce quality, then dimensions, until it fits the target.
    while (blob.size > TARGET_MAX_BYTES && (quality > 0.5 || dim > 800)) {
      if (quality > 0.5) {
        quality = Math.max(0.5, quality - 0.15);
      } else {
        dim = Math.max(800, Math.round(dim * 0.8));
      }
      const next = await renderToBlob(dim, outType, quality);
      if (!next) break;
      blob = next;
    }

    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error("This image is too large. Please pick one under 15MB.");
    }
    return new File([blob], `${baseName}.${ext}`, { type: outType });
  } finally {
    bitmap.close?.();
  }
}

async function uploadOne(file: File): Promise<string> {
  const prepared = await prepareForUpload(file);
  const res = await fetch("/api/storage/uploads/inline", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": prepared.type || "application/octet-stream",
      "X-Filename": encodeURIComponent(prepared.name),
    },
    body: prepared,
  });
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // response had no JSON body; keep the status-based message
    }
    throw new Error(message);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

export default function FileUpload({
  label = "Upload image",
  accept = "image/*",
  multiple = false,
  onUploaded,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-600 disabled:opacity-60 text-white text-xs font-semibold"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          setErr(null);
          setBusy(true);
          try {
            const urls: string[] = [];
            for (const f of files) {
              urls.push(await uploadOne(f));
            }
            onUploaded(urls);
          } catch (e2: unknown) {
            setErr(e2 instanceof Error ? e2.message : "Upload failed");
          } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
          }
        }}
      />
      {err && (
        <div className="text-[11px] text-rose-400 mt-1">{err}</div>
      )}
    </div>
  );
}
