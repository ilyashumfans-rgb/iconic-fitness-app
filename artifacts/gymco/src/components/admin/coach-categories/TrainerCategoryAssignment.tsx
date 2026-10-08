import { useEffect, useState } from "react";
import { Info, Loader2, Save } from "lucide-react";
import {
  getGetAdminTrainerCategoriesQueryKey, useGetAdminTrainerCategories, useListAdminCoachCategories, useUpdateAdminTrainerCategories,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminCard } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** Category links for one exact upstream trainer ID at one branch. Saved independently of the profile form. */
export function TrainerCategoryAssignment({ trainerId, gymId, trainerName, branchName }: { trainerId: string; gymId: number; trainerName: string; branchName: string }) {
  const client = useQueryClient();
  const params = { gymId };
  const categoriesQuery = useListAdminCoachCategories();
  const assignmentQuery = useGetAdminTrainerCategories(trainerId, params, { query: { queryKey: getGetAdminTrainerCategoriesQueryKey(trainerId, params), staleTime: 0, retry: false } });
  const mutation = useUpdateAdminTrainerCategories();
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const serverIds = assignmentQuery.data?.categoryIds;
  useEffect(() => { setSelected(serverIds ?? []); setStatus(null); }, [serverIds, trainerId, gymId]);
  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...(serverIds ?? [])].sort());
  const categories = categoriesQuery.data ?? [];

  const save = () => {
    setStatus(null);
    mutation.mutate({ trainerId, params, data: { categoryIds: selected } }, {
      onSuccess: (data) => { client.setQueryData(getGetAdminTrainerCategoriesQueryKey(trainerId, params), data); setStatus({ ok: true, text: "Categories saved." }); },
      onError: (e) => setStatus({ ok: false, text: (e as { data?: { error?: string } }).data?.error ?? "Could not save categories." }),
    });
  };

  return <AdminCard className="p-5" data-testid="panel-trainer-categories">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h3 className="font-semibold">Get a Coach categories</h3>
        <p className="text-sm text-muted-foreground">Where {trainerName} appears in the app — at <strong>{branchName}</strong> only.</p>
      </div>
      <Button type="button" size="sm" onClick={save} disabled={!dirty || mutation.isPending || assignmentQuery.isLoading} data-testid="button-save-trainer-categories">
        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save categories
      </Button>
    </div>
    <p className="mt-3 flex gap-2 rounded-lg bg-lime-50 p-3 text-xs text-lime-900"><Info className="h-4 w-4 shrink-0" />Coaches appear only at the linked branch. If this coach also works elsewhere, select that branch above and link it separately.</p>
    {categoriesQuery.isLoading || assignmentQuery.isLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" data-testid="status-trainer-categories-loading"><Loader2 className="h-4 w-4 animate-spin" />Loading categories…</div>
      : categoriesQuery.isError || assignmentQuery.isError ? <div className="mt-4 flex items-center gap-3 text-sm"><span role="alert" className="text-red-600">Could not load categories.</span><Button type="button" size="sm" variant="outline" onClick={() => { void categoriesQuery.refetch(); void assignmentQuery.refetch(); }} data-testid="button-retry-trainer-categories">Retry</Button></div>
      : categories.length === 0 ? <p className="mt-4 text-sm text-muted-foreground" data-testid="text-no-categories">No categories yet. <a className="font-medium text-lime-700 underline" href="/admin/coach-categories">Create one</a> first.</p>
      : <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(c => <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-lime-50/50" data-testid={`option-trainer-category-${c.id}`}>
          <Checkbox checked={selected.includes(c.id)} onCheckedChange={(v) => setSelected(s => v ? [...s, c.id] : s.filter(x => x !== c.id))} data-testid={`checkbox-trainer-category-${c.id}`} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
          {!c.published && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">Hidden</span>}
        </label>)}
      </div>}
    {status && <p role={status.ok ? "status" : "alert"} className={`mt-3 text-sm ${status.ok ? "text-lime-700" : "text-red-600"}`} data-testid="status-trainer-categories">{status.text}</p>}
  </AdminCard>;
}
