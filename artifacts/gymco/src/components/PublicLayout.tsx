import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, LogOut } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo } from "@/components/BrandLogo";
import { useUser, useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function PublicNav() {
  const links = [
    { href: "/explore", label: "Browse Gyms" },
    { href: "/be-a-member", label: "Be a Member" },
    { href: "/store", label: "Store" },
    { href: "/memberships", label: "Pricing" },
  ];

  let isSignedIn = false;
  let displayName = "";
  let avatarUrl = "";
  try {
    const u = useUser();
    isSignedIn = !!u.isSignedIn;
    if (u.user) {
      const first = u.user.firstName ?? "";
      const last = u.user.lastName ?? "";
      displayName =
        `${first} ${last}`.trim() ||
        u.user.username ||
        u.user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
        "Member";
      avatarUrl = u.user.imageUrl ?? "";
    }
  } catch {
    // Clerk provider unavailable — fall back to signed-out UI
  }
  let clerk: ReturnType<typeof useClerk> | null = null;
  try {
    clerk = useClerk();
  } catch {
    clerk = null;
  }
  const handleSignOut = () => {
    if (!clerk) return;
    void clerk.signOut({ redirectUrl: basePath || "/" });
  };

  return (
    <header className="sticky top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <BrandLogo />
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline-flex">
                <Button
                  variant="ghost"
                  className="font-semibold gap-1.5"
                  title={`Signed in as ${displayName}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My dashboard
                </Button>
              </Link>
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/30"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-brand text-white flex items-center justify-center text-sm font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-foreground max-w-[120px] truncate">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              <Link href="/dashboard" className="sm:hidden">
                <Button className="bg-gradient-brand text-white border-none font-bold shadow-[0_8px_24px_-8px_hsl(96_56%_55%/0.7)] hover:opacity-95">
                  Open app <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="hidden sm:inline-flex">
                <Button variant="ghost" className="font-semibold">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-gradient-brand text-white border-none font-bold shadow-[0_8px_24px_-8px_hsl(96_56%_55%/0.7)] hover:opacity-95">
                  Get started <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicNav />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
