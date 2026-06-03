import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

type Props = {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded: (objectPaths: string[]) => void;
  className?: string;
};

// Formats the server stores and that browsers can reliably display.
const SERVER_OK_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;

// Normalise an image the user picked so the server will accept it:
// - phone/desktop formats the server rejects (HEIC, BMP, TIFF, AVIF, …) are
//   re-encoded to JPEG
// - oversized images (too many megapixels or > 15MB) are downscaled
// - EXIF orientation is baked in so photos aren't rotated
// PDFs and already-supported, reasonably-sized images pass through untouched.
async function prepareForUpload(file: File): Promise<File> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("This file is too large. Please pick one under 15MB.");
    }
    return file;
  }

  const alreadyOk = SERVER_OK_TYPES.includes(file.type);
  if (alreadyOk && file.size <= MAX_UPLOAD_BYTES) return file;

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

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not process this image. Try a different file.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // Preserve transparency for PNG/WebP sources (e.g. logos with alpha);
  // everything else (photos, HEIC, BMP, TIFF…) becomes JPEG to keep size down.
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const outType = keepAlpha ? "image/png" : "image/jpeg";
  const ext = keepAlpha ? "png" : "jpg";

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outType, 0.9),
  );
  if (!blob) {
    throw new Error("Could not process this image. Try a different file.");
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("This image is too large. Please pick one under 15MB.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, { type: outType });
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
