import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  LogOut,
  RefreshCcw,
  Store,
} from "lucide-react";
import { vendorApi, type Vendor } from "@/lib/vendorApi";
import { NotificationBell } from "@/components/NotificationBell";

type Item = { label: string; href: string; icon: ReactNode };

const NAV: Item[] = [
  { label: "Dashboard", href: "/vendor", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Products & Stock", href: "/vendor/products", icon: <Package className="h-4 w-4" /> },
  { label: "Orders & Bills", href: "/vendor/orders", icon: <ReceiptText className="h-4 w-4" /> },
  { label: "Settings", href: "/vendor/settings", icon: <Settings className="h-4 w-4" /> },
];

export function VendorLayout({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}) {
  const [location, navigate] = useLocation();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorApi
      .me()
      .then(setVendor)
      .catch(() => navigate("/vendor/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await vendorApi.logout();
    } catch {
      // ignore
    }
    navigate("/vendor/login");
  };

  if (loading) {
    return (
      <div className="theme-portal min-h-screen bg-lime-50 flex items-center justify-center text-slate-500">
        Loading vendor portal...
      </div>
    );
  }

  return (
    <div className="theme-portal min-h-screen bg-lime-50/40 text-slate-900 flex">
      <aside className="w-64 shrink-0 bg-white border-r border-lime-100 flex flex-col">
        <div className="p-5 border-b border-lime-100">
          <div className="rounded-xl bg-gradient-to-br from-lime-500 to-green-500 p-4 text-center text-white shadow-[0_12px_30px_-12px_rgba(101, 163, 13,0.55)]">
            <div className="text-2xl font-extrabold tracking-tight">Iconic Fitness</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/85 mt-1">
              Store Sellers
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white font-bold flex items-center justify-center gap-1.5">
              <Store className="h-3 w-3" />
              Vendor Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/vendor"
                ? location === "/vendor"
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
                {vendor?.name?.[0]?.toUpperCase() ?? "V"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {vendor?.name ?? "Vendor"}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {vendor?.email}
                </div>
              </div>
            </div>
            {vendor?.status && vendor.status !== "active" && (
              <div className="mt-2 text-[10px] uppercase tracking-wide text-green-600 font-bold">
                Status: {vendor.status}
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
        <header className="h-16 px-8 flex items-center justify-between border-b border-lime-100 bg-white/85 backdrop-blur">
          <h1 className="text-xl font-bold text-slate-900">
            {title ?? "Vendor Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            {actions}
            <NotificationBell
              api={{
                list: () => vendorApi.notifications.list(),
                markRead: (id) => vendorApi.notifications.markRead(id),
                markAllRead: () => vendorApi.notifications.markAllRead(),
              }}
              theme="portal"
            />
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-lime-200 hover:border-lime-500 text-slate-600 hover:text-lime-600 text-sm transition-colors bg-white"
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

export function VendorCard({
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
