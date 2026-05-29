import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Dumbbell,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerStats } from "@/lib/partnerApi";

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

function Stat({
  label,
  value,
  hint,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  iconBg: string;
}) {
  return (
    <PartnerCard className="p-5">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <TrendingUp className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="mt-4 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400 font-medium">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </PartnerCard>
  );
}

export default function PartnerDashboard() {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    partnerApi.stats().then(setStats).catch((e) => setErr(String(e)));
  }, []);

  return (
    <PartnerLayout title="Dashboard">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}
      {!stats ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat
              label="Owned Gyms"
              value={String(stats.totalGyms)}
              hint="Locations under your account"
              icon={<Building2 className="h-5 w-5 text-white" />}
              iconBg="bg-orange-500"
            />
            <Stat
              label="Classes"
              value={String(stats.totalClasses)}
              hint="Scheduled sessions"
              icon={<Dumbbell className="h-5 w-5 text-white" />}
              iconBg="bg-orange-500"
            />
            <Stat
              label="Bookings"
              value={String(stats.totalBookings)}
              hint="All-time bookings"
              icon={<Calendar className="h-5 w-5 text-white" />}
              iconBg="bg-blue-500"
            />
            <Stat
              label="Check-ins"
              value={String(stats.totalCheckins)}
              hint="Visits across your gyms"
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              iconBg="bg-emerald-500"
            />
            <Stat
              label="Est. Revenue"
              value={formatInr(stats.revenueInr)}
              hint="Booking-based estimate"
              icon={<IndianRupee className="h-5 w-5 text-white" />}
              iconBg="bg-pink-500"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PartnerCard className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Activity (last 7 days)
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.activitySeries}>
                    <defs>
                      <linearGradient id="cIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: 8,
                        color: "#e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="checkins"
                      stroke="#f97316"
                      fill="url(#cIn)"
                      strokeWidth={2}
                      name="Check-ins"
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke="#fb923c"
                      fill="url(#bk)"
                      strokeWidth={2}
                      name="Bookings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </PartnerCard>

            <PartnerCard className="p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                Top performing gyms
              </h2>
              {stats.topGyms.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No check-ins recorded yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {stats.topGyms.map((g, i) => (
                    <li
                      key={g.gymId}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {g.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Gym #{g.gymId}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-orange-700">
                        {g.checkins}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PartnerCard>
          </div>

          <PartnerCard className="mt-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                Recent check-ins
              </h2>
            </div>
            {stats.recentCheckins.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No check-ins yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                    <th className="px-5 py-3">When</th>
                    <th className="px-5 py-3">Gym</th>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentCheckins.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/60">
                      <td className="px-5 py-3 text-slate-300">
                        {new Date(c.checkedInAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        Gym #{c.gymId}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        User #{c.userId}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs uppercase tracking-wide">
                          {c.method}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </PartnerCard>
        </>
      )}
    </PartnerLayout>
  );
}
