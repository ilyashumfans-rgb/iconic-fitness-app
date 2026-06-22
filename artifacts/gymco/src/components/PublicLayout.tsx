import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, LogOut, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { SiteFooter } from "@/components/SiteFooter";
import { useUser, useClerk } from "@clerk/react";
import { useTheme } from "@/lib/theme";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function PublicNav() {
  const { theme } = useTheme();
  const headerLogo =
    theme === "dark"
      ? `${basePath}/media/iconic-fitness-header-logo-dark.png`
      : `${basePath}/media/iconic-fitness-header-logo-light.png`;
  const links = [
    { href: "/explore", label: "Browse Gyms" },
    { href: "/book-gx", label: "Book a GX Class" },
    { href: "/be-a-member", label: "Be a Member" },
    { href: "/store", label: "Store" },
    { href: "/blog", label: "Blog" },
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center" aria-label="Iconic Fitness home">
          <img
            src={headerLogo}
            alt="Iconic Fitness"
            className="h-16 md:h-20 w-auto object-contain"
          />
        </Link>
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
                  aria-label="Log out"
                  title="Log out"
                  className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-lg text-sm font-semibold text-muted-foreground border border-border hover:text-red-600 hover:border-red-300 hover:bg-red-50 dark:hover:text-red-400 dark:hover:border-red-900 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
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
              <Link href="/be-a-member" className="hidden sm:inline-flex">
                <Button className="bg-gradient-brand text-white border-none font-bold shadow-[0_8px_24px_-8px_hsl(96_56%_55%/0.7)] hover:opacity-95">
                  Get started <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {links.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded-lg px-3 py-3 text-base font-semibold text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 pt-6">
                {isSignedIn ? (
                  <>
                    <SheetClose asChild>
                      <Link href="/dashboard">
                        <Button variant="outline" className="w-full font-semibold gap-1.5">
                          <LayoutDashboard className="h-4 w-4" />
                          My dashboard
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full font-semibold gap-1.5 text-muted-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link href="/sign-in">
                        <Button variant="outline" className="w-full font-semibold">
                          Sign in
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/be-a-member">
                        <Button className="w-full bg-gradient-brand text-white border-none font-bold">
                          Get started <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </Link>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
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
