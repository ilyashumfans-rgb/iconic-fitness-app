import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  Calendar,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              label="Owned Gyms"
              value={String(stats.totalGyms)}
              hint="Locations under your account"
              icon={<Building2 className="h-5 w-5 text-white" />}
              iconBg="bg-lime-500"
            />
            <Stat
              label="Classes"
              value={String(stats.totalClasses)}
              hint="Scheduled sessions"
              icon={<Dumbbell className="h-5 w-5 text-white" />}
              iconBg="bg-lime-500"
            />
            <Stat
              label="Bookings"
              value={String(stats.totalBookings)}
              hint="All-time bookings"
              icon={<Calendar className="h-5 w-5 text-white" />}
              iconBg="bg-blue-500"
            />
            <Stat
              label="Est. Revenue"
              value={formatInr(stats.revenueInr)}
              hint="Booking-based estimate"
              icon={<IndianRupee className="h-5 w-5 text-white" />}
              iconBg="bg-pink-500"
            />
          </div>

          <div className="mt-6">
            <PartnerCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Bookings (last 7 days)
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.activitySeries}>
                    <defs>
                      <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#84cc16" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
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
                      dataKey="bookings"
                      stroke="#84cc16"
                      fill="url(#bk)"
                      strokeWidth={2}
                      name="Bookings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </PartnerCard>
          </div>
        </>
      )}
    </PartnerLayout>
  );
}
