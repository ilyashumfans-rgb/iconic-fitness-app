import { Link, useLocation } from "wouter";
import { 
  Home, 
  MapPin, 
  QrCode, 
  Calendar, 
  User, 
  Zap,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: MapPin },
    { href: "/checkin", label: "Check-in", icon: QrCode },
    { href: "/bookings", label: "Bookings", icon: Calendar },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const desktopNavItems = [
    ...navItems,
    { href: "/wallet", label: "Wallet", icon: Wallet },
    { href: "/trainers", label: "Trainers", icon: Zap },
    { href: "/memberships", label: "Memberships", icon: Zap },
  ]

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10 text-primary">
          <Zap className="h-8 w-8 fill-current" />
          <span className="text-2xl font-black uppercase tracking-tighter">Gymco</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {desktopNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="mt-auto pt-6 border-t border-border flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sidebar-accent overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.city}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="h-6 w-6 fill-current" />
            <span className="text-xl font-black uppercase tracking-tighter">Gymco</span>
          </div>
          {user && (
            <div className="text-xs font-semibold px-2 py-1 rounded bg-secondary">
              {user.city}
            </div>
          )}
        </header>

        <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg flex justify-around p-2 z-50">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg min-w-16 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
