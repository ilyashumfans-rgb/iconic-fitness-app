import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

type Props = {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded: (objectPaths: string[]) => void;
  className?: string;
};

async function uploadOne(file: File): Promise<string> {
  const reqRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!reqRes.ok) {
    throw new Error(`Failed to get upload URL (${reqRes.status})`);
  }
  const { uploadURL, objectPath } = (await reqRes.json()) as {
    uploadURL: string;
    objectPath: string;
  };
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }
  return `/api/storage${objectPath}`;
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
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-semibold"
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
