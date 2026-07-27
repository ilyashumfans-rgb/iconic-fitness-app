import { Fragment, useEffect, useState, type FormEvent } from "react";
import {
  StaffLayout,
  StaffCard,
  PermissionGate,
} from "@/components/staff/StaffLayout";
import { staffApi } from "@/lib/staffApi";
import {
  Loader2,
  Phone,
  MessageCircle,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  AlertTriangle,
} from "lucide-react";

type SevenDayExpiry = {
  id: number;
  memberName: string;
  mobile: string;
  endDate: string;
  daysLeft: number;
  amountPaidInr: number;
};

type Summary = {
  activeMembers: number;
  expiredMembers: number;
  revenueTodayInr: number;
  revenueMonthInr: number;
  revenueYearInr: number;
  pendingPaymentsInr: number;
  lostRevenueInr: number;
  todaysSessions: number;
  pendingRenewals: number;
  sevenDayExpiry: SevenDayExpiry[];
};

type Target = {
  salesInr: number;
  targetInr: number;
  achievementPct: number;
  remainingTargetInr: number;
  incentivePct: number;
  grossIncentiveInr: number;
  adjustmentsInr: number;
  netIncentiveInr: number;
  approvalStatus: string;
  incentiveNote: string;
};

type Alert = { kind: string; message: string };

type SummaryResponse = {
  month: string;
  summary: Summary;
  target: Target;
  alerts: Alert[];
};

type Member = {
  id: number;
  memberName: string;
  membershipId: string;
  mobile: string;
  gymName: string;
  packageName: string;
  startDate: string;
  endDate: string;
  amountPaidInr: number;
  paymentStatus: string;
  originalSessions: number;
  daysCompleted: number;
  remainingDays: number;
  daysLeft: number;
  sessionsAvailable: number;
  sessionsDelivered: number;
  lastSessionDate: string;
  todayAttendance: boolean;
  renewalStatus: string;
  followUpDate: string;
  status: string;
};

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60";

function rupees(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function digits10(mobile: string): string {
  return (mobile || "").replace(/\D/g, "").slice(-10);
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <StaffCard className="p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
      {sub ? <div className="mt-1">{sub}</div> : null}
    </StaffCard>
  );
}

