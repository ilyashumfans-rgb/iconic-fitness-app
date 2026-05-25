import { useEffect, useState, type ReactNode } from "react";
import {
  Users,
  Building2,
  CreditCard,
  CheckCircle2,
  Activity,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";

type Stats = Awaited<ReturnType<typeof adminApi.stats>>;

const STAT_DEFS: {
  key: keyof Stats;
  label: string;
  hint: string;
  iconBg: string;
  icon: ReactNode;
  format?: (n: number) => string;
  growth?: string;
}[] = [
  {
    key: "totalPartners",
    label: "Total Partners",
    hint: "Active partner gyms",
    iconBg: "bg-blue-500",
    icon: <Users className="h-5 w-5 text-white" />,
    growth: "+8.2% this month",
  },
  {
    key: "totalGyms",
    label: "Total Gyms",
    hint: "Gym locations",
    iconBg: "bg-purple-500",
    icon: <Building2 className="h-5 w-5 text-white" />,
    growth: "+15.3% this month",
  },
  {
    key: "activeMemberships",
    label: "Active Memberships",
    hint: "Subscription plans",
    iconBg: "bg-emerald-500",
    icon: <Activity className="h-5 w-5 text-white" />,
    growth: "+20.1% this month",
  },
  {
    key: "totalActivities",
    label: "Total Activities",
    hint: "Workout types",
    iconBg: "bg-teal-500",
    icon: <CheckCircle2 className="h-5 w-5 text-white" />,
  },
  {
    key: "activeMembers",
    label: "Active Members",
    hint: "With subscriptions",
    iconBg: "bg-pink-500",
    icon: <Users className="h-5 w-5 text-white" />,
  },
  {
    key: "monthlyRevenue",
    label: "Monthly Revenue",
    hint: "Total earnings",
    iconBg: "bg-orange-500",
    icon: <CreditCard className="h-5 w-5 text-white" />,
    format: (n) => `₹${n.toLocaleString("en-IN")}`,
    growth: "+18.4% vs last month",
  },
];

const PIE_COLORS = ["#3b82f6", "#7c3aed", "#fb923c", "#10b981", "#ec4899"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {STAT_DEFS.map((s) => {
          const raw = (stats?.[s.key] as number | undefined) ?? 0;
          const value = s.format ? s.format(raw) : String(raw);
          return (
            <AdminCard key={s.key as string} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    {s.label}
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-white">
                    {value}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{s.hint}</div>
                </div>
                <div
                  className={`h-11 w-11 rounded-xl ${s.iconBg} flex items-center justify-center shadow-lg`}
                >
                  {s.icon}
                </div>
              </div>
              {s.growth && (
                <div className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="h-3 w-3" /> {s.growth}
                </div>
              )}
            </AdminCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <AdminCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-white">Activity (7 days)</div>
              <div className="text-xs text-slate-400">
                Check-ins & bookings
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.activitySeries ?? []}>
                <defs>
                  <linearGradient id="grad-c" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-b" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
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
                  stroke="#fb923c"
                  strokeWidth={2}
                  fill="url(#grad-c)"
                  name="Check-ins"
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#grad-b)"
                  name="Bookings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-white">Membership Types</div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {stats?.membershipTypes?.some((t) => t.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.membershipTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.membershipTypes.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    formatter={(v) => (
                      <span style={{ color: "#cbd5e1" }}>{v}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-500">
                No subscriptions yet
              </div>
            )}
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
