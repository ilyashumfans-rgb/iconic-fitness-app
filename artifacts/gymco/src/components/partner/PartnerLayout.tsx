import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Dumbbell,
  UserCog,
  Package,
  Settings,
  LogOut,
  RefreshCcw,
  Handshake,
  Menu,
  X,
  Users,
  LifeBuoy,
} from "lucide-react";
import { partnerApi, type Partner } from "@/lib/partnerApi";
import { NotificationBell } from "@/components/NotificationBell";

type Item = {
  label: string;
  href: string;
  icon: ReactNode;
  // Permission a team member needs to see this item. Items with no `perm` are
  // always visible. `ownerOnly` items are hidden from team members entirely.
  perm?: string;
  ownerOnly?: boolean;
};

const NAV: Item[] = [
  { label: "Dashboard", href: "/partner", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Gyms", href: "/partner/gyms", icon: <Building2 className="h-4 w-4" />, perm: "gyms" },
  { label: "Bookings", href: "/partner/bookings", icon: <Calendar className="h-4 w-4" />, perm: "bookings" },
  { label: "Classes", href: "/partner/classes", icon: <Dumbbell className="h-4 w-4" />, perm: "classes" },
  { label: "Trainers", href: "/partner/trainers", icon: <UserCog className="h-4 w-4" />, perm: "classes" },
  { label: "Products", href: "/partner/products", icon: <Package className="h-4 w-4" />, perm: "products" },
  { label: "Tickets", href: "/partner/tickets", icon: <LifeBuoy className="h-4 w-4" /> },
  { label: "Team", href: "/partner/staff", icon: <Users className="h-4 w-4" />, ownerOnly: true },
  { label: "Profile & Settings", href: "/partner/settings", icon: <Settings className="h-4 w-4" />, ownerOnly: true },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    partnerApi
      .me()
      .then(setPartner)
      .catch(() => navigate("/partner/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Escape to close + lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

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
      <div className="theme-portal min-h-screen bg-lime-50 flex items-center justify-center text-slate-500">
        Loading partner portal...
      </div>
    );
  }

  return (
    <div className="theme-portal min-h-screen bg-lime-50/40 text-slate-900 lg:flex">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 shrink-0 bg-white border-r border-lime-100 flex flex-col transform transition-transform duration-300 ease-out lg:transform-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-lime-100 relative">
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-lime-50 hover:text-lime-600"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="rounded-xl bg-gradient-to-br from-lime-500 to-green-500 p-4 text-center text-white shadow-[0_12px_30px_-12px_rgba(101, 163, 13,0.55)]">
            <div className="text-2xl font-extrabold tracking-tight">Iconic Fitness</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/85 mt-1">
              Go To Any Gym
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white font-bold flex items-center justify-center gap-1.5">
              <Handshake className="h-3 w-3" />
              Partner Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.filter((item) => {
            if (!partner?.isStaff) return true;
            if (item.ownerOnly) return false;
            if (!item.perm) return true;
            return (partner.permissions ?? []).includes(item.perm);
          }).map((item) => {
            const active =
              item.href === "/partner"
                ? location === "/partner"
                : location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-gradient-to-r from-lime-500 to-lime-600 text-white shadow-md shadow-lime-500/30"
                    : "text-slate-600 hover:bg-lime-50 hover:text-lime-600"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-lime-100 space-y-3">
          <div className="rounded-lg bg-lime-50 border border-lime-100 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2 font-bold">
              Signed In As
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-lime-500 to-green-500 flex items-center justify-center text-white text-sm font-bold">
                {partner?.name?.[0]?.toUpperCase() ?? "P"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {partner?.name ?? "Partner"}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {partner?.email}
                </div>
              </div>
            </div>
            {partner?.status && partner.status !== "active" && (
              <div className="mt-2 text-[10px] uppercase tracking-wide text-green-600 font-bold">
                Status: {partner.status}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-lime-50 hover:bg-lime-100 text-lime-700 text-sm font-semibold border border-lime-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 lg:px-8 flex items-center justify-between border-b border-lime-100 bg-white/85 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-lime-200 text-lime-600 hover:bg-lime-50 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base lg:text-xl font-bold text-slate-900 truncate">
              {title ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {actions}
            <NotificationBell
              api={{
                list: () => partnerApi.notifications.list(),
                markRead: (id) => partnerApi.notifications.markRead(id),
                markAllRead: () => partnerApi.notifications.markAllRead(),
              }}
              theme="portal"
            />
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg border border-lime-200 hover:border-lime-500 text-slate-600 hover:text-lime-600 text-sm transition-colors bg-white"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Refresh</span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</div>
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
      className={`rounded-2xl bg-white border border-lime-100 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}