function approvalBadge(status: string) {
  const approved = status === "approved";
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider rounded-full border px-2 py-0.5 ${
        approved
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-amber-100 text-amber-700 border-amber-200"
      }`}
    >
      {approved ? "Approved" : "Pending"}
    </span>
  );
}

const RENEWAL_OPTIONS = [
  { key: "pending", label: "Pending" },
  { key: "renewed", label: "Renewed" },
  { key: "lost", label: "Lost" },
];

function RenewForm({
  member,
  onDone,
  onError,
}: {
  member: Member;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [f, setF] = useState({
    packageName: member.packageName,
    durationDays: String(member.originalSessions ? member.remainingDays || 30 : 30),
    originalSessions: String(member.originalSessions || 12),
    amountPaidInr: String(member.amountPaidInr || 0),
    startDate: today(),
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await staffApi.pt.renewMember(member.id, {
        packageName: f.packageName,
        durationDays: Number(f.durationDays),
        originalSessions: Number(f.originalSessions),
        amountPaidInr: Number(f.amountPaidInr),
        paymentStatus: "paid",
        startDate: f.startDate,
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Renewal failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end bg-lime-50/60 border border-lime-100 rounded-xl p-3"
    >
      <div className="col-span-2 sm:col-span-1">
        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
          Package
        </label>
        <input
          className={inputCls}
          value={f.packageName}
          onChange={(e) => setF({ ...f, packageName: e.target.value })}
          placeholder="Package"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
          Duration (days)
        </label>
        <input
          type="number"
          className={inputCls}
          value={f.durationDays}
          onChange={(e) => setF({ ...f, durationDays: e.target.value })}
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
          Sessions
        </label>
        <input
          type="number"
          className={inputCls}
          value={f.originalSessions}
          onChange={(e) => setF({ ...f, originalSessions: e.target.value })}
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
          Amount (₹)
        </label>
        <input
          type="number"
          className={inputCls}
          value={f.amountPaidInr}
          onChange={(e) => setF({ ...f, amountPaidInr: e.target.value })}
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
          Start date
        </label>
        <input
          type="date"
          className={inputCls}
          value={f.startDate}
          onChange={(e) => setF({ ...f, startDate: e.target.value })}
        />
      </div>
      <div className="col-span-2 sm:col-span-5 flex gap-2">
        <button
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white font-semibold text-sm disabled:opacity-60"
        >
          {busy ? "Renewing…" : "Confirm renewal"}
        </button>
      </div>
    </form>
  );
}

function MemberTable({
  rows,
  busy,
  onChanged,
  onError,
}: {
  rows: Member[];
  busy: boolean;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [renewFor, setRenewFor] = useState<number | null>(null);

  const markAttendance = async (id: number) => {
    try {
      await staffApi.pt.markAttendance(id);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to mark attendance");
    }
  };

  const setRenewal = async (id: number, renewalStatus: string) => {
    try {
      await staffApi.pt.updateMember(id, { renewalStatus });
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  if (busy) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
        Loading members…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500">No members here yet.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-lime-50/60 text-slate-600">
          <tr className="text-left">
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Member
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Package
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Dates
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Payment
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Sessions avail. (auto)
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Delivered
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Renewal
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Contact
            </th>
            <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lime-50">
          {rows.map((r) => {
            const wa = digits10(r.mobile);
            return (
              <Fragment key={r.id}>
                <tr className="hover:bg-lime-50/40 align-top">
                  <td className="px-3 py-3">
                    <div className="font-bold text-slate-900">{r.memberName}</div>
                    {r.membershipId ? (
                      <div className="text-xs text-slate-500">
                        ID: {r.membershipId}
                      </div>
                    ) : null}
                    {r.gymName ? (
                      <div className="text-xs text-slate-500">{r.gymName}</div>
                    ) : null}
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border ${
                        r.status === "active"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">
                      {r.packageName || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.daysCompleted}/{r.daysCompleted + r.remainingDays} days ·{" "}
                      {r.daysLeft >= 0
                        ? `${r.daysLeft}d left`
                        : `${Math.abs(r.daysLeft)}d ago`}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    <div>Start: {r.startDate}</div>
                    <div>End: {r.endDate}</div>
                    {r.followUpDate ? (
                      <div className="text-amber-600">
                        Follow up: {r.followUpDate}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">
                      {rupees(r.amountPaidInr)}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border ${
                        r.paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                    >
                      {r.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-900">
                    {r.sessionsAvailable}
                    <div className="text-[10px] font-normal text-slate-500">
                      of {r.originalSessions}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-900">
                    {r.sessionsDelivered}
                    {r.lastSessionDate ? (
                      <div className="text-[10px] font-normal text-slate-500">
                        last {r.lastSessionDate}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={r.renewalStatus}
                      onChange={(e) => setRenewal(r.id, e.target.value)}
                      className="text-[11px] font-bold uppercase tracking-wider rounded-lg border border-slate-300 bg-white text-black px-2 py-1"
                    >
                      {RENEWAL_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${r.mobile}`}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-lime-50 border border-lime-200 text-lime-700 hover:bg-lime-100"
                        title="Call"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                      {wa.length === 10 ? (
                        <a
                          href={`https://wa.me/91${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WA
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => markAttendance(r.id)}
                        disabled={r.todayAttendance}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${
                          r.todayAttendance
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-white border-slate-300 text-slate-700 hover:border-lime-400"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {r.todayAttendance ? "Present" : "Mark attendance"}
                      </button>
                      <button
                        onClick={() =>
                          setRenewFor(renewFor === r.id ? null : r.id)
                        }
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-lime-400"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Renew
                      </button>
                    </div>
                  </td>
                </tr>
                {renewFor === r.id ? (
                  <tr>
                    <td colSpan={9} className="px-3 pb-4">
                      <RenewForm
                        member={r}
                        onError={onError}
                        onDone={() => {
                          setRenewFor(null);
                          onChanged();
                        }}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddMemberForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    memberName: "",
    mobile: "",
    membershipId: "",
    packageName: "",
    durationDays: "30",
    originalSessions: "12",
    amountPaidInr: "",
    paymentStatus: "paid",
    startDate: today(),
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await staffApi.pt.createMember({
        memberName: f.memberName,
        mobile: f.mobile,
        membershipId: f.membershipId,
        packageName: f.packageName,
        durationDays: Number(f.durationDays),
        originalSessions: Number(f.originalSessions),
        amountPaidInr: Number(f.amountPaidInr || 0),
        paymentStatus: f.paymentStatus,
        startDate: f.startDate,
        notes: f.notes,
      });
      setF({
        memberName: "",
        mobile: "",
        membershipId: "",
        packageName: "",
        durationDays: "30",
        originalSessions: "12",
        amountPaidInr: "",
        paymentStatus: "paid",
        startDate: today(),
        notes: "",
      });
      setOpen(false);
      onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <StaffCard className="p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-bold text-slate-900"
      >
        <UserPlus className="h-4 w-4 text-lime-600" />
        Add PT member
        <span className="text-xs text-slate-400">
          {open ? "(hide)" : "(show)"}
        </span>
      </button>
      {open ? (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Member name
              </label>
              <input
                required
                className={inputCls}
                value={f.memberName}
                onChange={(e) => setF({ ...f, memberName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Mobile
              </label>
              <input
                className={inputCls}
                value={f.mobile}
                onChange={(e) => setF({ ...f, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Membership ID
              </label>
              <input
                className={inputCls}
                value={f.membershipId}
                onChange={(e) => setF({ ...f, membershipId: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Package
              </label>
              <input
                className={inputCls}
                value={f.packageName}
                onChange={(e) => setF({ ...f, packageName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                required
                className={inputCls}
                value={f.durationDays}
                onChange={(e) => setF({ ...f, durationDays: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Sessions
              </label>
              <input
                type="number"
                required
                className={inputCls}
                value={f.originalSessions}
                onChange={(e) => setF({ ...f, originalSessions: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Amount paid (₹)
              </label>
              <input
                type="number"
                className={inputCls}
                value={f.amountPaidInr}
                onChange={(e) => setF({ ...f, amountPaidInr: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Payment status
              </label>
              <select
                className={inputCls}
                value={f.paymentStatus}
                onChange={(e) => setF({ ...f, paymentStatus: e.target.value })}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Start date
              </label>
              <input
                type="date"
                required
                className={inputCls}
                value={f.startDate}
                onChange={(e) => setF({ ...f, startDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Notes
            </label>
            <textarea
              className={inputCls}
              rows={2}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </div>
          <button
            disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white font-semibold disabled:opacity-60"
          >
            {busy ? "Adding…" : "Add PT member"}
          </button>
        </form>
      ) : null}
    </StaffCard>
  );
}

function PtDashboardInner() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [tab, setTab] = useState<"active" | "expired">("active");
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadSummary = () => {
    setLoadingSummary(true);
    staffApi.pt
      .summary(month)
      .then((r) => setData(r as SummaryResponse))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoadingSummary(false));
  };

  const loadMembers = () => {
    setLoadingMembers(true);
    staffApi.pt
      .members(tab)
      .then((r) => setMembers(r.rows as Member[]))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoadingMembers(false));
  };

  useEffect(loadSummary, [month]);
  useEffect(loadMembers, [tab]);

  const refreshAll = () => {
    loadSummary();
    loadMembers();
  };

  const summary = data?.summary;
  const target = data?.target;

  return (
    <StaffLayout title="PT Training Dashboard">
      <div className="space-y-6">
        {err ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>{err}</span>
            <button onClick={() => setErr(null)} className="text-red-500">
              ✕
            </button>
          </div>
        ) : null}

        {/* Month picker */}
        <StaffCard className="p-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Month
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-black focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          />
          {loadingSummary ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
        </StaffCard>

        {/* Summary cards */}
        {summary && target ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Active PT Members"
              value={String(summary.activeMembers)}
            />
            <StatCard label="Expired" value={String(summary.expiredMembers)} />
            <StatCard
              label="Revenue This Month"
              value={rupees(summary.revenueMonthInr)}
              sub={
                <span className="text-xs text-slate-500">
                  Today {rupees(summary.revenueTodayInr)} · Year{" "}
                  {rupees(summary.revenueYearInr)}
                </span>
              }
            />
            <StatCard
              label="Target Achievement"
              value={`${target.achievementPct}%`}
              sub={
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-lime-500 to-green-500"
                      style={{
                        width: `${Math.min(target.achievementPct, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {rupees(target.salesInr)} / {rupees(target.targetInr)} ·{" "}
                    {rupees(target.remainingTargetInr)} left
                  </div>
                </div>
              }
            />
            <StatCard
              label="Incentive Earned"
              value={rupees(target.netIncentiveInr)}
              sub={
                <div className="flex items-center gap-2">
                  {approvalBadge(target.approvalStatus)}
                  <span className="text-[10px] text-slate-500">
                    {target.incentivePct}% · gross{" "}
                    {rupees(target.grossIncentiveInr)}
                  </span>
                </div>
              }
            />
            <StatCard
              label="Today's PT Sessions"
              value={String(summary.todaysSessions)}
            />
            <StatCard
              label="Pending Renewals"
              value={String(summary.pendingRenewals)}
              sub={
                <span className="text-xs text-slate-500">
                  Pending pay {rupees(summary.pendingPaymentsInr)}
                </span>
              }
            />
            <StatCard
              label="≤7 Days Left"
              value={String(summary.sevenDayExpiry.length)}
              sub={
                <span className="text-xs text-slate-500">
                  Lost revenue {rupees(summary.lostRevenueInr)}
                </span>
              }
            />
          </div>
        ) : null}

        {/* Alerts */}
        {data && data.alerts.length > 0 ? (
          <StaffCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Alerts
              </h2>
            </div>
            <ul className="space-y-2">
              {data.alerts.map((a, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                >
                  {a.message}
                </li>
              ))}
            </ul>
          </StaffCard>
        ) : null}

        {/* ≤7 day expiry list */}
        {summary && summary.sevenDayExpiry.length > 0 ? (
          <StaffCard className="p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
              Members with ≤7 days left
            </h2>
            <ul className="divide-y divide-lime-50">
              {summary.sevenDayExpiry.map((m) => {
                const wa = digits10(m.mobile);
                return (
                  <li
                    key={m.id}
                    className="py-2 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {m.memberName}
                      </span>{" "}
                      <span className="text-xs text-slate-500">
                        expires {m.endDate} ({m.daysLeft}d) ·{" "}
                        {rupees(m.amountPaidInr)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${m.mobile}`}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-lime-50 border border-lime-200 text-lime-700"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                      {wa.length === 10 ? (
                        <a
                          href={`https://wa.me/91${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WA
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </StaffCard>
        ) : null}

        {/* Member tables with tabs */}
        <StaffCard>
          <div className="p-3 border-b border-lime-50 flex gap-2">
            {(["active", "expired"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${
                  tab === t
                    ? "bg-gradient-to-r from-lime-500 to-green-500 text-white shadow"
                    : "bg-white border border-lime-100 text-slate-600 hover:border-lime-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <MemberTable
            rows={members}
            busy={loadingMembers}
            onChanged={refreshAll}
            onError={setErr}
          />
        </StaffCard>

        {/* Add member */}
        <AddMemberForm onCreated={refreshAll} onError={setErr} />
      </div>
    </StaffLayout>
  );
}

export default function PtDashboard() {
  return (
    <PermissionGate perm="pt.manage">
      <PtDashboardInner />
    </PermissionGate>
  );
}
