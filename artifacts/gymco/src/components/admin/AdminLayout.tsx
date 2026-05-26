import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  UserPlus,
  Users as UsersIcon,
  KeyRound,
  Dumbbell,
  Star,
  ShieldCheck,
  UserCog,
  CreditCard,
  Settings2,
  Package,
  ShoppingBag,
  LogOut,
  RefreshCcw,
  Sparkles,
  Activity,
} from "lucide-react";
import { adminApi, type AdminUser } from "@/lib/adminApi";

type Item = {
  label: string;
  href: string;
  icon: ReactNode;
};
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Core Management",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Partner Management",
    items: [
      {
        label: "Partner Onboarding",
        href: "/admin/partner-onboarding",
        icon: <UserPlus className="h-4 w-4" />,
      },
      {
        label: "Partners",
        href: "/admin/partners",
        icon: <UsersIcon className="h-4 w-4" />,
      },
      {
        label: "Reset Partners Password",
        href: "/admin/reset-partner-password",
        icon: <KeyRound className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Gym Management",
    items: [
      {
        label: "Gym Management",
        href: "/admin/gyms",
        icon: <Dumbbell className="h-4 w-4" />,
      },
      {
        label: "Featured Gyms",
        href: "/admin/featured-gyms",
        icon: <Star className="h-4 w-4" />,
      },
      {
        label: "Gym Verification",
        href: "/admin/gym-verification",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        label: "Amenities Catalog",
        href: "/admin/amenities",
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        label: "Workouts Catalog",
        href: "/admin/workouts",
        icon: <Activity className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "User Management",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        icon: <UsersIcon className="h-4 w-4" />,
      },
      {
        label: "User Management",
        href: "/admin/user-management",
        icon: <UserCog className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Membership Management",
    items: [
      {
        label: "Memberships",
        href: "/admin/memberships",
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        label: "Membership Management",
        href: "/admin/membership-management",
        icon: <Settings2 className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Store Management",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: <Package className="h-4 w-4" />,
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: <ShoppingBag className="h-4 w-4" />,
      },
    ],
  },
];

export function AdminLayout({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}) {
  const [location, navigate] = useLocation();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .me()
      .then((u) => setAdmin(u))
      .catch(() => navigate("/admin/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // ignore
    }
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="theme-portal min-h-screen bg-orange-50 flex items-center justify-center text-slate-500">
        Loading admin portal...
      </div>
    );
  }

  return (
    <div className="theme-portal min-h-screen bg-orange-50/40 text-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-orange-100 flex flex-col">
        <div className="p-5 border-b border-orange-100">
          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 text-center text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.55)]">
            <div className="text-2xl font-extrabold tracking-tight">GYMCO</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/85 mt-1">
              Go To Any Gym
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white font-bold">
              Admin Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {sec.title}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? location === "/admin"
                      : location === item.href ||
                        location.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30"
                          : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-orange-100 space-y-3">
          <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2 font-bold">
              Logged In As
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                {admin?.name?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {admin?.name ?? "Admin"}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {admin?.email}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold border border-orange-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-8 flex items-center justify-between border-b border-orange-100 bg-white/85 backdrop-blur">
          <h1 className="text-xl font-bold text-slate-900">
            {title ?? "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            {actions}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-200 hover:border-orange-500 text-slate-600 hover:text-orange-600 text-sm transition-colors bg-white"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh Data
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white border border-orange-100 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}
