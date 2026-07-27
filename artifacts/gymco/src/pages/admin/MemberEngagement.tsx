import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { HeartPulse, Phone, UserPlus } from "lucide-react";

type Row = Awaited<ReturnType<typeof adminApi.engagement.overview>>[number];

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

const BAND_STYLES: Record<Row["scoreBand"], string> = {
  green: "bg-green-100 text-green-700 border-green-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

export default function MemberEngagement() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("beginner");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyRow, setBusyRow] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminApi.engagement.overview());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const enrol = async () => {
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      await adminApi.engagement.assign(phone.trim(), level);
      setOk("Member enrolled in the 45-day plan.");
      setPhone("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to enrol member");
    } finally {
      setSaving(false);
    }
  };

  const changeLevel = async (row: Row, newLevel: string) => {
    if (newLevel === row.level) return;
    setBusyRow(row.id);
    setErr(null);
    try {
      await adminApi.engagement.assign(row.memberPhone, newLevel);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to change level");
    } finally {
      setBusyRow(null);
    }
  };

  const needsFollowup = rows.filter((r) => r.scoreBand !== "green");
  const onTrack = rows.filter((r) => r.scoreBand === "green");

  const renderTable = (list: Row[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-lime-50/60 text-slate-600">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Member</th>
            <th className="text-left px-4 py-2 font-semibold">Phone</th>
            <th className="text-left px-4 py-2 font-semibold">Progress</th>
            <th className="text-left px-4 py-2 font-semibold">Score</th>
            <th className="text-left px-4 py-2 font-semibold">Paid PT</th>
            <th className="text-left px-4 py-2 font-semibold">Level</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id} className="border-t border-lime-50">
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-800">
                  {r.memberName}
                </div>
                {r.gymName ? (
                  <div className="text-xs text-slate-500">{r.gymName}</div>
                ) : null}
              </td>
              <td className="px-4 py-3 text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {r.memberPhone}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700">
                Day {r.dayNumber}/{r.totalDays}
                <span className="text-xs text-slate-400"> · {r.status}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${BAND_STYLES[r.scoreBand]}`}
                >
                  {r.score}/100
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {r.hasPaidPt ? "Yes" : "No"}
              </td>
              <td className="px-4 py-3">
                <select
                  value={r.level}
                  disabled={busyRow === r.id}
                  onChange={(e) => changeLevel(r, e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-lime-50/60 border border-lime-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60 disabled:opacity-50"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout title="Member Engagement">
      <div className="space-y-4">
        <div className="bg-white border border-lime-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
            <UserPlus className="h-4 w-4 text-lime-500" />
            Enrol a member in the 45-day plan
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Member phone number"
              className="flex-1 px-3 py-2 rounded-lg bg-lime-50/60 border border-lime-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            />
            <select
              value={level}
              onChange={(e) =>
                setLevel(e.target.value as (typeof LEVELS)[number])
              }
              className="px-3 py-2 rounded-lg bg-lime-50/60 border border-lime-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <button
              onClick={enrol}
              disabled={saving || phone.trim().length < 10}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Enrolling…" : "Enrol"}
            </button>
          </div>
          {err && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {err}
            </div>
          )}
          {ok && (
            <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              {ok}
            </div>
          )}
        </div>

        <div className="bg-white border border-lime-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-lime-100 flex items-center gap-2 text-slate-800 font-bold">
            <HeartPulse className="h-4 w-4 text-red-500" />
            Needs follow-up
            <span className="text-xs font-normal text-slate-500">
              (low engagement first)
            </span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : needsFollowup.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No members need follow-up right now.
            </div>
          ) : (
            renderTable(needsFollowup)
          )}
        </div>

        <div className="bg-white border border-lime-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-lime-100 flex items-center gap-2 text-slate-800 font-bold">
            <HeartPulse className="h-4 w-4 text-green-500" />
            On track
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : onTrack.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No members in the green band yet.
            </div>
          ) : (
            renderTable(onTrack)
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
