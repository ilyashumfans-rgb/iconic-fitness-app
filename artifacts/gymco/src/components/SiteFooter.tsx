import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ArrowRight,
  Apple,
  Smartphone,
} from "lucide-react";

const logoUrl = `${import.meta.env.BASE_URL}media/gymco-logo.png`;

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Browse gyms", href: "/explore" },
      { label: "Classes", href: "/classes" },
      { label: "Trainers", href: "/trainers" },
      { label: "Memberships", href: "/memberships" },
      { label: "GYMCO Wallet", href: "/wallet" },
      { label: "Corporate plans", href: "#" },
    ],
  },
  {
    title: "Cities",
    links: [
      { label: "Bangalore", href: "/explore?city=Bangalore" },
      { label: "Mumbai", href: "/explore?city=Mumbai" },
      { label: "Delhi NCR", href: "/explore?city=Delhi" },
      { label: "Hyderabad", href: "/explore?city=Hyderabad" },
      { label: "Pune", href: "/explore?city=Pune" },
      { label: "Chennai", href: "/explore?city=Chennai" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "#" },
      { label: "Press", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Partner gyms", href: "#" },
      { label: "Become a trainer", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "#" },
      { label: "Contact us", href: "#" },
      { label: "Cancellation policy", href: "#" },
      { label: "Safety guidelines", href: "#" },
      { label: "Refund policy", href: "#" },
      { label: "FAQs", href: "#" },
    ],
  },
];

const socials = [
  { Icon: Instagram, label: "Instagram", href: "#" },
  { Icon: Twitter, label: "Twitter", href: "#" },
  { Icon: Facebook, label: "Facebook", href: "#" },
  { Icon: Youtube, label: "YouTube", href: "#" },
  { Icon: Linkedin, label: "LinkedIn", href: "#" },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border bg-gradient-to-b from-background to-secondary/40">
      {/* Newsletter CTA strip */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-12">
        <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 md:p-12 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.18)]">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(268_76%_58%/0.18)] blur-3xl" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
                Newsletter
              </div>
              <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-[1.05]">
                Weekly class drops.{" "}
                <span className="text-gradient-brand">Zero spam.</span>
              </h3>
              <p className="text-muted-foreground mt-3 text-sm md:text-base">
                Get city-specific gym launches, trainer features, and member-only
                offers — straight to your inbox.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col sm:flex-row gap-2 w-full"
            >
              <div className="flex-1 flex items-center gap-3 px-4 rounded-xl bg-secondary border border-border">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="footer-newsletter-email"
                  type="email"
                  placeholder="your@email.com"
                  aria-label="Email address"
                  className="border-0 bg-transparent h-12 text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                />
              </div>
              <Button
                type="submit"
                className="bg-gradient-brand text-white border-none h-12 px-6 font-black tracking-wide hover:opacity-95"
              >
                Subscribe <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main link grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <img
                src={logoUrl}
                alt="GYMCO"
                className="h-10 w-10 object-contain"
              />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-muted-foreground">
                  Go to any gym
                </span>
                <span className="text-2xl font-black tracking-tight text-gradient-brand">
                  GYMCO
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              One membership, unlimited gyms across India. Built for people who
              actually train.
            </p>

            <div className="mt-6 space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Indiranagar, Bangalore 560038</span>
              </div>
              <a
                href="mailto:hello@gymco.in"
                className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4 text-primary shrink-0" />
                hello@gymco.in
              </a>
              <a
                href="tel:+918001234567"
                className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4 text-primary shrink-0" />
                +91 80 0123 4567
              </a>
            </div>

            {/* App store badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <Apple className="h-5 w-5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] opacity-80">Download on</span>
                  <span className="text-sm font-black">App Store</span>
                </div>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <Smartphone className="h-5 w-5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] opacity-80">Get it on</span>
                  <span className="text-sm font-black">Google Play</span>
                </div>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground mb-4">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} GYMCO India Pvt. Ltd. ·
            </span>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <span className="text-xs text-muted-foreground">·</span>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <span className="text-xs text-muted-foreground">·</span>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cookies
            </a>
            <span className="text-xs text-muted-foreground">· Made in Bangalore</span>
          </div>
          <div className="flex items-center gap-2">
            {socials.map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-white hover:bg-gradient-brand hover:border-transparent transition-all"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
