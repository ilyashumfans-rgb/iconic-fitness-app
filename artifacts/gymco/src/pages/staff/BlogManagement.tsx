import { useEffect, useState } from "react";
import { StaffLayout, StaffCard, PermissionGate } from "@/components/staff/StaffLayout";
import { staffApi } from "@/lib/staffApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Trash2, X, BookOpen } from "lucide-react";
import FileUpload from "@/components/FileUpload";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  videoUrl: string;
  author: string;
  category: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
};

type FormState = {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  videoUrl: string;
  author: string;
  category: string;
  isPublished: boolean;
};

const EMPTY: FormState = {
  title: "",
  excerpt: "",
  content: "",
  coverImage: "",
  videoUrl: "",
  author: "Iconic Fitness Team",
  category: "Fitness",
  isPublished: true,
};

function StaffBlogManagementInner() {
  const [rows, setRows] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setBusy(true);
    setErr(null);
    staffApi.blogs
      .list()
      .then((r) => setRows(r as Post[]))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY);
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (p: Post) => {
    setForm({
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      coverImage: p.coverImage,
      videoUrl: p.videoUrl ?? "",
      author: p.author,
      category: p.category,
      isPublished: p.isPublished,
    });
    setEditing(p);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await staffApi.blogs.update(editing.id, form);
      } else {
        await staffApi.blogs.create(form);
      }
      close();
      load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Post) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try {
      await staffApi.blogs.remove(p.id);
      load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  return (
    <StaffLayout title="Blog Posts">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <BookOpen className="h-4 w-4" />
          {rows.length} {rows.length === 1 ? "post" : "posts"}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> New post
        </Button>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <StaffCard className="p-6">
        {busy ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No blog posts yet. Click <strong>New post</strong> to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {p.coverImage ? (
                    <img
                      src={p.coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lime-600 bg-lime-50 px-2 py-0.5 rounded">
                      {p.category}
                    </span>
                    {!p.isPublished && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 truncate">
                    {p.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">
                    {p.excerpt}
                  </p>
                  <div className="text-xs text-slate-400 mt-1">
                    /{p.slug} • by {p.author}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => remove(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </StaffCard>

      {(creating || editing) && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold">
                {editing ? "Edit post" : "New post"}
              </h2>
              <button
                onClick={close}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="5 tips for a better workout"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Author</Label>
                  <Input
                    value={form.author}
                    onChange={(e) =>
                      setForm({ ...form, author: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Cover image</Label>
                  <FileUpload
                    label={form.coverImage ? "Replace image" : "Upload image"}
                    accept="image/*"
                    onUploaded={(paths) => {
                      if (paths[0])
                        setForm({ ...form, coverImage: paths[0] });
                    }}
                  />
                </div>
                <Input
                  value={form.coverImage}
                  onChange={(e) =>
                    setForm({ ...form, coverImage: e.target.value })
                  }
                  placeholder="Paste a URL or upload an image"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  JPG, PNG, WebP up to 15 MB. Recommended 1600×900.
                </p>
                {form.coverImage && (
                  <div className="mt-2 relative w-full max-w-xs">
                    <img
                      src={form.coverImage}
                      alt="Cover preview"
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      aria-label="Remove cover image"
                      onClick={() => setForm({ ...form, coverImage: "" })}
                      className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <Label>Excerpt</Label>
                <Textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm({ ...form, excerpt: e.target.value })
                  }
                  placeholder="One-line summary shown in cards"
                />
              </div>
              <div>
                <Label>YouTube video link (optional)</Label>
                <Input
                  value={form.videoUrl}
                  onChange={(e) =>
                    setForm({ ...form, videoUrl: e.target.value })
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Readers can play this video right on the article page.
                </p>
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  rows={10}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  placeholder="Full article body (plain text or markdown)"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm({ ...form, isPublished: e.target.checked })
                  }
                />
                Published (visible to users)
              </label>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={saving || !form.title.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editing ? "Save changes" : "Create post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}

export default function StaffBlogManagement() {
  return (
    <PermissionGate perm="blog.manage">
      <StaffBlogManagementInner />
    </PermissionGate>
  );
}
