import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type YoactivAdminPackage } from "@/lib/adminApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Upload, X } from "lucide-react";
import { toast } from "sonner";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Compress raster images so uploads stay small/reliable; GIFs pass through raw.
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1280;
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

function EditContentDialog({
  pkg,
  branchId,
  onClose,
  onSaved,
}: {
  pkg: YoactivAdminPackage;
  branchId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(pkg.displayName);
  const [description, setDescription] = useState(pkg.description);
  const [imageUrl, setImageUrl] = useState(pkg.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image is too large. Please pick one under 15MB.");
      return;
    }
    setUploading(true);
    try {
      const isGif = file.type === "image/gif";
      const toUpload = isGif ? file : await compressImage(file);
      const url = await uploadInline(toUpload);
      setImageUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.yoactiv.setPackageContent(pkg.id, branchId, {
        displayName: displayName.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
      });
      toast.success(`Saved content for "${displayName.trim() || pkg.name}"`);
      onSaved();
      onClose();
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit plan content</DialogTitle>
          <DialogDescription>
            Customise how "{pkg.name}" appears to members. The price (₹
            {pkg.amountInr.toLocaleString("en-IN")}) always stays synced from
            YoActiv — members pay exactly what YoActiv charges.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="yp-name">Display name</Label>
            <Input
              id="yp-name"
              value={displayName}
              maxLength={120}
              placeholder={pkg.name}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the YoActiv name.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yp-desc">Description</Label>
            <Textarea
              id="yp-desc"
              value={description}
              maxLength={2000}
              rows={4}
              placeholder="What's included, highlights, terms…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Image</Label>
            {imageUrl ? (
              <div className="relative w-full max-w-[240px]">
                <img
                  src={imageUrl}
                  alt="Plan"
                  className="rounded-lg border w-full aspect-video object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-1.5 right-1.5 h-7 w-7"
                  onClick={() => setImageUrl("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || uploading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminYoactivPlans() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [editing, setEditing] = useState<YoactivAdminPackage | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["admin", "yoactiv", "branches"],
    queryFn: adminApi.yoactiv.branches,
  });
  const branches = branchesQuery.data ?? [];

  const packagesQuery = useQuery({
    queryKey: ["admin", "yoactiv", "packages", branchId],
    queryFn: () => adminApi.yoactiv.packages(branchId!),
    enabled: branchId !== null,
  });
  const packages = packagesQuery.data ?? [];

  const visibilityMutation = useMutation({
    // branchId travels in the mutation variables so a mid-flight branch
    // switch can't update or invalidate the wrong branch's cache.
    mutationFn: ({
      pkg,
      hidden,
      branchId: forBranch,
    }: {
      pkg: YoactivAdminPackage;
      hidden: boolean;
      branchId: number;
    }) => adminApi.yoactiv.setPackageVisibility(pkg.id, forBranch, hidden),
    onMutate: async ({ pkg, hidden, branchId: forBranch }) => {
      const key = ["admin", "yoactiv", "packages", forBranch];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<YoactivAdminPackage[]>(key);
      queryClient.setQueryData<YoactivAdminPackage[]>(key, (old) =>
        (old ?? []).map((p) => (p.id === pkg.id ? { ...p, hidden } : p)),
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error("Could not update plan visibility. Please try again.");
    },
    onSuccess: (_data, { pkg, hidden }) => {
      toast.success(
        hidden
          ? `"${pkg.name}" hidden from members`
          : `"${pkg.name}" is now visible to members`,
      );
    },
    onSettled: (_data, _err, { branchId: forBranch }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "yoactiv", "packages", forBranch],
      });
    },
  });

  const groups = useMemo(() => {
    const memberships = packages.filter((p) => !p.pt);
    const pt = packages.filter((p) => p.pt);
    return [
      { title: "Membership plans", note: "Shown in the app's package purchase flow", items: memberships },
      { title: "Personal training packages", note: "Shown in the app's trainer booking flow", items: pt },
    ].filter((g) => g.items.length > 0);
  }, [packages]);

  return (
    <AdminLayout title="YoActiv Plans">
      <AdminCard className="p-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Live plans from the YoActiv billing system for each branch. Prices
            are managed in YoActiv; here you control which plans members can
            see and buy online, and can customise each plan's display name,
            description and image.
          </p>
          <div className="max-w-sm">
            <Select
              value={branchId !== null ? String(branchId) : undefined}
              onValueChange={(v) => setBranchId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a branch" />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {branches.map((b) => (
                  <SelectItem key={b.branchId} value={String(b.branchId)}>
                    {b.gymLabel ?? b.branchName ?? `Branch ${b.branchId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {branchesQuery.isSuccess && branches.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">
              No YoActiv branches configured. Map gyms to their YoActiv Branch
              ID in Gym Management first.
            </p>
          ) : null}
        </div>

        {branchId === null ? null : packagesQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : packagesQuery.isError ? (
          <p className="text-sm text-destructive">
            Couldn't load plans for this branch. Please try again.
          </p>
        ) : packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No paid plans found for this branch in YoActiv.
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.title}>
                <div className="mb-3">
                  <h3 className="font-semibold">{group.title}</h3>
                  <p className="text-xs text-muted-foreground">{group.note}</p>
                </div>
                <div className="border rounded-lg divide-y">
                  {group.items.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="h-10 w-14 rounded-md object-cover border shrink-0"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {p.displayName || p.name}
                            {p.displayName ? (
                              <Badge variant="outline" className="ml-2 align-middle">
                                Custom name
                              </Badge>
                            ) : null}
                            {p.hidden ? (
                              <Badge variant="secondary" className="ml-2 align-middle">
                                Hidden
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {p.serviceName}
                            {p.duration ? ` · ${p.duration}` : ""}
                            {p.sessions ? ` · ${p.sessions} sessions` : ""}
                          </div>
                          {p.description ? (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {p.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="font-semibold whitespace-nowrap">
                          ₹{p.amountInr.toLocaleString("en-IN")}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {p.hidden ? "Hidden" : "Visible"}
                          </span>
                          <Switch
                            checked={!p.hidden}
                            disabled={visibilityMutation.isPending || branchId === null}
                            onCheckedChange={(checked) =>
                              branchId !== null &&
                              visibilityMutation.mutate({
                                pkg: p,
                                hidden: !checked,
                                branchId,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
      {editing && branchId !== null ? (
        <EditContentDialog
          pkg={editing}
          branchId={branchId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: ["admin", "yoactiv", "packages", branchId],
            });
          }}
        />
      ) : null}
    </AdminLayout>
  );
}
