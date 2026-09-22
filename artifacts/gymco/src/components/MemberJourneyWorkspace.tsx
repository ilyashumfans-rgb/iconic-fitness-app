import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buttonClass, fieldClass, journeyDate, journeyRequest, stageLabel, type Journey, type JourneyOptions, type JourneyPortal } from "@/lib/memberJourney";
import { MemberJourneyAction } from "./MemberJourneyAction";

export function MemberJourneyWorkspace({portal}: {portal: JourneyPortal}) {
  const cache = useQueryClient();
  const params = useParams<{userId?: string}>();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {setSelected(params.userId && /^\d+$/.test(params.userId) ? Number(params.userId) : null);}, [params.userId]);
  const openMember = (id: number | null) => {
    setSelected(id);
    const base = portal === "admin" ? "/admin/member-engagement" : `/${portal}/member-journey`;
    navigate(id === null ? base : `${base}${portal === "admin" ? "/journey" : ""}/${id}`);
  };
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [stage, setStage] = useState("");
  const [assignee, setAssignee] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [member, setMember] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const key = ["member-journey", portal];
  useEffect(() => () => {cache.removeQueries({queryKey: ["member-journey", portal]});}, [cache, portal]);
  const list = useQuery({queryKey: [...key, "list"], queryFn: () => journeyRequest<{journeys: Journey[]; canManage: boolean}>(portal), refetchInterval: 60000, staleTime: 0});
  const options = useQuery({queryKey: [...key, "options"], queryFn: () => journeyRequest<JourneyOptions>(portal, "/options"), staleTime: 0});
  const detail = useQuery({queryKey: [...key, selected], queryFn: () => journeyRequest<Journey>(portal, `/${selected}`), enabled: selected !== null, staleTime: 0, refetchInterval: 60000});
  const refresh = () => { void cache.invalidateQueries({queryKey: key}); };
  if (list.isLoading || options.isLoading) return <p data-testid="status-journey-loading">Loading member journeys…</p>;
  if (list.isError || options.isError) return <div role="alert" className="space-y-3"><p data-testid="status-journey-error">{(list.error || options.error)?.message}. Your account needs access to this branch and the Member Journey module.</p><button data-testid="button-journey-retry" className={buttonClass} onClick={refresh}>Retry</button></div>;
  if (!list.data || !options.data) return <p>No journey data available.</p>;
  const opts = options.data;
  const gymName = (id: number) => opts.gyms.find(g => g.id === id)?.name || `Branch ${id}`;
  const assigneeName = (id: number | null) => id === null ? "Unassigned" : opts.assignees.find(a => a.id === id)?.name || `Staff ${id}`;
  const rows = list.data.journeys.filter(j => j.memberName.toLowerCase().includes(search.toLowerCase()) && (!branch || String(j.gymId) === branch) && (!stage || j.currentStage === stage) && (!assignee || String(j.assigneeId) === assignee) && (!overdue || j.overdue));
  const j = detail.data;
  return <section className="space-y-5 text-slate-900" data-testid="member-journey-workspace">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Member Journey</h2><p className="text-sm text-slate-500">Health → assessment → trials → PT or general training → attendance</p></div><button data-testid="button-journey-refresh" className={buttonClass} onClick={refresh}>Refresh</button></div>
    {!list.data.canManage && <p data-testid="status-journey-readonly" className="rounded-lg bg-slate-100 p-3 text-sm">Read-only · only your permitted branches and information are shown.</p>}
    {list.data.canManage && opts.canManage && portal !== "agency" && <form className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4" onSubmit={async e => {
      e.preventDefault(); const candidate = opts.members.find(m => `${m.id}:${m.gymId}` === member); if (!candidate) return;
      setPending(true); setError("");
      try { await journeyRequest<Journey>(portal, "/enroll", {method: "POST", body: JSON.stringify({userId: candidate.id, gymId: candidate.gymId})}); setMember(""); refresh(); openMember(candidate.id); }
      catch (e) { setError(e instanceof Error ? e.message : "Enrollment failed"); }
      finally { setPending(false); }
    }}><label className="min-w-0 flex-1 text-sm">Enroll an existing branch member<select data-testid="select-journey-enroll-member" className={fieldClass} required value={member} onChange={e => setMember(e.target.value)}><option value="">Select member and verified branch</option>{opts.members.map(m => <option key={`${m.id}:${m.gymId}`} value={`${m.id}:${m.gymId}`}>{m.name} · {gymName(m.gymId)}</option>)}</select></label><button data-testid="button-journey-enroll" className={buttonClass} disabled={pending || !member}>{pending ? "Enrolling…" : "Enroll"}</button>{!opts.members.length && <p className="w-full text-sm">No eligible members in your branch scope.</p>}{error && <p data-testid="status-journey-enroll-error" role="alert" className="w-full text-red-700">{error}</p>}</form>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input data-testid="input-journey-search" aria-label="Search member name" placeholder="Search members…" className={fieldClass} value={search} onChange={e => setSearch(e.target.value)} />
      <select data-testid="select-journey-branch" aria-label="Filter branch" className={fieldClass} value={branch} onChange={e => setBranch(e.target.value)}><option value="">All permitted branches</option>{opts.gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      <select data-testid="select-journey-stage" aria-label="Filter stage" className={fieldClass} value={stage} onChange={e => setStage(e.target.value)}><option value="">All stages</option>{[...new Set(list.data.journeys.map(j => j.currentStage))].map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}</select>
      <select data-testid="select-journey-assignee-filter" aria-label="Filter assignee" className={fieldClass} value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">All assignees</option><option value="null">Unassigned</option>{opts.assignees.map(a => <option key={`${a.id}:${a.gymId}`} value={a.id}>{a.name}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input data-testid="checkbox-journey-overdue" type="checkbox" checked={overdue} onChange={e => setOverdue(e.target.checked)} />Overdue only</label>
    </div>
    <p data-testid="text-journey-count" className="text-sm text-slate-500">{rows.length} of {list.data.journeys.length} journeys</p>
    <div className="grid gap-3 lg:grid-cols-2">{rows.map(row => <button data-testid={`button-journey-member-${row.userId}`} key={row.userId} onClick={() => openMember(row.userId)} className={`rounded-xl border bg-white p-4 text-left ${selected === row.userId ? "border-lime-600 ring-1 ring-lime-600" : "border-slate-200"}`}>
      <div className="flex flex-wrap justify-between gap-2"><strong>{row.memberName}</strong><span className={row.overdue ? "text-red-700" : "text-slate-500"}>{row.overdue ? "Overdue · " : ""}{journeyDate(row.dueAt)}</span></div>
      <p className="font-medium">{stageLabel(row.currentStage)}</p><p className="text-sm">Next: {row.nextAction}</p><p className="mt-2 text-xs text-slate-500">{gymName(row.gymId)} · {row.assigneeName || assigneeName(row.assigneeId)} · PT {row.ptDecision ?? "undecided"}</p>
    </button>)}</div>
    {!rows.length && <p data-testid="status-journey-empty" className="rounded-xl border p-6">No journeys match these filters. Clear filters or enroll an eligible member.</p>}
    {selected !== null && <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" data-testid="journey-detail">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Journey details</h2><button data-testid="button-journey-close" className={buttonClass} onClick={() => openMember(null)}>Close</button></div>
      {detail.isLoading ? <p>Loading details…</p> : detail.isError ? <p role="alert">{detail.error.message} · Use Refresh to retry.</p> : j && <>
        <div><h3 className="text-xl font-bold">{j.memberName}</h3><p>{gymName(j.gymId)} · {stageLabel(j.currentStage)}</p><p className="text-sm">{j.assigneeName || assigneeName(j.assigneeId)} · Due {journeyDate(j.dueAt)} {j.overdue && "· Overdue"}</p>{j.trialProgramId && <p className="text-sm">Linked PT program #{j.trialProgramId}</p>}</div>
        <div className="rounded-lg bg-slate-50 p-4"><MemberJourneyAction key={`${j.userId}:${j.currentStage}`} journey={j} options={opts} portal={portal} onSaved={value => {cache.setQueryData([...key, selected], value); refresh();}} /></div>
        <div><h3 className="font-semibold">Verified completed stages</h3>{j.completedStages?.length ? <ul className="flex flex-wrap gap-2 pt-2">{j.completedStages.map(s => <li data-testid={`journey-completed-${s}`} key={s} className="rounded-lg bg-lime-50 px-3 py-1 text-sm text-lime-800">✓ {stageLabel(s)}</li>)}</ul> : <p className="text-sm text-slate-500">No completed-stage proofs returned.</p>}<p className="mt-2 text-xs text-slate-500">Only server-verified completion is shown. A later current stage does not imply every earlier form was completed.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><h3 className="font-semibold">Verified assessment & trial facts</h3><ul className="text-sm">{Object.entries(j.facts).map(([fact, done]) => <li key={fact}>{stageLabel(fact)}: {done ? "Recorded" : "Awaiting record"}</li>)}</ul><p className="mt-3 text-sm">Attendance: {j.attendance.checkinsLast30Days} check-ins in the last 30 days.</p></div>
          <div><h3 className="font-semibold">Health history & review</h3>{j.healthHistory ? <dl className="text-sm">{Object.entries(j.healthHistory).map(([k,v]) => <div key={k} className="mb-1"><dt className="font-medium">{stageLabel(k)}</dt><dd className="whitespace-pre-wrap break-words">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</dd></div>)}</dl> : <p className="text-sm text-slate-500">Not submitted or not available with your access.</p>}{j.reviewedAt && <p className="text-sm">Reviewed {journeyDate(j.reviewedAt)}</p>}{j.reviewNote && <p className="whitespace-pre-wrap text-sm">{j.reviewNote}</p>}</div>
        </div>
        <div><h3 className="font-semibold">Workout charts</h3>{!j.charts.length && <p className="text-sm text-slate-500">No charts issued.</p>}{j.charts.map(c => <article key={c.id} className="mt-2 rounded-lg border p-3"><h4 className="font-medium">{c.label}</h4><p className="text-xs text-slate-500">{journeyDate(c.issuedAt)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.content ?? "Chart content restricted for this role."}</p></article>)}</div>
        <div><h3 className="font-semibold">Follow-ups & responses</h3>{!j.followups.length && <p className="text-sm text-slate-500">No follow-ups recorded.</p>}{j.followups.map(f => <article key={f.id} className="mt-2 border-l-2 border-lime-500 pl-3 text-sm"><strong>{stageLabel(f.kind)}</strong><p>{journeyDate(f.createdAt)}</p><p className="whitespace-pre-wrap">{f.response ?? "Response restricted for this role."}</p><p>Next: {journeyDate(f.nextDate)}</p></article>)}</div>
        <div><h3 className="font-semibold">Full journey audit timeline</h3>{!j.events.length && <p className="text-sm text-slate-500">No visible audit events.</p>}<ol className="space-y-3 pt-3">{j.events.map(event => <li key={event.id} data-testid={`journey-event-${event.id}`} className="border-l-2 border-slate-200 pl-3 text-sm"><strong>{stageLabel(event.action)}</strong><p className="text-slate-500">{journeyDate(event.createdAt)} · {event.actor || "Actor restricted"}</p></li>)}</ol></div>
      </>}
    </section>}
  </section>;
}