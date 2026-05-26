import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  UserPlus,
  Users as UsersIcon,
  KeyRound,
  FileText,
  LogOut,
} from "lucide-react";
import { staffApi, type StaffUser } from "@/lib/staffApi";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  perm: string;
};

const NAV: NavItem[] = [
  {
    label: "Partner Onboarding",
    href: "/staff/partner-onboarding",
    icon: <UserPlus className="h-4 w-4" />,
    perm: "partner.onboard",
  },
  {
    label: "Partners",
    href: "/staff/partners",
    icon: <UsersIcon className="h-4 w-4" />,
    perm: "partner.view",
  },
  {
    label: "Partner Documents",
    href: "/staff/partner-documents",
    icon: <FileText className="h-4 w-4" />,
    perm: "partner.document_upload",
  },
  {
    label: "Reset Partner Password",
    href: "/staff/reset-partner-password",
    icon: <KeyRound className="h-4 w-4" />,
    perm: "partner.assign_login",
  },
];

export function StaffCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export function StaffLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [me, setMe] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffApi
      .me()
      .then((u) => {
        setMe(u);
        setLoading(false);
      })
      .catch(() => navigate("/staff/login"));
  }, [navigate]);

  const logout = async () => {
    try {
      await staffApi.logout();
    } finally {
      navigate("/staff/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Loading…
      </div>
    );
  }
  if (!me) return null;

  const allowedNav = NAV.filter((n) => me.permissions.includes(n.perm));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-xs uppercase tracking-[0.2em] text-orange-400 font-bold">
            GYMCO
          </div>
          <div className="text-sm font-semibold text-white mt-0.5">
            Staff Portal
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link
            href="/staff"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              location === "/staff"
                ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          {allowedNav.length === 0 ? (
            <div className="text-xs text-slate-500 px-3 py-2">
              No features available. Contact an admin.
            </div>
          ) : (
            allowedNav.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })
          )}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 text-xs text-slate-400">
            Signed in as
            <div className="text-sm text-white font-medium truncate">
              {me.name}
            </div>
            <div className="truncate">{me.email}</div>
          </div>
          <button
            onClick={logout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-orange-500/40 text-sm text-slate-200"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="border-b border-slate-800 bg-slate-900/40 px-8 py-5">
          <h1 className="text-xl font-bold text-white">{title ?? ""}</h1>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export function PermissionGate({
  perm,
  children,
}: {
  perm: string;
  children: ReactNode;
}) {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    staffApi
      .me()
      .then((u) => {
        setMe(u);
        setLoading(false);
      })
      .catch(() => navigate("/staff/login"));
  }, [navigate]);
  if (loading) return null;
  if (!me) return null;
  if (!me.permissions.includes(perm)) {
    return (
      <StaffLayout title="Access denied">
        <StaffCard className="p-8 max-w-xl">
          <h2 className="text-lg font-bold text-white mb-2">
            Permission required
          </h2>
          <p className="text-sm text-slate-400">
            You don't have access to this feature. Ask an admin to grant the{" "}
            <code className="text-orange-300">{perm}</code> permission to your
            account.
          </p>
        </StaffCard>
      </StaffLayout>
    );
  }
  return <>{children}</>;
}
