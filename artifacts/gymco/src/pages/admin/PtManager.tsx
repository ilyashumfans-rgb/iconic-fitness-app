import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Loader2, Trophy, TrendingDown } from "lucide-react";

type Trainer = {
  staffId: number;
  staffName: string;
  activeMembers: number;
  expiredMembers: number;
  renewalsPending: number;
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

type BranchRevenue = { gymName: string; revenueInr: number };

type Overview = {
  month: string;
  trainers: Trainer[];
  branchRevenue: BranchRevenue[];
  bestPerformer: string;
  lowestPerformer: string;
  totalIncentivePayableInr: number;
  totalRevenueInr: number;
};

const inputCls =
  "px-2 py-1 rounded-lg bg-white border border-slate-300 text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 w-28";

function rupees(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function HeadlineCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  sub?: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black text-slate-900 mt-2">{value}</div>
      {sub ? <div className="text-xs text-slate-500 mt-1">{sub}</div> : null}
    </AdminCard>
  );
}

function TrainerRow({
  row,
  month,
  onSaved,
  onError,
}: {
  row: Trainer;
  month: string;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [target, setTarget] = useState(String(row.targetInr));
  const [adjustments, setAdjustments] = useState(String(row.adjustmentsInr));
  const [note, setNote] = useState(row.incentiveNote);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTarget(String(row.targetInr));
    setAdjustments(String(row.adjustmentsInr));
    setNote(row.incentiveNote);
  }, [row.targetInr, row.adjustmentsInr, row.incentiveNote]);

  const saveTarget = async () => {
    setBusy(true);
    try {
      await adminApi.pt.saveTarget({
        staffId: row.staffId,
        month,
        targetInr: Number(target),
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save target");
    } finally {
      setBusy(false);
    }
  };

  const saveIncentive = async (approvalStatus: "pending" | "approved") => {
    setBusy(true);
    try {
      await adminApi.pt.saveIncentive({
        staffId: row.staffId,
        month,
        adjustmentsInr: Number(adjustments),
        approvalStatus,
        note,
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save incentive");
    } finally {
      setBusy(false);
    }
  };

  const nextApproval =
    row.approvalStatus === "approved" ? "pending" : "approved";

  return (
    <tr className="border-b border-lime-50 align-top">
      <td className="px-3 py-3">
        <div className="font-bold text-slate-900">{row.staffName}</div>
        <div className="text-xs text-slate-500">
          Active {row.activeMembers} · Expired {row.expiredMembers}
        </div>
        <div className="text-xs text-amber-600">
          Renewals pending: {row.renewalsPending}
        </div>
      </td>
      <td className="px-3 py-3 font-medium text-slate-900">
        {rupees(row.salesInr)}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={inputCls}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <button
            onClick={saveTarget}
            disabled={busy}
            className="text-xs px-2 py-1 rounded-lg bg-lime-500/20 text-lime-700 border border-lime-500/40 disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          {rupees(row.remainingTargetInr)} left
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="font-bold text-slate-900">{row.achievementPct}%</div>
        <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-lime-500 to-green-500"
            style={{ width: `${Math.min(row.achievementPct, 100)}%` }}
          />
        </div>
      </td>
      <td className="px-3 py-3 text-slate-700">
        <div>{row.incentivePct}%</div>
        <div className="text-xs text-slate-500">
          gross {rupees(row.grossIncentiveInr)}
        </div>
      </td>
      <td className="px-3 py-3">
        <input
          type="number"
          className={inputCls}
          value={adjustments}
          onChange={(e) => setAdjustments(e.target.value)}
        />
        <input
          className="mt-1 px-2 py-1 rounded-lg bg-white border border-slate-300 text-black text-xs w-28"
          value={note}
          placeholder="Note"
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={() => saveIncentive(row.approvalStatus as "pending" | "approved")}
          disabled={busy}
          className="mt-1 block text-xs px-2 py-1 rounded-lg bg-lime-500/20 text-lime-700 border border-lime-500/40 disabled:opacity-50"
        >
          Save
        </button>
      </td>
      <td className="px-3 py-3 font-bold text-slate-900">
        {rupees(row.netIncentiveInr)}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider rounded-full border px-2 py-0.5 text-center ${
              row.approvalStatus === "approved"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            }`}
          >
            {row.approvalStatus}
          </span>
          <button
            onClick={() => saveIncentive(nextApproval)}
            disabled={busy}
            className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-lime-400 disabled:opacity-50"
          >
            {row.approvalStatus === "approved" ? "Set pending" : "Approve"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PtManager() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.pt
      .overview(month)
      .then((r) => setData(r as Overview))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [month]);

  return (
    <AdminLayout title="PT Manager">
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
        <AdminCard className="p-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Month
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-black focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
        </AdminCard>

        {/* Headline cards */}
        {data ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <HeadlineCard
              label="Total Revenue"
              value={rupees(data.totalRevenueInr)}
            />
            <HeadlineCard
              label="Total Incentive Payable"
              value={rupees(data.totalIncentivePayableInr)}
            />
            <HeadlineCard
              label="Best Performer"
              value={data.bestPerformer || "—"}
              icon={<Trophy className="h-3.5 w-3.5 text-amber-500" />}
            />
            <HeadlineCard
              label="Lowest Performer"
              value={data.lowestPerformer || "—"}
              icon={<TrendingDown className="h-3.5 w-3.5 text-red-500" />}
            />
          </div>
        ) : null}

        {/* Trainer table */}
        <AdminCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-lime-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Trainer Performance
            </h2>
          </div>
          {loading && !data ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              Loading…
            </div>
          ) : !data || data.trainers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No PT trainers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-lime-50/60 text-slate-600">
                  <tr className="text-left">
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Trainer
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Revenue
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Target
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Achievement
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Incentive %
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Adjustments
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Net Incentive
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px]">
                      Approval
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.trainers.map((t) => (
                    <TrainerRow
                      key={t.staffId}
                      row={t}
                      month={data.month}
                      onSaved={load}
                      onError={setErr}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        {/* Branch revenue */}
        <AdminCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-lime-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Branch Revenue
            </h2>
          </div>
          {!data || data.branchRevenue.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No branch revenue this month.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-lime-50/60 text-slate-600">
                <tr className="text-left">
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Branch
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.branchRevenue.map((b) => (
                  <tr key={b.gymName} className="border-b border-lime-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {b.gymName}
                    </td>
                    <td className="px-5 py-3 text-slate-900">
                      {rupees(b.revenueInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
