import { useEffect, useMemo, useState } from "react";
import type { TrainerBookingRow, PtSessionRow } from "@/lib/partnerApi";

/** Session-scheduling API surface (admin or partner flavor). */
export type PtSessionApi = {
  list: (id: number) => Promise<PtSessionRow[]>;
  add: (id: number, body: { date: string; time: string }) => Promise<PtSessionRow>;
  setStatus: (id: number, sessionId: number, status: string) => Promise<unknown>;
  remove: (id: number, sessionId: number) => Promise<unknown>;
};

const ALL = "__all__";

type TrainerOption = { id: string; name: string };

function fmtDate(d: string): string {
  if (!d) return "—";
  const parsed = new Date(`${d}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: TrainerBookingRow["status"] }) {
  const cls =
    status === "paid"
      ? "bg-green-100 text-green-800"
      : status === "failed"
        ? "bg-red-100 text-red-700"
        : status === "enquiry"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

/**
 * Inline assign editor for one row. Loads the branch's live trainer roster
 * when available; falls back to free-text entry when the branch is unmapped
 * or the roster can't be loaded.
 */
function AssignEditor({
  row,
  loadTrainers,
  onAssign,
  onDone,
}: {
  row: TrainerBookingRow;
  loadTrainers?: (branchId: number) => Promise<TrainerOption[]>;
  onAssign: (
    id: number,
    body: { trainerId?: string; trainerName: string },
  ) => Promise<unknown>;
  onDone: (assignedName: string | null) => void;
}) {
  const [options, setOptions] = useState<TrainerOption[] | null>(null);
  const [rosterFailed, setRosterFailed] = useState(false);
  const [selected, setSelected] = useState("");
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!loadTrainers || row.branchId <= 0) {
      setRosterFailed(true);
      return;
    }
    loadTrainers(row.branchId)
      .then((list) => {
        if (cancelled) return;
        if (list.length === 0) setRosterFailed(true);
        else setOptions(list);
      })
      .catch(() => {
        if (!cancelled) setRosterFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useText = rosterFailed || options === null;
  const chosen = options?.find((o) => o.id === selected);
  const name = useText ? freeText.trim() : (chosen?.name ?? "");

  const save = async () => {
    if (!name) return;
    setSaving(true);
    setErr(null);
    try {
      await onAssign(row.id, {
        trainerId: useText ? "" : selected,
        trainerName: name,
      });
      onDone(name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options && !rosterFailed ? (
        <select
          className="rounded-md border px-2 py-1 text-xs"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select trainer…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      ) : rosterFailed ? (
        <input
          className="w-32 rounded-md border px-2 py-1 text-xs"
          placeholder="Trainer name"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
        />
      ) : (
        <span className="text-xs text-muted-foreground">Loading…</span>
      )}
      <button
        type="button"
        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        disabled={saving || !name}
        onClick={save}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        className="rounded-md border px-2 py-1 text-xs"
        disabled={saving}
        onClick={() => onDone(null)}
      >
        Cancel
      </button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}

/**
 * Session-timings manager for one PT enrolment (12 sessions/month).
 * Staff add date+time rows, mark them done/cancelled, or remove them.
 */
function SessionsManager({
  row,
  api,
  onClose,
}: {
  row: TrainerBookingRow;
  api: PtSessionApi;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<PtSessionRow[] | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .list(row.id)
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const completed = (sessions ?? []).filter((s) => s.status === "completed").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">PT sessions — {row.memberName}</h3>
            <p className="text-xs text-muted-foreground">
              {row.gymName} · {completed}/12 completed this program
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {sessions === null && !err ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {(sessions ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sessions scheduled yet.
                </p>
              ) : (
                (sessions ?? []).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                  >
                    <span className="font-medium">{fmtDate(s.date)}</span>
                    <span>{s.time}</span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                        s.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : s.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {s.status}
                    </span>
                    {s.status === "scheduled" ? (
                      <button
                        type="button"
                        className="rounded-md border px-1.5 py-0.5 text-xs"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await api.setStatus(row.id, s.id, "completed");
                            setSessions((list) =>
                              (list ?? []).map((x) =>
                                x.id === s.id ? { ...x, status: "completed" } : x,
                              ),
                            );
                          })
                        }
                      >
                        Done
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-md border px-1.5 py-0.5 text-xs text-red-600"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api.remove(row.id, s.id);
                          setSessions((list) =>
                            (list ?? []).filter((x) => x.id !== s.id),
                          );
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <input
                type="date"
                className="rounded-md border px-2 py-1 text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                className="rounded-md border px-2 py-1 text-xs"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <button
                type="button"
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                disabled={busy || !date || !time}
                onClick={() =>
                  run(async () => {
                    const created = await api.add(row.id, { date, time });
                    setSessions((list) =>
                      [...(list ?? []), created].sort((a, b) =>
                        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
                      ),
                    );
                    setDate("");
                    setTime("");
                  })
                }
              >
                Add session
              </button>
            </div>
          </>
        )}
        {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      </div>
    </div>
  );
}

export function TrainerBookingsTable({
  rows,
  summary,
  loadTrainers,
  onAssign,
  sessionApi,
}: {
  rows: TrainerBookingRow[];
  summary?: string;
  /** Live trainer roster for a YoActiv branch (for the assign dropdown). */
  loadTrainers?: (branchId: number) => Promise<TrainerOption[]>;
  /** When provided, staff can assign/reassign a trainer per row. */
  onAssign?: (
    id: number,
    body: { trainerId?: string; trainerName: string },
  ) => Promise<unknown>;
  /** When provided, staff can schedule/track PT session timings per row. */
  sessionApi?: PtSessionApi;
}) {
  const [branch, setBranch] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sessionsRow, setSessionsRow] = useState<TrainerBookingRow | null>(null);
  // Local overlay so a saved assignment shows immediately without refetch.
  const [savedNames, setSavedNames] = useState<Map<number, string>>(new Map());

  const branches = useMemo(
    () => Array.from(new Set(rows.map((r) => r.gymName))).sort(),
    [rows],
  );
  const filtered = rows.filter(
    (r) =>
      (branch === ALL || r.gymName === branch) &&
      (status === ALL || r.status === status),
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No personal-training bookings yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border px-2 py-1.5 text-sm"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          <option value={ALL}>All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border px-2 py-1.5 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value={ALL}>All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="enquiry">Enquiry</option>
        </select>
        {summary ? (
          <span className="ml-auto text-sm text-muted-foreground">{summary}</span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3">Mobile</th>
              <th className="py-2 pr-3">Branch</th>
              <th className="py-2 pr-3">Requested trainer</th>
              <th className="py-2 pr-3">Package</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Preferred date</th>
              <th className="py-2 pr-3">Status</th>
              {onAssign ? <th className="py-2 pr-3">Assigned trainer</th> : null}
              {sessionApi ? <th className="py-2 pr-3">Sessions</th> : null}
              <th className="py-2">Booked</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const assigned = savedNames.get(r.id) ?? r.assignedTrainerName;
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{r.memberName}</td>
                  <td className="py-2 pr-3">{r.mobile}</td>
                  <td className="py-2 pr-3">{r.gymName}</td>
                  <td className="py-2 pr-3">{r.trainerName || "—"}</td>
                  <td className="py-2 pr-3">
                    {r.serviceName ? `${r.serviceName} · ` : ""}
                    {r.packageName}
                  </td>
                  <td className="py-2 pr-3">
                    {r.status === "enquiry"
                      ? "—"
                      : `₹${r.amountInr.toLocaleString("en-IN")}`}
                  </td>
                  <td className="py-2 pr-3">{fmtDate(r.preferredDate)}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={r.status} />
                  </td>
                  {onAssign ? (
                    <td className="py-2 pr-3">
                      {editingId === r.id ? (
                        <AssignEditor
                          row={r}
                          loadTrainers={loadTrainers}
                          onAssign={onAssign}
                          onDone={(assignedName) => {
                            if (assignedName !== null) {
                              setSavedNames((m) =>
                                new Map(m).set(r.id, assignedName),
                              );
                            }
                            setEditingId(null);
                          }}
                        />
                      ) : (
                        <span className="flex items-center gap-2">
                          {assigned ? (
                            <span className="font-medium">{assigned}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <button
                            type="button"
                            className="rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                            onClick={() => setEditingId(r.id)}
                          >
                            {assigned ? "Change" : "Assign"}
                          </button>
                        </span>
                      )}
                    </td>
                  ) : null}
                  {sessionApi ? (
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                        onClick={() => setSessionsRow(r)}
                      >
                        Manage
                      </button>
                    </td>
                  ) : null}
                  <td className="py-2 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sessionApi && sessionsRow ? (
        <SessionsManager
          row={sessionsRow}
          api={sessionApi}
          onClose={() => setSessionsRow(null)}
        />
      ) : null}
    </div>
  );
}
