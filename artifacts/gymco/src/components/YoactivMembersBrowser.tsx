import { useEffect, useMemo, useRef, useState } from "react";
import type {
  YoactivBranchOption,
  YoactivMemberDetail,
  YoactivMemberRow,
  YoactivStaffTrainer,
} from "@/lib/adminApi";
import { ChevronDown, ChevronRight, RefreshCw, Search, User } from "lucide-react";
import FileUpload from "@/components/FileUpload";

type StatusFilter = "all" | "active" | "inactive";
type View = "members" | "trainers";

export type YoactivMembersApi = {
  branches: () => Promise<YoactivBranchOption[]>;
  members: (branchId: number) => Promise<YoactivMemberRow[]>;
  memberDetail: (mobile: string) => Promise<YoactivMemberDetail>;
  trainers: (branchId: number) => Promise<YoactivStaffTrainer[]>;
  setTrainerPhoto: (
    trainerId: string,
    imageUrl: string,
    branchId: number,
  ) => Promise<{ ok: boolean }>;
  removeTrainerPhoto: (
    trainerId: string,
    branchId: number,
  ) => Promise<{ ok: boolean }>;
};

function statusBadge(status: string) {
  const s = status.toLowerCase();
  const cls =
    s === "active"
      ? "bg-emerald-500/15 text-emerald-400"
      : s === "inactive" || s === "expired"
        ? "bg-red-500/15 text-red-400"
        : s === "paused"
          ? "bg-amber-500/15 text-amber-400"
          : "bg-slate-500/15 text-slate-400";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function MemberDetailRow({
  mobile,
  api,
}: {
  mobile: string;
  api: YoactivMembersApi;
}) {
  const [detail, setDetail] = useState<YoactivMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    api
      .memberDetail(mobile)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [mobile, api]);

  if (loading)
    return <p className="px-4 py-3 text-sm text-slate-400">Loading plan details…</p>;
  if (err) return <p className="px-4 py-3 text-sm text-red-400">{err}</p>;
  if (!detail || detail.memberships.length === 0)
    return (
      <p className="px-4 py-3 text-sm text-slate-400">
        No plan history found for this member.
      </p>
    );

  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-4">Plan</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Start</th>
            <th className="pb-2 pr-4">Expiry</th>
            <th className="pb-2 pr-4">Sessions</th>
            <th className="pb-2 pr-4">Amount</th>
          </tr>
        </thead>
        <tbody>
          {detail.memberships.map((m, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="py-2 pr-4">
                <div className="font-medium text-slate-200">{m.planName}</div>
                {m.serviceName && m.serviceName !== m.planName && (
                  <div className="text-xs text-slate-500">{m.serviceName}</div>
                )}
              </td>
              <td className="py-2 pr-4">{statusBadge(m.status)}</td>
              <td className="py-2 pr-4 text-slate-300">{formatDate(m.startDate)}</td>
              <td className="py-2 pr-4 text-slate-300">{formatDate(m.expiryDate)}</td>
              <td className="py-2 pr-4 text-slate-300">
                {m.sessionsTotal !== null
                  ? `${m.sessionsUsed ?? 0}/${m.sessionsTotal}`
                  : "—"}
              </td>
              <td className="py-2 pr-4 text-slate-300">
                {m.amountInr !== null
                  ? `₹${m.amountInr.toLocaleString("en-IN")}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YoactivMembersBrowser({
  api,
  emptyBranchesMessage,
}: {
  api: YoactivMembersApi;
  emptyBranchesMessage: string;
}) {
  const [branches, setBranches] = useState<YoactivBranchOption[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [view, setView] = useState<View>("members");
  const [members, setMembers] = useState<YoactivMemberRow[]>([]);
  const [trainers, setTrainers] = useState<YoactivStaffTrainer[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  // Monotonic request token: only the latest branch/view request may update
  // state, so out-of-order responses never render another branch's data.
  const loadSeq = useRef(0);

  useEffect(() => {
    api
      .branches()
      .then((b) => {
        setBranches(b);
        if (b.length > 0) setBranchId(b[0].branchId);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingBranches(false));
  }, [api]);

  const loadMembers = (id: number, which: View) => {
    const seq = ++loadSeq.current;
    setLoadingMembers(true);
    setErr(null);
    setExpanded(null);
    const load =
      which === "members"
        ? api.members(id).then((rows) => {
            if (loadSeq.current === seq) setMembers(rows);
          })
        : api.trainers(id).then((rows) => {
            if (loadSeq.current === seq) setTrainers(rows);
          });
    load
      .catch((e) => {
        if (loadSeq.current === seq)
          setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (loadSeq.current === seq) setLoadingMembers(false);
      });
  };

  useEffect(() => {
    if (branchId !== null) loadMembers(branchId, view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, view]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== "all") {
        const active = m.status.toLowerCase() === "active";
        if (statusFilter === "active" && !active) return false;
        if (statusFilter === "inactive" && active) return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.mobile.includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    });
  }, [members, search, statusFilter]);

  const filteredTrainers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trainers;
    return trainers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.mobile.includes(q),
    );
  }, [trainers, search]);

  const activeCount = members.filter(
    (m) => m.status.toLowerCase() === "active",
  ).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          value={branchId ?? ""}
          onChange={(e) => setBranchId(Number(e.target.value))}
          disabled={loadingBranches || branches.length === 0}
        >
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>
              {b.branchId} — {b.branchName ?? b.gymLabel ?? "Unnamed branch"}
              {b.branchName && b.gymLabel ? ` · ${b.gymLabel}` : ""}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-slate-700 text-sm">
          {(["members", "trainers"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 capitalize ${
                view === v
                  ? "bg-slate-700 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            className="w-64 rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500"
            placeholder={
              view === "members"
                ? "Search name, mobile, email…"
                : "Search name, mobile…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {view === "members" && (
          <div className="flex overflow-hidden rounded-lg border border-slate-700 text-sm">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 capitalize ${
                  statusFilter === f
                    ? "bg-slate-700 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => branchId !== null && loadMembers(branchId, view)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:text-white"
          disabled={loadingMembers}
        >
          <RefreshCw className={`h-4 w-4 ${loadingMembers ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loadingBranches ? (
        <p className="text-sm text-slate-400">Loading branches…</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyBranchesMessage}</p>
      ) : err ? (
        <p className="text-sm text-red-400">{err}</p>
      ) : loadingMembers ? (
        <p className="text-sm text-slate-400">
          {view === "members" ? "Loading members…" : "Loading trainers…"}
        </p>
      ) : view === "trainers" ? (
        <>
          <p className="mb-3 text-sm text-slate-400">
            {trainers.length} personal trainers
            {filteredTrainers.length !== trainers.length &&
              ` · showing ${filteredTrainers.length}`}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Photo</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Mobile</th>
                  <th className="pb-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {filteredTrainers.map((t) => (
                  <TrainerRow
                    key={t.id}
                    trainer={t}
                    branchId={branchId!}
                    api={api}
                    onPhotoChange={(url) =>
                      setTrainers((cur) =>
                        cur.map((x) =>
                          x.id === t.id ? { ...x, photoUrl: url } : x,
                        ),
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
            {filteredTrainers.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                {trainers.length === 0
                  ? "No personal trainers found for this branch."
                  : "No trainers match the current search."}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-400">
            {members.length} members · {activeCount} active ·{" "}
            {members.length - activeCount} inactive
            {filtered.length !== members.length && ` · showing ${filtered.length}`}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-2" />
                  <th className="pb-2 pr-4">Photo</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Mobile</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <MemberRows
                    key={m.memberId}
                    member={m}
                    api={api}
                    expanded={expanded === m.memberId}
                    onToggle={() =>
                      setExpanded((cur) =>
                        cur === m.memberId ? null : m.memberId,
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                No members match the current filters.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}

function TrainerRow({
  trainer,
  branchId,
  api,
  onPhotoChange,
}: {
  trainer: YoactivStaffTrainer;
  branchId: number;
  api: YoactivMembersApi;
  onPhotoChange: (url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (url: string) => {
    setErr(null);
    setBusy(true);
    try {
      await api.setTrainerPhoto(trainer.id, url, branchId);
      onPhotoChange(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save photo");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.removeTrainerPhoto(trainer.id, branchId);
      onPhotoChange(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-t border-slate-800">
      <td className="py-2 pr-4">
        {trainer.photoUrl ? (
          <img
            src={trainer.photoUrl}
            alt={trainer.name || "Trainer"}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-500">
            <User className="h-5 w-5" />
          </span>
        )}
      </td>
      <td className="py-2 pr-4 font-medium text-slate-200">
        {trainer.name || "—"}
      </td>
      <td className="py-2 pr-4 text-slate-300">{trainer.mobile || "—"}</td>
      <td className="py-2 pr-4">
        <div className="flex items-center gap-2">
          <FileUpload
            label={trainer.photoUrl ? "Change photo" : "Add photo"}
            accept="image/*"
            onUploaded={(urls) => {
              if (urls[0]) void save(urls[0]);
            }}
          />
          {trainer.photoUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        {err && <div className="mt-1 text-[11px] text-rose-400">{err}</div>}
      </td>
    </tr>
  );
}

function MemberRows({
  member,
  api,
  expanded,
  onToggle,
}: {
  member: YoactivMemberRow;
  api: YoactivMembersApi;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-t border-slate-800 hover:bg-slate-800/40"
        onClick={onToggle}
      >
        <td className="py-2 pr-2 text-slate-500">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="py-2 pr-4">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name || "Member"}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-500">
              <User className="h-5 w-5" />
            </span>
          )}
        </td>
        <td className="py-2 pr-4 font-medium text-slate-200">{member.name || "—"}</td>
        <td className="py-2 pr-4 text-slate-300">{member.mobile || "—"}</td>
        <td className="py-2 pr-4 text-slate-400">{member.email || "—"}</td>
        <td className="py-2 pr-4">{statusBadge(member.status)}</td>
      </tr>
      {expanded && (
        <tr className="border-t border-slate-800 bg-slate-900/60">
          <td colSpan={6}>
            {member.mobile.trim() ? (
              <MemberDetailRow mobile={member.mobile} api={api} />
            ) : (
              <p className="px-4 py-3 text-sm text-slate-400">
                No mobile number on file — plan details can&apos;t be looked up.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
