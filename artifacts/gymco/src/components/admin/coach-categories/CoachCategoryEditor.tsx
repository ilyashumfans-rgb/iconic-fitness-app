import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, X } from "lucide-react";
import type { CoachCategory, CoachCategoryInput } from "@workspace/api-client-react";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type EditorForm = Omit<CoachCategoryInput, "benefits"> & { benefitsText: string };
const toForm = (c?: CoachCategory | null): EditorForm => ({
  title: c?.title ?? "", summary: c?.summary ?? "", details: c?.details ?? "",
  imageUrl: c?.imageUrl ?? "", published: c?.published ?? false, benefitsText: (c?.benefits ?? []).join("\n"),
});

export function CoachCategoryEditor({ category, saving, error, onSave, onCancel }: {
  category: CoachCategory | null;
  saving: boolean;
  error: string | null;
  onSave: (input: CoachCategoryInput) => void;
  onCancel: () => void;
}) {
  const form = useForm<EditorForm>({ defaultValues: toForm(category) });
  useEffect(() => { form.reset(toForm(category)); }, [category, form]);
  const imageUrl = form.watch("imageUrl");
  const published = form.watch("published");
  const submit = (v: EditorForm) => onSave({
    title: v.title.trim(), summary: v.summary.trim(), details: v.details.trim(), imageUrl: v.imageUrl.trim(), published: v.published,
    benefits: v.benefitsText.split("\n").map(s => s.trim()).filter(Boolean),
  });

  return <Form {...form}>
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5" data-testid="form-coach-category">
      <div className="overflow-hidden rounded-2xl border bg-lime-50">
        {imageUrl ? <img src={imageUrl} alt="" data-testid="img-category-preview" className="h-44 w-full object-cover" />
          : <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No header image</div>}
        <div className="flex flex-wrap gap-2 border-t bg-background p-3">
          <FileUpload label="Upload header image" accept="image/*" onUploaded={([url]) => form.setValue("imageUrl", url, { shouldDirty: true })} />
          {imageUrl && <Button type="button" size="sm" variant="outline" data-testid="button-clear-category-image" onClick={() => form.setValue("imageUrl", "", { shouldDirty: true })}>Clear</Button>}
        </div>
      </div>
      <div>
        <Label htmlFor="category-title">Title</Label>
        <Input id="category-title" data-testid="input-category-title" maxLength={80} placeholder="e.g. Online Training" {...form.register("title", { required: "Title is required." })} />
        {form.formState.errors.title && <p className="mt-1 text-xs text-red-600">{form.formState.errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="category-summary">Short description</Label>
        <Textarea id="category-summary" data-testid="input-category-summary" rows={3} maxLength={500} placeholder="Shown on the card under the title." {...form.register("summary")} />
      </div>
      <div>
        <Label htmlFor="category-benefits">Benefits</Label>
        <Textarea id="category-benefits" data-testid="input-category-benefits" rows={4} placeholder="One benefit per line (max 12)" {...form.register("benefitsText")} />
        <p className="mt-1 text-xs text-muted-foreground">Only describe what your branches genuinely offer — no prices or promises here.</p>
      </div>
      <div>
        <Label htmlFor="category-details">"Know more" details</Label>
        <Textarea id="category-details" data-testid="input-category-details" rows={6} maxLength={5000} placeholder="Longer read-only copy shown when members tap Know more." {...form.register("details")} />
      </div>
      <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <span><span className="block text-sm font-medium">Published</span><span className="text-xs text-muted-foreground">Hidden categories never appear in the app.</span></span>
        <Switch data-testid="switch-category-published" checked={published} onCheckedChange={(v) => form.setValue("published", v, { shouldDirty: true })} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600" data-testid="error-category-save">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} data-testid="button-cancel-category"><X className="mr-2 h-4 w-4" />Cancel</Button>
        <Button type="submit" disabled={saving} data-testid="button-save-category">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{category ? "Save changes" : "Create category"}</Button>
      </div>
    </form>
  </Form>;
}
