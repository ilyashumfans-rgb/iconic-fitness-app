import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Star } from "lucide-react";
import { AdminCard, AdminLayout } from "@/components/admin/AdminLayout";
import { request } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReviewInput = {
  reviewerName: string;
  branchName: string;
  reviewText: string;
  rating: number;
  isSample: boolean;
  isPublished: boolean;
  sortOrder: number;
  trainerId: string | null;
  gymId: number | null;
};
type ModerationStatus = "pending" | "approved" | "rejected" | null;
type Review = ReviewInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
  isMemberReview: boolean;
  moderationStatus: ModerationStatus;
};
type TrainerOption = { id: string; name: string; gymId: number; branchName: string };
const EMPTY: ReviewInput = { reviewerName: "", branchName: "", reviewText: "", rating: 5, isSample: true, isPublished: true, sortOrder: 0, trainerId: null, gymId: null };
const GENERAL_REVIEW = "__general__";
const message = (error: unknown) => error instanceof Error ? error.message : "Unable to save changes. Please try again.";

export default function AdminReviews() {
  return <AdminLayout title="Reviews"><ReviewsContent /></AdminLayout>;
}

// Mount queries only after AdminLayout has verified the admin cookie.
function ReviewsContent() {
  const client = useQueryClient();
  const reviews = useQuery({
    queryKey: ["/api/admin/reviews"],
    queryFn: ({ signal }) => request<{ reviews: Review[] }>("/admin/reviews", { signal }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: 60_000,
  });
  const trainerOptions = useQuery({
    queryKey: ["/api/admin/reviews/trainers"],
    queryFn: ({ signal }) => request<{ trainers: TrainerOption[] }>("/admin/reviews/trainers", { signal }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: 60_000,
  });
  const [editor, setEditor] = useState<{ review: Review | null } | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [confirmEdit, setConfirmEdit] = useState<ReviewInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [moderatingId, setModeratingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ReviewInput>({ defaultValues: EMPTY });
  useEffect(() => { document.title = "Reviews | Iconic Fitness Admin"; }, []);

  const refresh = () => client.invalidateQueries({
    predicate: (query) => query.queryKey.some((key) => typeof key === "string" && /(?:^|\/)reviews(?:\/|$)/.test(key)),
  });
  const openEditor = (review: Review | null) => {
    form.reset(review ? {
      reviewerName: review.reviewerName, branchName: review.branchName, reviewText: review.reviewText,
      rating: review.rating, sortOrder: review.sortOrder, isSample: review.isSample, isPublished: review.isPublished,
      trainerId: review.trainerId, gymId: review.gymId,
    } : EMPTY);
    setFormError(null);
    setEditor({ review });
  };
  const save = async (values: ReviewInput) => {
    setSaving(true);
    setFormError(null);
    try {
      const memberReview = editor?.review?.isMemberReview === true;
      const body = memberReview ? {
        reviewText: values.reviewText.trim(),
        rating: values.rating,
        sortOrder: values.sortOrder,
        isPublished: values.isPublished,
      } : {
        ...values,
        reviewerName: values.reviewerName.trim(),
        branchName: values.branchName.trim(),
        reviewText: values.reviewText.trim(),
        isSample: editor?.review?.isSample ? true : values.isSample,
      };
      await request(editor?.review ? `/admin/reviews/${editor.review.id}` : "/admin/reviews", {
        method: editor?.review ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setEditor(null);
      setConfirmEdit(null);
      await refresh();
    } catch (e) {
      setConfirmEdit(null);
      setFormError(message(e));
    } finally { setSaving(false); }
  };
  const togglePublished = async (review: Review) => {
    setSaving(true);
    setError(null);
    try {
      if (review.isMemberReview && (review.moderationStatus === "pending" || review.moderationStatus === null) && !review.isPublished) {
        await request(`/admin/reviews/${review.id}/moderation`, {
          method: "POST",
          body: JSON.stringify({ status: "approved" }),
        });
      }
      const { reviewerName, branchName, reviewText, rating, isSample, sortOrder, trainerId, gymId } = review;
      await request(`/admin/reviews/${review.id}`, {
        method: "PUT",
        body: JSON.stringify({ reviewerName, branchName, reviewText, rating, isSample, sortOrder, trainerId, gymId, isPublished: !review.isPublished }),
      });
      await refresh();
    } catch (e) { setError(message(e)); }
    finally { setSaving(false); }
  };
  const moderate = async (review: Review, status: Exclude<ModerationStatus, null | "pending">) => {
    setModeratingId(review.id);
    setError(null);
    try {
      await request(`/admin/reviews/${review.id}/moderation`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (e) { setError(message(e)); }
    finally { setModeratingId(null); }
  };
  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    setError(null);
    try {
      await request(`/admin/reviews/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      await refresh();
    } catch (e) { setError(message(e)); }
    finally { setSaving(false); }
  };
  const rows = [...(reviews.data?.reviews ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const trainers = trainerOptions.data?.trainers ?? [];
  const selectedTrainerId = form.watch("trainerId");
  const selectedGymId = form.watch("gymId");
  const selectedTrainerKey = selectedTrainerId ? `${selectedGymId}:${selectedTrainerId}` : GENERAL_REVIEW;
  const selectedTrainer = selectedTrainerId ? trainers.find((trainer) => trainer.id === selectedTrainerId && trainer.gymId === selectedGymId) : undefined;
  const trainerLabel = (review: Review) => {
    if (!review.trainerId) return "General / branch review";
    const trainer = trainers.find((option) => option.id === review.trainerId && option.gymId === review.gymId);
    return trainer ? `Trainer: ${trainer.name}` : `Trainer: unavailable (${review.trainerId})`;
  };
  const moderationLabel = (review: Review) => {
    if (!review.isMemberReview) return null;
    const status = review.moderationStatus ?? "pending";
    const tone = status === "approved" ? "bg-lime-100 text-lime-800" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800";
    return <span data-testid={`status-review-moderation-${review.id}`} className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>Member submission · {status}</span>;
  };
  const selectTrainer = (trainerId: string) => {
    if (trainerId === GENERAL_REVIEW) {
      form.setValue("trainerId", null, { shouldDirty: true, shouldValidate: true });
      form.setValue("gymId", null, { shouldDirty: true, shouldValidate: true });
      return;
    }
    const trainer = trainers.find((option) => `${option.gymId}:${option.id}` === trainerId);
    if (!trainer) return;
    form.setValue("trainerId", trainer.id, { shouldDirty: true, shouldValidate: true });
    form.setValue("gymId", trainer.gymId, { shouldDirty: true, shouldValidate: true });
    form.setValue("branchName", trainer.branchName, { shouldDirty: true, shouldValidate: true });
  };

  return <div className="space-y-5">
    <AdminCard className="p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">Branch reviews</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Moderate member submissions and manage reviews shown in the app. Pending member reviews require approval before publishing.</p>
        </div>
        <Button data-testid="button-add-review" onClick={() => openEditor(null)} disabled={saving}><Plus className="mr-2 h-4 w-4" />Add review</Button>
      </div>
    </AdminCard>
    {error && !deleting && <p role="alert" data-testid="error-review-action" className="text-sm text-red-600">{error}</p>}
    <AdminCard className="p-5">
      {reviews.isLoading ? <div role="status" data-testid="status-reviews-loading" className="flex items-center justify-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Loading reviews…</div>
        : reviews.isError ? <div role="alert" data-testid="error-reviews-loading" className="space-y-3 py-6 text-center"><p>{message(reviews.error)}</p><Button data-testid="button-retry-reviews" variant="outline" onClick={() => void reviews.refetch()}>Retry</Button></div>
        : rows.length === 0 ? <p data-testid="text-reviews-empty" className="py-10 text-center text-muted-foreground">No reviews yet. Add a clearly labeled sample or genuine feedback shared with permission.</p>
        : <div className="divide-y">{rows.map((review) => <article key={review.id} data-testid={`review-${review.id}`} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 xl:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold break-words">{review.reviewerName}</h3>
              {moderationLabel(review)}
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${review.isSample ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>{review.isSample ? "Sample review · illustrative" : "Genuine review"}</span>
              <span className={`rounded-full px-2 py-1 text-xs ${review.isPublished ? "bg-lime-100 text-lime-800" : "bg-slate-100 text-slate-600"}`}>{review.isPublished ? "Published" : "Hidden"}</span>
            </div>
            <p className="mt-2 break-words text-sm text-muted-foreground">{review.branchName} · {trainerLabel(review)} · Order {review.sortOrder}</p>
            <div aria-label={`${review.rating} out of 5 stars`} className="my-2 flex items-center gap-1 text-amber-500">{[1, 2, 3, 4, 5].map((star) => <Star key={star} aria-hidden className={`h-4 w-4 ${star <= review.rating ? "fill-current" : ""}`} />)}<span className="ml-1 text-xs text-muted-foreground">{review.rating}/5</span></div>
            <blockquote className="whitespace-pre-wrap break-words text-sm leading-relaxed">“{review.reviewText}”</blockquote>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {review.isMemberReview && review.moderationStatus !== "approved" && <Button data-testid={`button-approve-review-${review.id}`} size="sm" disabled={saving || moderatingId === review.id} onClick={() => void moderate(review, "approved")}>{moderatingId === review.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve</Button>}
            {review.isMemberReview && review.moderationStatus !== "rejected" && <Button data-testid={`button-reject-review-${review.id}`} size="sm" variant="outline" className="border-red-200 text-red-700" disabled={saving || moderatingId === review.id} onClick={() => void moderate(review, "rejected")}>Reject</Button>}
            <Button data-testid={`button-publish-review-${review.id}`} size="sm" variant="outline" disabled={saving || moderatingId !== null || (review.isMemberReview && review.moderationStatus === "rejected" && !review.isPublished)} title={review.isMemberReview && review.moderationStatus === "rejected" ? "Approve this submission before publishing it." : undefined} onClick={() => void togglePublished(review)}>{review.isPublished ? "Hide" : "Publish"}</Button>
            <Button data-testid={`button-edit-review-${review.id}`} size="sm" variant="outline" disabled={saving} onClick={() => openEditor(review)}>Edit</Button>
            <Button data-testid={`button-delete-review-${review.id}`} size="sm" variant="outline" className="text-red-600" disabled={saving} onClick={() => { setError(null); setDeleting(review); }}>Delete</Button>
          </div>
        </article>)}</div>}
    </AdminCard>

    <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !saving) { setEditor(null); setConfirmEdit(null); } }}>
      <DialogContent className="theme-portal max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{editor?.review ? "Edit review" : "Add review"}</DialogTitle><DialogDescription>Published reviews appear in the app. Lower sort orders appear first.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => editor?.review ? setConfirmEdit(values) : void save(values))}>
            <fieldset disabled={saving} className="space-y-4">
              <div>
                <Label htmlFor="review-reviewerName">Reviewer name</Label>
                <Input id="review-reviewerName" data-testid="input-review-reviewerName" maxLength={100} disabled={!!editor?.review?.isMemberReview} {...form.register("reviewerName", { required: "Required", validate: (v) => !!v.trim() || "Required" })} />
                {form.formState.errors.reviewerName && <p role="alert" className="text-sm text-red-600">{form.formState.errors.reviewerName.message}</p>}
              </div>
              <div>
                <Label htmlFor="review-trainer">Trainer assignment</Label>
                <select
                  id="review-trainer"
                  data-testid="select-review-trainer"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedTrainerKey}
                  onChange={(event) => selectTrainer(event.target.value)}
                  disabled={saving || trainerOptions.isLoading || !!editor?.review?.isMemberReview}
                >
                  <option value={GENERAL_REVIEW}>General / branch review</option>
                  {selectedTrainerId && !selectedTrainer && (
                    <option value={selectedTrainerKey}>
                      {trainerOptions.isLoading ? `Current trainer (${selectedTrainerId})` : `Unavailable / retired trainer (${selectedTrainerId})`}
                    </option>
                  )}
                  {trainers.map((trainer) => <option key={`${trainer.gymId}:${trainer.id}`} value={`${trainer.gymId}:${trainer.id}`}>{trainer.name} — {trainer.branchName}</option>)}
                </select>
                {trainerOptions.isError && <p role="alert" className="mt-1 text-sm text-red-600">Trainer choices could not be refreshed. The current assignment will be kept unless you choose General / branch review.</p>}
              </div>
              <div>
                <Label htmlFor="review-branchName">Branch name</Label>
                <Input
                  id="review-branchName"
                  data-testid="input-review-branchName"
                  maxLength={150}
                  readOnly={!!selectedTrainerId}
                  disabled={!!editor?.review?.isMemberReview}
                  aria-describedby={selectedTrainerId ? "review-branch-help" : undefined}
                  {...form.register("branchName", { required: "Required", validate: (v) => !!v.trim() || "Required" })}
                />
                {selectedTrainerId && <p id="review-branch-help" className="mt-1 text-xs text-muted-foreground">The branch is set by the selected trainer.</p>}
                {form.formState.errors.branchName && <p role="alert" className="text-sm text-red-600">{form.formState.errors.branchName.message}</p>}
              </div>
              <div><Label htmlFor="review-text">Review quote</Label><Textarea id="review-text" data-testid="input-review-text" rows={4} maxLength={2000} {...form.register("reviewText", { required: "Review text is required", validate: (v) => !!v.trim() || "Review text is required" })} />{form.formState.errors.reviewText && <p role="alert" className="text-sm text-red-600">{form.formState.errors.reviewText.message}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="review-rating">Rating (1–5 stars)</Label><Input id="review-rating" data-testid="input-review-rating" type="number" min={1} max={5} step={1} {...form.register("rating", { valueAsNumber: true, min: 1, max: 5, validate: Number.isInteger })} />{form.formState.errors.rating && <p role="alert" className="text-sm text-red-600">Choose a whole number from 1 to 5.</p>}</div>
                <div><Label htmlFor="review-order">Sort order</Label><Input id="review-order" data-testid="input-review-order" type="number" step={1} {...form.register("sortOrder", { valueAsNumber: true, validate: Number.isInteger })} />{form.formState.errors.sortOrder && <p role="alert" className="text-sm text-red-600">Enter a whole number.</p>}</div>
              </div>
               <label className="flex items-center gap-2 text-sm"><input data-testid="checkbox-review-published" type="checkbox" {...form.register("isPublished")} disabled={!!editor?.review?.isMemberReview && editor.review.moderationStatus !== "approved"} />Published in app</label>
               <label className="flex items-center gap-2 text-sm"><input data-testid="checkbox-review-sample" type="checkbox" {...form.register("isSample")} disabled={saving || !!editor?.review?.isSample || !!editor?.review?.isMemberReview} />Sample review (illustrative)</label>
               <p className="text-xs text-muted-foreground">{editor?.review?.isMemberReview ? "Member author, branch, trainer assignment, and submission type are fixed. You may correct the review text or rating." : editor?.review?.isSample ? "Existing sample reviews cannot be converted to genuine feedback. Create a separate review for real feedback." : "Only turn off the sample label for real customer feedback you have permission to publish."}</p>
            </fieldset>
            {formError && <p role="alert" data-testid="error-review-form" className="text-sm text-red-600">{formError}</p>}
            <DialogFooter><Button data-testid="button-cancel-review" type="button" variant="outline" disabled={saving} onClick={() => setEditor(null)}>Cancel</Button><Button data-testid="button-save-review" type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editor?.review ? "Save changes" : "Create review"}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmEdit !== null} onOpenChange={(open) => { if (!open && !saving) setConfirmEdit(null); }}>
      <DialogContent className="theme-portal"><DialogHeader><DialogTitle>Save review changes?</DialogTitle><DialogDescription>Changes to published reviews will also update what members see in the app.</DialogDescription></DialogHeader><DialogFooter><Button data-testid="button-cancel-review-edit" variant="outline" disabled={saving} onClick={() => setConfirmEdit(null)}>Back to editing</Button><Button data-testid="button-confirm-review-edit" disabled={saving} onClick={() => { if (confirmEdit) void save(confirmEdit); }}>{saving ? "Saving…" : "Confirm changes"}</Button></DialogFooter></DialogContent>
    </Dialog>
    <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open && !saving) setDeleting(null); }}>
      <DialogContent className="theme-portal"><DialogHeader><DialogTitle>Delete review?</DialogTitle><DialogDescription>Delete the review by {deleting?.reviewerName} for {deleting?.branchName}? This cannot be undone and removes it from the app.</DialogDescription></DialogHeader>{error && <p role="alert" data-testid="error-review-delete" className="text-sm text-red-600">{error}</p>}<DialogFooter><Button data-testid="button-cancel-review-delete" variant="outline" disabled={saving} onClick={() => setDeleting(null)}>Cancel</Button><Button data-testid="button-confirm-review-delete" variant="destructive" disabled={saving} onClick={() => void remove()}>{saving ? "Deleting…" : "Delete review"}</Button></DialogFooter></DialogContent>
    </Dialog>
  </div>;
}