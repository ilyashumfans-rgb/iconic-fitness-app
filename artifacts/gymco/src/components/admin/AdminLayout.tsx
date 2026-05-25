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
  LogOut,
  RefreshCcw,
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Loading admin portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-600/20 border border-slate-800 p-4 text-center">
            <div className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
              GYMCO
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mt-1">
              Go To Any Gym
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-orange-400 font-semibold">
              Admin Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                          : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
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

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="rounded-lg bg-slate-800/60 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
              Logged In As
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {admin?.name?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {admin?.name ?? "Admin"}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {admin?.email}
                </div>
              </div>
            </div>
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

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-8 flex items-center justify-between border-b border-slate-800 bg-slate-900/40 backdrop-blur">
          <h1 className="text-xl font-semibold text-white">
            {title ?? "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            {actions}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-orange-500/60 text-slate-300 hover:text-white text-sm transition-colors"
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
      className={`rounded-2xl bg-slate-900 border border-slate-800 ${className}`}
    >
      {children}
    </div>
  );
}
