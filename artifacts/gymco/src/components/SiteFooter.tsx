import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Instagram,
  Facebook,
  Youtube,
  Mail,
  MapPin,
  Phone,
  ArrowRight,
  Apple,
  Smartphone,
} from "lucide-react";
import { WhatsAppButton, WhatsAppIcon } from "@/components/WhatsAppButton";
import { AiChatWidget } from "@/components/AiChatWidget";


const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Browse gyms", href: "/explore" },
      { label: "Store", href: "/store" },
      { label: "Memberships", href: "/memberships" },
      { label: "Iconic Fitness Wallet", href: "/wallet" },
      { label: "Corporate plans", href: "/corporate" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Become a trainer", href: "/become-a-trainer" },
      { label: "Blog", href: "/blog" },
      { label: "How it works", href: "/#how" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "/help" },
      { label: "Contact us", href: "/contact" },
      { label: "Cancellation policy", href: "/cancellation" },
      { label: "Safety guidelines", href: "/safety" },
      { label: "Refund policy", href: "/refund" },
      { label: "FAQs", href: "/faqs" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & conditions", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Cookie policy", href: "/cookies" },
    ],
  },
  {
    title: "Sign in",
    links: [
      { label: "Admin Login", href: "/admin/login" },
      { label: "Vendor Login", href: "/vendor/login" },
      { label: "Staff Login", href: "/staff/login" },
    ],
  },
];

const socials = [
  {
    Icon: Instagram,
    label: "Instagram",
    href: "https://www.instagram.com/iconicfitness_official/",
  },
  {
    Icon: Facebook,
    label: "Facebook",
    href: "https://www.facebook.com/iconicfitnessindiaofficial",
  },
  {
    Icon: Youtube,
    label: "YouTube",
    href: "https://www.youtube.com/c/IconicFitnessIndia",
  },
  {
    Icon: WhatsAppIcon,
    label: "WhatsApp",
    href: "https://wa.me/919480000248",
  },
];

export function SiteFooter() {
  return (
    <>
    <footer className="relative mt-24 border-t border-border bg-gradient-to-b from-background to-secondary/40">
      {/* Newsletter CTA strip */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-12">
        <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 md:p-12 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.18)]">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(84_60%_55%/0.18)] blur-3xl" />
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-10">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="mb-5">
              <Link
                href="/"
                aria-label="Iconic Fitness — home"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 p-5"
              >
                <img
                  src={`${import.meta.env.BASE_URL}media/iconic-fitness-logo-transparent.png`}
                  alt="Iconic Fitness — The Fitness Company"
                  className="h-24 w-auto"
                />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              One membership, unlimited gyms across India. Built for people who
              actually train.
            </p>

            <div className="mt-6 space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Flat No. 43, Koramangala 1st Block, Bengaluru, Karnataka</span>
              </div>
              <a
                href="mailto:iconicfitnessindia@gmail.com"
                className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4 text-primary shrink-0" />
                iconicfitnessindia@gmail.com
              </a>
              <a
                href="tel:07026276888"
                className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4 text-primary shrink-0" />
                070262 76888
              </a>
              <a
                href="tel:07026322322"
                className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4 text-primary shrink-0" />
                070263 22322
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
                    {l.href.startsWith("/") && !l.href.includes("#") ? (
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
              © {new Date().getFullYear()} Iconic Fitness India Pvt. Ltd. ·
            </span>
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <Link href="/cookies" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cookies
            </Link>
            <span className="text-xs text-muted-foreground">· Made in Bangalore</span>
          </div>
          <div className="flex items-center gap-2">
            {socials.map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
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
    <WhatsAppButton />
    <AiChatWidget />
    </>
  );
}
