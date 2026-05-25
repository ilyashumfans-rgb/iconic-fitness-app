import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CheckCircle2,
  Dumbbell,
  Package,
  Settings,
  LogOut,
  RefreshCcw,
  Handshake,
} from "lucide-react";
import { partnerApi, type Partner } from "@/lib/partnerApi";

type Item = { label: string; href: string; icon: ReactNode };

const NAV: Item[] = [
  { label: "Dashboard", href: "/partner", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Gyms", href: "/partner/gyms", icon: <Building2 className="h-4 w-4" /> },
  { label: "Bookings", href: "/partner/bookings", icon: <Calendar className="h-4 w-4" /> },
  { label: "Check-ins", href: "/partner/checkins", icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: "Classes", href: "/partner/classes", icon: <Dumbbell className="h-4 w-4" /> },
  { label: "Products", href: "/partner/products", icon: <Package className="h-4 w-4" /> },
  { label: "Settings", href: "/partner/settings", icon: <Settings className="h-4 w-4" /> },
];

export function PartnerLayout({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}) {
  const [location, navigate] = useLocation();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnerApi
      .me()
      .then(setPartner)
      .catch(() => navigate("/partner/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await partnerApi.logout();
    } catch {
      // ignore
    }
    navigate("/partner/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Loading partner portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="rounded-xl bg-gradient-to-br from-purple-600/25 to-orange-500/20 border border-slate-800 p-4 text-center">
            <div className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
              GYMCO
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mt-1">
              Go To Any Gym
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-purple-400 font-semibold flex items-center justify-center gap-1.5">
              <Handshake className="h-3 w-3" />
              Partner Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/partner"
                ? location === "/partner"
                : location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-500/20"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="rounded-lg bg-slate-800/60 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
              Signed In As
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                {partner?.name?.[0]?.toUpperCase() ?? "P"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {partner?.name ?? "Partner"}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {partner?.email}
                </div>
              </div>
            </div>
            {partner?.status && partner.status !== "active" && (
              <div className="mt-2 text-[10px] uppercase tracking-wide text-amber-400 font-semibold">
                Status: {partner.status}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-8 flex items-center justify-between border-b border-slate-800 bg-slate-900/40 backdrop-blur">
          <h1 className="text-xl font-semibold text-white">
            {title ?? "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            {actions}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-purple-500/60 text-slate-300 hover:text-white text-sm transition-colors"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}

export function PartnerCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-slate-900 border border-slate-800 ${className}`}
    >
      {children}
    </div>
  );
}
