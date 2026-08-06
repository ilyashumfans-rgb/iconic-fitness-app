import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, X, HelpCircle } from "lucide-react";

type Faq = {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY: FormState = {
  question: "",
  answer: "",
  category: "General",
  sortOrder: 0,
  isActive: true,
};

export default function AdminFaqs() {
  const [rows, setRows] = useState<Faq[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setBusy(true);
    setErr(null);
    adminApi.faqs
      .list()
      .then((data) => setRows(data as Faq[]))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const startCreate = () => {
    setForm(EMPTY);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (row: Faq) => {
    setForm({
      question: row.question,
      answer: row.answer,
      category: row.category,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
    setEditing(row);
    setCreating(false);
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setErr("Both question and answer are required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await adminApi.faqs.update(editing.id, { ...form });
      } else {
        await adminApi.faqs.create({ ...form });
      }
      closeForm();
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Faq) => {
    if (!window.confirm(`Delete FAQ "${row.question}"?`)) return;
    try {
      await adminApi.faqs.remove(row.id);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const formOpen = creating || editing !== null;

  return (
    <AdminLayout title="FAQs & AI Knowledge">
      <div className="space-y-4">
        <AdminCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <HelpCircle className="h-4 w-4" /> FAQs & AI Knowledge
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Whatever you add here immediately teaches the AI assistant in
                the app — it answers member questions using these exact
                answers. Active FAQs are also available to the apps.
              </p>
            </div>
            <Button onClick={startCreate} size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add FAQ
            </Button>
          </div>
        </AdminCard>

        {err ? (
          <AdminCard>
            <p className="text-sm text-red-500">{err}</p>
          </AdminCard>
        ) : null}

        {formOpen ? (
          <AdminCard>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {editing ? "Edit FAQ" : "New FAQ"}
              </h3>
              <Button variant="ghost" size="icon" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid gap-3">
              <div>
                <Label>Question</Label>
                <Input
                  value={form.question}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, question: e.target.value }))
                  }
                  placeholder="e.g. Can I pause my membership?"
                />
              </div>
              <div>
                <Label>Answer (this is what the AI will say)</Label>
                <Textarea
                  rows={5}
                  value={form.answer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, answer: e.target.value }))
                  }
                  placeholder="Write the exact answer members should get."
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="General"
                  />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, isActive: v }))
                    }
                  />
                  <span className="text-sm">
                    {form.isActive ? "Active" : "Hidden"}
                  </span>
                </div>
              </div>
              <div>
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  {editing ? "Save changes" : "Add FAQ"}
                </Button>
              </div>
            </div>
          </AdminCard>
        ) : null}

        <AdminCard>
          {busy ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No FAQs yet. Add your first one — the AI starts using it right
              away.
            </p>
          ) : (
            <div className="divide-y">
              {rows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.question}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {row.category}
                      </span>
                      {!row.isActive ? (
                        <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-xs text-yellow-600">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {row.answer}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
