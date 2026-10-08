import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, Info, Layers, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  getListAdminCoachCategoriesQueryKey, useCreateAdminCoachCategory, useDeleteAdminCoachCategory,
  useListAdminCoachCategories, useReorderAdminCoachCategories, useUpdateAdminCoachCategory,
  type CoachCategory, type CoachCategoryInput,
} from "@workspace/api-client-react";
import { AdminCard, AdminLayout } from "@/components/admin/AdminLayout";
import { CoachCategoryEditor } from "@/components/admin/coach-categories/CoachCategoryEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const errorMessage = (e: unknown) => {
  const data = (e as { data?: { error?: string } } | null)?.data;
  return data?.error ?? (e instanceof Error ? e.message : "Unable to complete this request.");
};
const toInput = (c: CoachCategory): CoachCategoryInput => ({ title: c.title, summary: c.summary, benefits: c.benefits, details: c.details, imageUrl: c.imageUrl, published: c.published });

export default function AdminCoachCategories() {
  return <AdminLayout title="Coach Categories"><Content /></AdminLayout>;
}

function Content() {
  const client = useQueryClient();
  const query = useListAdminCoachCategories();
  const create = useCreateAdminCoachCategory();
  const update = useUpdateAdminCoachCategory();
  const remove = useDeleteAdminCoachCategory();
  const reorder = useReorderAdminCoachCategories();
  const [editing, setEditing] = useState<CoachCategory | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const categories = query.data ?? [];
  useEffect(() => { document.title = "Coach Categories | Iconic Fitness Admin"; }, []);
  const refresh = () => client.invalidateQueries({ queryKey: getListAdminCoachCategoriesQueryKey() });
  const busy = update.isPending || remove.isPending || reorder.isPending;

  const save = (input: CoachCategoryInput) => {
    setFormError(null);
    const done = { onSuccess: () => { setEditing(null); void refresh(); }, onError: (e: unknown) => setFormError(errorMessage(e)) };
    if (editing === "new") create.mutate({ data: input }, done);
    else if (editing) update.mutate({ categoryId: editing.id, data: input }, done);
  };
  const toggle = (c: CoachCategory) => { setRowError(null); update.mutate({ categoryId: c.id, data: { ...toInput(c), published: !c.published } }, { onSuccess: () => void refresh(), onError: (e) => setRowError(errorMessage(e)) }); };
  const del = (c: CoachCategory) => {
    if (!window.confirm(`Delete "${c.title}"? Coaches assigned to it will be unlinked at every branch.`)) return;
    setRowError(null);
    remove.mutate({ categoryId: c.id }, { onSuccess: () => void refresh(), onError: (e) => setRowError(errorMessage(e)) });
  };
  const move = (index: number, delta: number) => {
    const ids = categories.map(c => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setRowError(null);
    reorder.mutate({ data: { ids } }, {
      onSuccess: (rows) => client.setQueryData(getListAdminCoachCategoriesQueryKey(), rows),
      onError: (e) => { setRowError(errorMessage(e)); void refresh(); },
    });
  };

  return <div className="space-y-5">
    <AdminCard className="p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-lg font-semibold">Get a Coach categories</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Cards members see on the app's Get a Coach tab. Order here is the order shown.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label="Refresh categories" data-testid="button-refresh-categories" onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button>
          <Button data-testid="button-add-category" onClick={() => { setFormError(null); setEditing("new"); }}><Plus className="mr-2 h-4 w-4" />Add category</Button>
        </div>
      </div>
      <div className="mt-4 flex gap-3 rounded-xl border border-lime-200 bg-lime-50 p-4 text-sm text-lime-900" data-testid="text-category-help">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Coaches appear in a category <strong>only at the branch where you linked them</strong>. Link coaches from <a href="/admin/trainer-profiles" className="font-medium underline">Trainer Profiles</a> (pick trainer + branch, tick categories). Unlinked coaches never show under a category, and hidden categories disappear from the app immediately.</p>
      </div>
    </AdminCard>

    {rowError && <p role="alert" className="text-sm text-red-600" data-testid="error-category-action">{rowError}</p>}

    {query.isLoading ? <div className="space-y-3" data-testid="status-categories-loading">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      : query.isError ? <AdminCard className="space-y-3 p-8 text-center"><p role="alert" data-testid="error-categories">{errorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()} data-testid="button-retry-categories">Retry</Button></AdminCard>
      : categories.length === 0 ? <AdminCard className="flex flex-col items-center gap-3 p-12 text-center" data-testid="text-categories-empty">
        <Layers className="h-10 w-10 text-lime-600" />
        <p className="font-medium">No categories yet</p>
        <p className="max-w-md text-sm text-muted-foreground">The app shows an honest "coming soon" state until you add and publish a category, e.g. Personal Training or Online Training.</p>
        <Button onClick={() => setEditing("new")} data-testid="button-add-first-category"><Plus className="mr-2 h-4 w-4" />Add the first category</Button>
      </AdminCard>
      : <ol className="space-y-3">
        {categories.map((c, i) => <li key={c.id}>
          <AdminCard className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${c.published ? "" : "opacity-70"}`} data-testid={`card-category-${c.id}`}>
            <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl bg-lime-50 sm:w-32">
              {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Layers className="h-6 w-6 text-lime-600" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold" data-testid={`text-category-title-${c.id}`}>{c.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.published ? "bg-lime-100 text-lime-800" : "bg-slate-100 text-slate-600"}`} data-testid={`status-category-${c.id}`}>{c.published ? "Published" : "Hidden"}</span>
                {c.networkCoach && <a href="/admin/network-coach" className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-lime-300" data-testid={`badge-network-${c.id}`}>Online · all branches</a>}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary || "No description."}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.benefits.length} benefit{c.benefits.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="icon" variant="ghost" aria-label={`Move ${c.title} up`} disabled={busy || i === 0} onClick={() => move(i, -1)} data-testid={`button-move-up-${c.id}`}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label={`Move ${c.title} down`} disabled={busy || i === categories.length - 1} onClick={() => move(i, 1)} data-testid={`button-move-down-${c.id}`}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label={c.published ? `Hide ${c.title}` : `Publish ${c.title}`} disabled={busy} onClick={() => toggle(c)} data-testid={`button-toggle-${c.id}`}>{c.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
              <Button size="icon" variant="ghost" aria-label={`Edit ${c.title}`} onClick={() => { setFormError(null); setEditing(c); }} data-testid={`button-edit-${c.id}`}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label={`Delete ${c.title}`} disabled={busy} onClick={() => del(c)} data-testid={`button-delete-${c.id}`}>{remove.isPending && remove.variables?.categoryId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}</Button>
            </div>
          </AdminCard>
        </li>)}
      </ol>}

    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{editing === "new" ? "New category" : "Edit category"}</DialogTitle></DialogHeader>
        {editing !== null && <CoachCategoryEditor category={editing === "new" ? null : editing} saving={create.isPending || update.isPending} error={formError} onSave={save} onCancel={() => setEditing(null)} />}
      </DialogContent>
    </Dialog>
  </div>;
}
