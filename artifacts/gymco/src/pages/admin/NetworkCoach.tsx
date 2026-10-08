import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Video, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getGetAdminNetworkCoachSettingsQueryKey, getListAdminNetworkCoachBookingsQueryKey,
  useGetNetworkCoachOverview, getListAdminNetworkCoachSlotsQueryKey, useListAdminNetworkCoachSlots,
  useCreateAdminNetworkCoachSlots, useDeleteAdminNetworkCoachSlot,
  useCompleteAdminNetworkCoachBooking, useGetAdminNetworkCoachSettings, useListAdminNetworkCoachBookings,
  useResolveAdminNetworkCoachRefund, useSetAdminNetworkCoachCategory, useUpdateAdminNetworkCoachPrices,
  useCreateAdminNetworkCoachPlan, useUpdateAdminNetworkCoachPlan, useDeleteAdminNetworkCoachPlan,
  getListAdminNetworkCoachPlanPurchasesQueryKey, useListAdminNetworkCoachPlanPurchases, useResolveAdminNetworkCoachPlanRefund,
  type NetworkCoachBooking, type NetworkCoachPrices, type NetworkCoachPlan, type NetworkCoachPlanInput, type NetworkCoachPlanPurchase, type AdminNetworkCoachSlot,
} from "@workspace/api-client-react";
import { AdminCard, AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const errorMessage = (e: unknown) => (e as { data?: { error?: string } } | null)?.data?.error ?? (e instanceof Error ? e.message : "Unable to complete this request.");
const ist = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const LABEL: Record<string, string> = { held: "Awaiting payment", paid: "Confirmed", completed: "Completed", cancelled: "Cancelled", expired: "Hold expired", payment_failed: "Payment failed", paid_conflict: "Paid · slot conflict" };
const TONE: Record<string, string> = { paid: "bg-lime-100 text-lime-800", completed: "bg-slate-100 text-slate-700", held: "bg-amber-100 text-amber-800", paid_conflict: "bg-red-100 text-red-700", payment_failed: "bg-red-50 text-red-600" };
const KEYS = ["30", "45", "60"] as const;

export default function AdminNetworkCoach() {
  return <AdminLayout title="Network Coach (Online)"><Content /></AdminLayout>;
}

function Content() {
  const client = useQueryClient();
  const settings = useGetAdminNetworkCoachSettings();
  const bookings = useListAdminNetworkCoachBookings({ query: { queryKey: getListAdminNetworkCoachBookingsQueryKey(), refetchInterval: 60_000 } });
  const slots = useListAdminNetworkCoachSlots({ query: { queryKey: getListAdminNetworkCoachSlotsQueryKey(), refetchInterval: 60_000 } });
  const addSlots = useCreateAdminNetworkCoachSlots();
  const removeSlot = useDeleteAdminNetworkCoachSlot();
  const planPurchases = useListAdminNetworkCoachPlanPurchases({ query: { queryKey: getListAdminNetworkCoachPlanPurchasesQueryKey(), refetchInterval: 60_000 } });
  const savePrices = useUpdateAdminNetworkCoachPrices();
  const setCap = useSetAdminNetworkCoachCategory();
  const resolve = useResolveAdminNetworkCoachRefund();
  const complete = useCompleteAdminNetworkCoachBooking();
  const createPlan = useCreateAdminNetworkCoachPlan();
  const updatePlan = useUpdateAdminNetworkCoachPlan();
  const deletePlan = useDeleteAdminNetworkCoachPlan();
  const resolvePlanRefund = useResolveAdminNetworkCoachPlanRefund();
  const [editingPlan, setEditingPlan] = useState<NetworkCoachPlan | "new" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const categoryId = selectedCategory || settings.data?.categories[0]?.id || "";
  const roster = useGetNetworkCoachOverview(categoryId ? { categoryId } : undefined);
  const [planForm, setPlanForm] = useState<NetworkCoachPlanInput>({ categoryId: "", name: "", duration: 1, durationUnit: "month", priceInr: 1, published: false });
  const [slotTrainer, setSlotTrainer] = useState("");
  const [slotDate, setSlotDate] = useState(() => new Date(Date.now() + 86_400_000 + 330 * 60_000).toISOString().slice(0, 10));
  const [slotTime, setSlotTime] = useState("07:00");
  const [slotDuration, setSlotDuration] = useState<30 | 45 | 60>(60);
  const [repeatWeeks, setRepeatWeeks] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { document.title = "Network Coach | Iconic Fitness Admin"; }, []);
  useEffect(() => {
    const prices = settings.data?.categoryPrices?.[categoryId];
    setDraft({ ...Object.fromEntries(KEYS.map(k => [k, prices?.[k] == null ? "" : String(prices[k])])), cgstPercent: String(prices?.cgstPercent ?? 0), sgstPercent: String(prices?.sgstPercent ?? 0) });
  }, [settings.data, categoryId]);

  const refreshSettings = () => {
    void client.invalidateQueries({ queryKey: ["/api/network-coach/overview"] });
    return client.invalidateQueries({ queryKey: getGetAdminNetworkCoachSettingsQueryKey() });
  };
  const refreshBookings = () => client.invalidateQueries({ queryKey: getListAdminNetworkCoachBookingsQueryKey() });
  const refreshPlanPurchases = () => client.invalidateQueries({ queryKey: getListAdminNetworkCoachPlanPurchasesQueryKey() });
  const submitPrices = () => {
    const prices = Object.fromEntries(KEYS.map(k => [k, draft[k]?.trim() ? Math.round(Number(draft[k])) : null])) as unknown as NetworkCoachPrices;
    prices.cgstPercent = Number(draft.cgstPercent);
    prices.sgstPercent = Number(draft.sgstPercent);
    if ([prices.cgstPercent, prices.sgstPercent].some(n => !Number.isFinite(n) || n < 0 || n > 50)) { setMsg({ ok: false, text: "CGST and SGST must each be between 0% and 50%." }); return; }
    if (KEYS.some(k => prices[k] !== null && (!Number.isFinite(prices[k]!) || prices[k]! < 0))) { setMsg({ ok: false, text: "Prices must be whole rupees (0 or more)." }); return; }
    savePrices.mutate({ data: { prices, categoryId } }, { onSuccess: () => { setMsg({ ok: true, text: "Category prices saved. Existing bookings keep their paid amount." }); void refreshSettings(); }, onError: e => setMsg({ ok: false, text: errorMessage(e) }) });
  };
  const markRefunded = (b: NetworkCoachBooking) => {
    const note = window.prompt(`Booking #${b.id}: confirm you refunded ₹${b.amountInr} in the Airpay dashboard. Add the refund reference:`);
    if (!note || note.trim().length < 3) return;
    resolve.mutate({ id: b.id, data: { note: note.trim() } }, { onSuccess: () => void refreshBookings(), onError: e => window.alert(errorMessage(e)) });
  };
  const markPlanRefunded = (p: NetworkCoachPlanPurchase) => {
    const note = window.prompt(`Plan purchase #${p.id}: confirm you refunded ₹${p.amountInr} in the Airpay dashboard. Add the refund reference:`);
    if (!note || note.trim().length < 3) return;
    resolvePlanRefund.mutate({ id: p.id, data: { note: note.trim() } }, { onSuccess: () => void refreshPlanPurchases(), onError: e => window.alert(errorMessage(e)) });
  };
  const markComplete = (b: NetworkCoachBooking) => {
    if (!window.confirm(`Mark booking #${b.id} as completed? Only do this if the session actually happened.`)) return;
    complete.mutate({ id: b.id }, { onSuccess: () => void refreshBookings(), onError: e => window.alert(errorMessage(e)) });
  };
  const savePlan = () => {
    if (!planForm.name.trim() || !Number.isInteger(planForm.duration) || planForm.duration < 1 || !Number.isInteger(planForm.priceInr) || planForm.priceInr < 1) {
      setMsg({ ok: false, text: "Enter a plan name, positive whole duration and positive total price." }); return;
    }
    const done = { onSuccess: () => { setEditingPlan(null); void refreshSettings(); }, onError: (e: unknown) => setMsg({ ok: false, text: errorMessage(e) }) };
    if (editingPlan === "new") createPlan.mutate({ data: planForm }, done);
    else if (editingPlan) updatePlan.mutate({ id: editingPlan.id, data: planForm }, done);
  };
  const removePlan = (plan: NetworkCoachPlan) => {
    if (!window.confirm(`Delete "${plan.name}"? Existing paid terms and bookings remain unchanged.`)) return;
    deletePlan.mutate({ id: plan.id }, { onSuccess: () => void refreshSettings(), onError: e => window.alert(errorMessage(e)) });
  };
  const createAvailableSlots = () => {
    const [gymId, trainerId] = slotTrainer.split("::");
    if (!gymId || !trainerId) { setMsg({ ok: false, text: "Choose an eligible coach and branch first." }); return; }
    addSlots.mutate({ data: { trainerId, gymId: Number(gymId), date: slotDate, startTime: slotTime, durationMinutes: slotDuration, repeatWeeks } }, {
      onSuccess: r => { void client.invalidateQueries({ queryKey: getListAdminNetworkCoachSlotsQueryKey() }); setMsg({ ok: true, text: `${r.created} slot(s) created${r.skipped.length ? `; ${r.skipped.length} skipped` : ""}.` }); },
      onError: e => setMsg({ ok: false, text: errorMessage(e) }),
    });
  };
  const removeAvailableSlot = (s: AdminNetworkCoachSlot) => {
    if (s.locked) return;
    if (!window.confirm(`Remove ${ist(s.startsAt)} for ${s.trainerName}?`)) return;
    removeSlot.mutate({ id: s.id }, { onSuccess: () => void client.invalidateQueries({ queryKey: getListAdminNetworkCoachSlotsQueryKey() }), onError: e => window.alert(errorMessage(e)) });
  };
  const list = bookings.data ?? [];
  const plans = (settings.data?.plans ?? []).filter(p => p.categoryId === categoryId || !p.categoryId);
  const categories = settings.data?.categories ?? [];
  const pendingRefunds = list.filter(b => b.refundStatus === "pending_admin");

  return <div className="space-y-5">
    <AdminCard className="p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-lime-100 p-2.5"><Video className="h-5 w-5 text-lime-700" /></div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Iconic Network Coach — online sessions</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Members book live 1:1 video sessions with coaches from any branch. Only categories switched on below get the online flow; every other category keeps its branch-only roster. Coaches still need to be linked to the category at their branch in Trainer Profiles and add availability from the app's studio login.</p>
        </div>
      </div>
    </AdminCard>

    <AdminCard className="p-5">
      <label className="text-sm font-semibold" htmlFor="network-pricing-category">Category for plans and prices</label>
      <Select value={categoryId} onValueChange={value => { setSelectedCategory(value); setMsg(null); setEditingPlan(null); }} disabled={savePrices.isPending || createPlan.isPending || updatePlan.isPending}>
        <SelectTrigger id="network-pricing-category" className="mt-2 max-w-md"><SelectValue placeholder="Select a category" /></SelectTrigger>
        <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
      </Select>
      <p className="mt-2 text-sm text-muted-foreground">Prices and plans below apply only to this category. Enable online coaching and publish the category to make them available to members.</p>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-lime-700" : "text-red-600"}`}>{msg.text}</p>}
    </AdminCard>

    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <AdminCard className="p-5">
        <h3 className="font-semibold">Session prices (INR) — {categories.find(c => c.id === categoryId)?.title ?? "Select a category"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Leave blank to stop offering a length. Members pay through Airpay; amounts are verified exactly on return.</p>
        {settings.isLoading ? <Skeleton className="mt-4 h-24 w-full" /> : settings.isError ? <p role="alert" className="mt-4 text-sm text-red-600">{errorMessage(settings.error)}</p> : <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {KEYS.map(k => <label key={k} className="text-sm font-medium">{k} min
              <div className="mt-1 flex items-center rounded-md border focus-within:ring-2 focus-within:ring-lime-500">
                <span className="pl-3 text-muted-foreground">₹</span>
                <Input inputMode="numeric" className="border-0 focus-visible:ring-0" value={draft[k] ?? ""} placeholder="—" onChange={e => setDraft(d => ({ ...d, [k]: e.target.value.replace(/[^0-9]/g, "") }))} data-testid={`input-price-${k}`} />
              </div>
            </label>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["cgstPercent", "sgstPercent"] as const).map(k => <label key={k} className="text-sm font-medium">{k === "cgstPercent" ? "CGST" : "SGST"} (%)
              <Input type="number" min={0} max={50} step="0.01" value={draft[k] ?? "0"} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} data-testid={`input-${k}`} />
            </label>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">GST is added to session and prepaid plan base prices in this category. Tax amounts round to whole rupees, as in the store. Existing orders stay unchanged.</p>
          <div className="mt-2 space-y-1 text-sm">{KEYS.filter(k => draft[k]?.trim()).map(k => {
            const base = Number(draft[k]), cgst = Math.round(base * Number(draft.cgstPercent || 0) / 100), sgst = Math.round(base * Number(draft.sgstPercent || 0) / 100);
            return <p key={k}>{k} min: ₹{base} + CGST ₹{cgst} + SGST ₹{sgst} = <strong>₹{base + cgst + sgst}</strong></p>;
          })}</div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={submitPrices} disabled={!categoryId || savePrices.isPending} data-testid="button-save-prices">{savePrices.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save prices</Button>
            {msg && <p role="status" className={`text-sm ${msg.ok ? "text-lime-700" : "text-red-600"}`}>{msg.text}</p>}
          </div>
        </>}
      </AdminCard>

      <AdminCard className="p-5">
        <h3 className="font-semibold">Online capability per category</h3>
        <p className="mt-1 text-sm text-muted-foreground">A stable switch — renaming a category won't change it.</p>
        <ul className="mt-4 divide-y">
          {categories.map(c => <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.published ? "Published" : "Hidden"}{c.networkCoach ? " · all branches, online booking" : " · branch-only roster"}</p>
            </div>
            <Switch checked={c.networkCoach} disabled={setCap.isPending} aria-label={`Online coaching for ${c.title}`} data-testid={`switch-network-${c.id}`}
              onCheckedChange={v => setCap.mutate({ categoryId: c.id, data: { enabled: v } }, { onSuccess: () => void refreshSettings(), onError: e => window.alert(errorMessage(e)) })} />
          </li>)}
          {settings.data && categories.length === 0 && <li className="py-3 text-sm text-muted-foreground">No categories yet — create one in Coach Categories.</li>}
        </ul>
      </AdminCard>
    </div>

    {pendingRefunds.length > 0 && <AdminCard className="border-red-200 bg-red-50/60 p-4">
      <div className="flex gap-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p><strong>{pendingRefunds.length} refund{pendingRefunds.length === 1 ? "" : "s"} need manual action.</strong> Refunds are not automated: issue them in the Airpay merchant dashboard using the payment reference, then mark them refunded here.</p>
      </div>
    </AdminCard>}

    <AdminCard className="p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h3 className="font-semibold">Prepaid coaching plans — {categories.find(c => c.id === categoryId)?.title ?? "Select a category"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">One full payment, unlimited booked sessions with the selected coach through the plan term. No recurring rebill or auto-renewal.</p></div>
        <Button disabled={!categoryId} onClick={() => { setPlanForm({ categoryId, name: "", duration: 1, durationUnit: "month", priceInr: 1, published: false }); setEditingPlan("new"); }} data-testid="button-new-network-plan"><Plus className="mr-2 h-4 w-4" />Add plan</Button>
      </div>
      {settings.isLoading ? <Skeleton className="mt-4 h-20 w-full" /> : settings.isError ? (
        <div className="mt-4 flex items-center gap-3 text-sm text-red-600">{errorMessage(settings.error)}<Button variant="outline" size="sm" onClick={() => void settings.refetch()}>Retry</Button></div>
      ) : plans.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">No plan tiers configured yet. Add one to make prepaid plans available to members.</div>
      ) : <div className="mt-4 divide-y rounded-xl border">
        {plans.map(p => <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-testid={`network-plan-${p.id}`}>
          <div className="min-w-0 flex-1"><p className="font-medium">{p.name} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${p.published ? "bg-lime-100 text-lime-800" : "bg-slate-100 text-slate-600"}`}>{p.published ? "Published" : "Unpublished"}</span></p>
            <p className="text-sm text-muted-foreground">{p.duration} {p.durationUnit}{p.duration > 1 ? "s" : ""} · ₹{p.priceInr.toLocaleString("en-IN")} once · unlimited sessions during term</p></div>
          <Button size="sm" variant="outline" onClick={() => { setPlanForm({ categoryId, name: p.name, duration: p.duration, durationUnit: p.durationUnit, priceInr: p.priceInr, published: p.published }); setEditingPlan(p); }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
          {!p.categoryId && <span className="text-xs text-amber-700">Legacy plan — edit and save to assign to this category</span>}
          <Button size="sm" variant={p.published ? "secondary" : "outline"} disabled={!p.categoryId || updatePlan.isPending} onClick={() => updatePlan.mutate({ id: p.id, data: { categoryId, name: p.name, duration: p.duration, durationUnit: p.durationUnit, priceInr: p.priceInr, published: !p.published } }, { onSuccess: () => void refreshSettings(), onError: e => window.alert(errorMessage(e)) })}>{p.published ? "Unpublish" : "Publish"}</Button>
          <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => removePlan(p)} disabled={deletePlan.isPending}><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>)}
      </div>}
    </AdminCard>

    {editingPlan !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setEditingPlan(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title" className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-xl">
        <h3 id="plan-dialog-title" className="text-lg font-semibold">{editingPlan === "new" ? "New prepaid plan" : "Edit prepaid plan"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Available for every published Network Coach category; member purchases bind the term to one selected coach.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Plan name<Input className="mt-1" maxLength={80} value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} /></label>
          <label className="text-sm font-medium">Duration<Input className="mt-1" type="number" min={1} max={3650} step={1} value={planForm.duration} onChange={e => setPlanForm(f => ({ ...f, duration: Number(e.target.value) }))} /></label>
          <label className="text-sm font-medium">Unit<Select value={planForm.durationUnit} onValueChange={(v: NetworkCoachPlanInput["durationUnit"]) => setPlanForm(f => ({ ...f, durationUnit: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(["day", "week", "month", "year"] as const).map(u => <SelectItem key={u} value={u}>{u[0]!.toUpperCase() + u.slice(1)}{u === "day" || u === "week" ? "s" : ""}</SelectItem>)}</SelectContent></Select></label>
          <label className="text-sm font-medium sm:col-span-2">Full term price (INR) — charged once<Input className="mt-1" type="number" min={1} max={1000000} step={1} value={planForm.priceInr} onChange={e => setPlanForm(f => ({ ...f, priceInr: Number(e.target.value) }))} /></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={planForm.published} onCheckedChange={v => setPlanForm(f => ({ ...f, published: v }))} /> Publish to members</label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button><Button onClick={savePlan} disabled={createPlan.isPending || updatePlan.isPending}>{createPlan.isPending || updatePlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save plan</Button></div>
      </div>
    </div>}

    <AdminCard className="p-5">
      <h3 className="font-semibold">Coach availability</h3>
      <p className="mt-1 text-sm text-muted-foreground">Admins can publish or remove open calendar slots. Coaches may also publish their own availability; booked times are locked. All times use IST.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-sm font-medium sm:col-span-2">Coach · branch
          <select value={slotTrainer} onChange={e => setSlotTrainer(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" data-testid="admin-slot-trainer">
            <option value="">Choose eligible coach</option>
            {(roster.data?.trainers ?? []).map(t => <option key={`${t.gymId}:${t.id}`} value={`${t.gymId}::${t.id}`}>{t.name} · {t.branchName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Date (IST)<Input className="mt-1" type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} /></label>
        <label className="text-sm font-medium">Start time<Input className="mt-1" type="time" step={900} value={slotTime} onChange={e => setSlotTime(e.target.value)} /></label>
        <label className="text-sm font-medium">Duration<Select value={String(slotDuration)} onValueChange={v => setSlotDuration(Number(v) as 30 | 45 | 60)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{([30,45,60] as const).map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent></Select></label>
        <label className="text-sm font-medium">Repeat weeks<Input className="mt-1" type="number" min={0} max={12} step={1} value={repeatWeeks} onChange={e => setRepeatWeeks(Math.max(0, Math.min(12, Number(e.target.value))))} /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button onClick={createAvailableSlots} disabled={addSlots.isPending || !slotTrainer} data-testid="button-admin-add-slots">{addSlots.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Publish availability</Button>
        {!roster.data?.trainers.length && <span className="text-sm text-muted-foreground">No eligible coaches: link active coaches to a published Network Coach category in Trainer Profiles.</span>}
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-lime-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
      {slots.isLoading ? <div className="mt-4 space-y-2">{[0,1].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        : slots.isError ? <div className="mt-4 flex items-center gap-3 text-sm text-red-600">{errorMessage(slots.error)}<Button variant="outline" size="sm" onClick={() => void slots.refetch()}>Retry</Button></div>
        : !slots.data?.length ? <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No future slots published.</p>
        : <div className="mt-4 max-h-80 overflow-auto rounded-xl border divide-y">{slots.data.map(s => <div key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm" data-testid={`admin-slot-${s.id}`}>
          <span className="min-w-32 font-medium">{ist(s.startsAt)}</span><span className="min-w-0 flex-1 text-muted-foreground">{s.trainerName} · {s.branchName}</span>
          {s.bookingStatus ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{s.bookingStatus}</span> : <span className="rounded-full bg-lime-100 px-2 py-0.5 text-xs text-lime-800">Open</span>}
          {s.locked ? <span className="text-xs text-muted-foreground">Booked · locked</span> : <Button size="sm" variant="ghost" aria-label={`Delete slot ${s.id}`} onClick={() => removeAvailableSlot(s)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
        </div>)}</div>}
    </AdminCard>

    <AdminCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Bookings</h3>
        <Button variant="outline" size="icon" aria-label="Refresh bookings" onClick={() => void bookings.refetch()} data-testid="button-refresh-bookings"><RefreshCw className={`h-4 w-4 ${bookings.isFetching ? "animate-spin" : ""}`} /></Button>
      </div>
      {bookings.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        : bookings.isError ? <div className="space-y-3 p-8 text-center"><p role="alert">{errorMessage(bookings.error)}</p><Button variant="outline" onClick={() => void bookings.refetch()}>Retry</Button></div>
        : list.length === 0 ? <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground"><ShieldCheck className="h-8 w-8 text-lime-600" />No online bookings yet.</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>
            <th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">When (IST)</th><th className="px-4 py-2.5">Coach · Branch</th><th className="px-4 py-2.5">Member</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Airpay ref</th><th className="px-4 py-2.5"></th>
          </tr></thead>
          <tbody className="divide-y">{list.map(b => <tr key={b.id} className={b.refundStatus === "pending_admin" ? "bg-red-50/40" : ""} data-testid={`row-booking-${b.id}`}>
            <td className="px-4 py-2.5 font-mono text-xs">{b.id}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{ist(b.startsAt)}</td>
            <td className="px-4 py-2.5">{b.trainerName}<span className="text-muted-foreground"> · {b.branchName}</span></td>
            <td className="px-4 py-2.5">{b.memberName}</td>
            <td className="px-4 py-2.5">₹{b.amountInr.toLocaleString("en-IN")}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[b.status] ?? "bg-slate-100 text-slate-600"}`}>{LABEL[b.status] ?? b.status}</span>
              {b.refundStatus && <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${b.refundStatus === "pending_admin" ? "bg-red-100 text-red-700" : "bg-lime-100 text-lime-800"}`}>{b.refundStatus === "pending_admin" ? "Refund pending admin" : "Refunded (manual)"}</span>}
              {b.adminNote && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{b.adminNote}</p>}
              {b.review && <p className="mt-1 text-xs text-amber-700">{"★".repeat(b.review.rating)} {b.review.comment}</p>}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs">{b.paymentReference}</td>
            <td className="px-4 py-2.5 whitespace-nowrap text-right">
              {b.refundStatus === "pending_admin" && <Button size="sm" variant="outline" onClick={() => markRefunded(b)} data-testid={`button-refunded-${b.id}`}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark refunded</Button>}
              {b.status === "paid" && new Date(b.startsAt).getTime() <= Date.now() && <Button size="sm" variant="ghost" onClick={() => markComplete(b)} data-testid={`button-complete-${b.id}`}>Mark completed</Button>}
            </td>
          </tr>)}</tbody>
        </table></div>}
    </AdminCard>
    <AdminCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4"><div><h3 className="font-semibold">Prepaid plan purchases</h3><p className="text-sm text-muted-foreground">Each paid term is bound to its chosen trainer; no auto-renewal.</p></div>
        <Button variant="outline" size="icon" aria-label="Refresh plan purchases" onClick={() => void planPurchases.refetch()}><RefreshCw className={`h-4 w-4 ${planPurchases.isFetching ? "animate-spin" : ""}`} /></Button></div>
      {planPurchases.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        : planPurchases.isError ? <div className="space-y-3 p-8 text-center"><p role="alert">{errorMessage(planPurchases.error)}</p><Button variant="outline" onClick={() => void planPurchases.refetch()}>Retry</Button></div>
        : !planPurchases.data?.length ? <p className="p-8 text-center text-sm text-muted-foreground">No plan purchases yet.</p>
        : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5">Member · Coach</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Term (IST)</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Airpay ref</th><th /></tr></thead>
          <tbody className="divide-y">{planPurchases.data.map(p => <tr key={p.id} className={p.refundStatus === "pending_admin" ? "bg-red-50/40" : ""}>
            <td className="px-4 py-2.5 font-mono text-xs">{p.id}</td><td className="px-4 py-2.5">{p.planName}<div className="text-xs text-muted-foreground">{p.duration} {p.durationUnit}{p.duration === 1 ? "" : "s"}</div></td>
            <td className="px-4 py-2.5">{p.memberName}<div className="text-xs text-muted-foreground">Trainer {p.trainerId}</div></td>
            <td className="px-4 py-2.5">₹{p.amountInr.toLocaleString("en-IN")} once</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{p.startsAt ? ist(p.startsAt) : "—"}{p.endsAt ? ` – ${ist(p.endsAt)}` : ""}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "paid" ? "bg-lime-100 text-lime-800" : p.status === "paid_conflict" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{p.status}</span>
              {p.refundStatus && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">{p.refundStatus === "pending_admin" ? "Refund pending admin" : "Refunded (manual)"}</span>}
              {p.adminNote && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{p.adminNote}</p>}</td>
            <td className="px-4 py-2.5 font-mono text-xs">{p.paymentReference}</td>
            <td className="px-4 py-2.5 text-right">{p.refundStatus === "pending_admin" && <Button size="sm" variant="outline" onClick={() => markPlanRefunded(p)}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark refunded</Button>}</td>
          </tr>)}</tbody></table></div>}
    </AdminCard>
  </div>;
}
