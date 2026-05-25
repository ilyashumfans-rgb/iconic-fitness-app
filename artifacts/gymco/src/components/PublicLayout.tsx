import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const logoUrl = `${import.meta.env.BASE_URL}media/gymco-logo.png`;

function PublicNav() {
  const links = [
    { href: "/explore", label: "Gyms" },
    { href: "/classes", label: "Classes" },
    { href: "/trainers", label: "Trainers" },
    { href: "/memberships", label: "Pricing" },
  ];
  return (
    <header className="sticky top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src={logoUrl} alt="GYMCO" className="h-9 w-9 object-contain" />
          <span className="text-xl font-black tracking-tight text-gradient-brand">
            GYMCO
          </span>
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
          <Link href="/memberships" className="hidden sm:inline-flex">
            <Button variant="ghost" className="font-semibold">
              Sign in
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-gradient-brand text-white border-none font-bold shadow-[0_8px_24px_-8px_hsl(18_100%_55%/0.7)] hover:opacity-95">
              Open app <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-border py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt="GYMCO" className="h-8 w-8 object-contain" />
            <span className="text-lg font-black tracking-tight text-gradient-brand">
              GYMCO
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GYMCO. Built in India for India.
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicNav />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
