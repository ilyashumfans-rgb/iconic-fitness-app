import { Link, useLocation } from "wouter";
import {
  Home,
  MapPin,
  QrCode,
  Calendar,
  User,
  Wallet,
  Dumbbell,
  Crown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

export function handleSignOut(navigate: (path: string) => void) {
  toast.success("Signed out", {
    description: "See you next workout.",
  });
  setTimeout(() => navigate("/"), 400);
}

function BrandMark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex flex-col leading-none group", className)}>
      <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-muted-foreground">
        Go to any gym
      </span>
      <span className="text-2xl font-black tracking-tight text-gradient-brand transition-transform group-hover:scale-[1.02] origin-left">
        GYMCO
      </span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: MapPin },
    { href: "/checkin", label: "Check-in", icon: QrCode },
    { href: "/bookings", label: "Bookings", icon: Calendar },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const desktopNavItems = [
    ...navItems,
    { href: "/wallet", label: "Wallet", icon: Wallet },
    { href: "/trainers", label: "Trainers", icon: Dumbbell },
    { href: "/memberships", label: "Memberships", icon: Crown },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl text-sidebar-foreground p-6 sticky top-0 h-screen">
        <BrandMark className="mb-10" />

        <nav className="flex-1 space-y-1.5">
          {desktopNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium overflow-hidden",
                  isActive
                    ? "bg-gradient-brand text-primary-foreground shadow-[0_8px_24px_-8px_hsl(18_100%_55%/0.6)]"
                    : "hover:bg-sidebar-accent/60 text-muted-foreground hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="mt-auto pt-6 border-t border-sidebar-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-sidebar shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-brand text-primary-foreground font-bold">
                    {user.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.city}</p>
              </div>
              <button
                type="button"
                onClick={() => handleSignOut(navigate)}
                aria-label="Sign out"
                title="Sign out"
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/70 backdrop-blur-xl sticky top-0 z-10">
          <BrandMark />
          {user && (
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-gradient-brand-soft border border-primary/20">
                {user.city}
              </div>
              <button
                type="button"
                onClick={() => handleSignOut(navigate)}
                aria-label="Sign out"
                className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/85 backdrop-blur-xl flex justify-around p-2 z-50">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-16 transition-all",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_hsl(18_100%_55%/0.7)]")} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
