import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListFeaturedGyms } from "@workspace/api-client-react";
import NearbyGyms from "@/components/NearbyGyms";
import { SiteFooter as Footer } from "@/components/SiteFooter";
import {
  ArrowRight,
  MapPin,
  Calendar,
  QrCode,
  Flame,
  Dumbbell,
  Heart,
  Sparkles,
  Trophy,
  Check,
  ChevronRight,
  Quote,
  Star,
  Search,
  Clock,
  Crown,
  Activity,
  TrendingUp,
  Users,
  Smartphone,
  Zap,
  Sun,
  Moon,
  Pause,
  Play,
  VolumeX,
  Volume2,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

const popularCities = [
  "Bangalore",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
];

const partnerGyms = [
  { name: "Cult.fit", letters: "CULT" },
  { name: "Gold's Gym", letters: "GOLD'S" },
  { name: "Anytime Fitness", letters: "ANYTIME" },
  { name: "Snap Fitness", letters: "SNAP" },
  { name: "Talwalkars", letters: "TALWALKARS" },
  { name: "F45", letters: "F45" },
];

const stats = [
  { value: "500+", label: "Premium gyms" },
  { value: "12", label: "Cities live" },
  { value: "8K+", label: "Classes / month" },
  { value: "4.9", label: "App rating" },
];

const categories = [
  {
    name: "Strength",
    image:
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&q=80",
    sessions: "1,200+ sessions",
  },
  {
    name: "Yoga & Pilates",
    image:
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80",
    sessions: "800+ sessions",
  },
  {
    name: "HIIT & CrossFit",
    image:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80",
    sessions: "950+ sessions",
  },
  {
    name: "Combat & MMA",
    image:
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=900&q=80",
    sessions: "420+ sessions",
  },
  {
    name: "Cycling",
    image:
      "https://images.unsplash.com/photo-1591741535018-d042766c62eb?w=900&q=80",
    sessions: "600+ sessions",
  },
  {
    name: "Dance & Zumba",
    image:
      "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=900&q=80",
    sessions: "380+ sessions",
  },
];

const steps = [
  {
    icon: MapPin,
    title: "Pick any gym",
    body: "Discover 500+ premium gyms across India. Switch on a whim — your pass works everywhere.",
  },
  {
    icon: Calendar,
    title: "Book a class",
    body: "Yoga to MMA, sunrise to midnight. Reserve a spot in seconds with live capacity.",
  },
  {
    icon: QrCode,
    title: "Walk in. Train.",
    body: "Flash your rotating QR at the front desk. No signups, no paperwork, ever.",
  },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Product Designer · Bangalore",
    quote:
      "I switched between three gyms in one week — strength on Monday, reformer on Wednesday, MMA on Saturday. GYMCO made it feel effortless.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
  },
  {
    name: "Rohan Kapoor",
    role: "Founder · Mumbai",
    quote:
      "The Elite plan pays for itself in week one. I train near my apartment, my office, and the airport lounge gym. One pass.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
  },
  {
    name: "Anjali Iyer",
    role: "Marathon runner · Delhi",
    quote:
      "The trainer marketplace is the secret weapon. Real coaches, real progress. My PB dropped 12 minutes this season.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
  },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur hover:border-primary/40 hover:text-primary transition-colors"
    >
      <Sun
        className={`h-4 w-4 absolute transition-all duration-300 ${
          isDark
            ? "opacity-0 rotate-90 scale-50"
            : "opacity-100 rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all duration-300 ${
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-50"
        }`}
      />
    </button>
  );
}

function TopNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-black tracking-tight text-gradient-brand"
        >
          GYMCO
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/explore" className="hover:text-foreground transition-colors">
            Browse Gyms
          </Link>
          <Link href="/classes" className="hover:text-foreground transition-colors">
            Classes
          </Link>
          <Link href="/store" className="hover:text-foreground transition-colors">
            Store
          </Link>
          <Link href="/memberships" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <a href="#how" className="hover:text-foreground transition-colors">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/sign-in">
            <Button variant="ghost" className="text-sm font-semibold hidden sm:inline-flex">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-gradient-brand text-white border-none font-bold shadow-[0_8px_24px_-8px_hsl(18_100%_55%/0.7)] hover:opacity-95">
              Get started <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

const HERO_VIDEO_SRC = `${import.meta.env.BASE_URL}media/hero.mp4`;

// Twinkling-lights background layer for the hero. Renders dozens of small
// pulsing dots in brand colors, two slow breathing radial blooms, a soft
// diagonal light sweep, and a drifting grid — all CSS-only, GPU-friendly.
const HERO_LIGHTS = Array.from({ length: 120 }).map((_, i) => {
  const palette = [
    "hsl(18 100% 60%)",   // orange
    "hsl(34 100% 68%)",   // purple
    "hsl(330 95% 65%)",   // pink
    "hsl(48 100% 65%)",   // amber
    "hsl(200 95% 70%)",   // cyan accent
    "hsl(155 95% 65%)",   // mint
  ];
  // deterministic pseudo-random so SSR/CSR match and layout is stable
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n) * 10000;
    return x - Math.floor(x);
  };
  const size = 2 + Math.floor(r(3) * 6);
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    top: `${(r(2) * 100).toFixed(2)}%`,
    size,
    color: palette[i % palette.length]!,
    delay: `${(r(4) * 5).toFixed(2)}s`,
    duration: `${(1.6 + r(5) * 4.2).toFixed(2)}s`,
  };
});

// Shooting stars across the hero
const HERO_SHOOTS = Array.from({ length: 6 }).map((_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n + 7.3) * 10000;
    return x - Math.floor(x);
  };
  return {
    top: `${(8 + r(1) * 60).toFixed(2)}%`,
    delay: `${(i * 1.7 + r(2) * 2).toFixed(2)}s`,
    duration: `${(4.5 + r(3) * 3.5).toFixed(2)}s`,
    hue: i % 2 === 0 ? "18 100% 70%" : "38 100% 72%",
  };
});

// Lightning bolt flashes
const HERO_BOLTS = Array.from({ length: 3 }).map((_, i) => ({
  left: `${20 + i * 30}%`,
  delay: `${(i * 2.3).toFixed(2)}s`,
  duration: `${(6 + i * 1.5).toFixed(2)}s`,
}));

function HeroBlinkingLights({ active }: { active: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden transition-opacity duration-700 ${
        active ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      {/* Rotating aurora conic — gives a slow color wheel beneath everything */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[140%] w-[140%] hero-aurora mix-blend-screen"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(18 100% 55% / 0.35), hsl(330 95% 60% / 0.3), hsl(34 100% 65% / 0.4), hsl(200 95% 60% / 0.3), hsl(155 95% 60% / 0.25), hsl(18 100% 55% / 0.35))",
          filter: "blur(80px)",
          maskImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 75%)",
        }}
      />

      {/* Drifting grid */}
      <div
        className="absolute inset-0 hero-grid-drift opacity-[0.22] dark:opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(hsl(18 100% 60% / 0.22) 1px, transparent 1px), linear-gradient(90deg, hsl(34 100% 68% / 0.22) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 45%, black 30%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 45%, black 30%, transparent 85%)",
        }}
      />

      {/* Breathing brand blooms — bigger, brighter, color-shifting */}
      <div
        className="absolute left-[14%] top-[22%] h-[30rem] w-[30rem] rounded-full blur-[140px] hero-breathe mix-blend-screen"
        style={{ background: "hsl(18 100% 55% / 0.85)" }}
      />
      <div
        className="absolute right-[10%] top-[14%] h-[32rem] w-[32rem] rounded-full blur-[150px] hero-breathe-slow mix-blend-screen"
        style={{ background: "hsl(30 100% 60% / 0.85)" }}
      />
      <div
        className="absolute left-[36%] bottom-[4%] h-[24rem] w-[24rem] rounded-full blur-[130px] hero-breathe mix-blend-screen"
        style={{ background: "hsl(330 95% 60% / 0.7)", animationDelay: "2.4s" }}
      />
      <div
        className="absolute right-[28%] bottom-[12%] h-[20rem] w-[20rem] rounded-full blur-[120px] hero-breathe-slow mix-blend-screen"
        style={{ background: "hsl(200 95% 60% / 0.55)", animationDelay: "3.6s" }}
      />

      {/* Lens flare core — rotating multi-spike star */}
      <div
        className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 h-[26rem] w-[26rem] hero-flare mix-blend-screen"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(18 100% 70% / 0.6) 6deg, transparent 12deg, transparent 90deg, hsl(38 100% 75% / 0.6) 96deg, transparent 102deg, transparent 180deg, hsl(330 95% 70% / 0.55) 186deg, transparent 192deg, transparent 270deg, hsl(48 100% 70% / 0.55) 276deg, transparent 282deg)",
          filter: "blur(14px)",
          maskImage:
            "radial-gradient(circle at 50% 50%, black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black 0%, transparent 70%)",
        }}
      />

      {/* Diagonal light sweep */}
      <div
        className="absolute -top-1/2 -left-1/2 h-[200%] w-[60%] hero-sweep mix-blend-screen"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(18 100% 70% / 0.35) 45%, hsl(34 100% 75% / 0.4) 55%, transparent 100%)",
          filter: "blur(28px)",
        }}
      />

      {/* Scan line */}
      <div
        className="absolute inset-x-0 top-0 h-32 hero-scan mix-blend-screen"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(18 100% 70% / 0.18) 45%, hsl(34 100% 75% / 0.22) 55%, transparent 100%)",
          filter: "blur(20px)",
        }}
      />

      {/* Shooting stars */}
      {HERO_SHOOTS.map((s, i) => (
        <span
          key={`shoot-${i}`}
          className="absolute hero-shoot mix-blend-screen"
          style={
            {
              top: s.top,
              left: 0,
              width: "22vw",
              height: "2px",
              background: `linear-gradient(90deg, transparent, hsl(${s.hue} / 0.95), white)`,
              boxShadow: `0 0 18px 3px hsl(${s.hue} / 0.9)`,
              borderRadius: "9999px",
              "--dur": s.duration,
              "--delay": s.delay,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Lightning bolt flashes — full-column white-hot glow */}
      {HERO_BOLTS.map((b, i) => (
        <span
          key={`bolt-${i}`}
          className="absolute top-0 bottom-0 hero-bolt mix-blend-screen"
          style={
            {
              left: b.left,
              width: "2px",
              background:
                "linear-gradient(180deg, transparent 0%, white 40%, hsl(38 100% 80%) 60%, transparent 100%)",
              boxShadow: "0 0 60px 10px hsl(38 100% 80% / 0.9), 0 0 120px 30px hsl(18 100% 65% / 0.5)",
              "--dur": b.duration,
              "--delay": b.delay,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Twinkling lights — denser, brighter halo */}
      {HERO_LIGHTS.map((l, i) => (
        <span
          key={i}
          className="absolute rounded-full hero-twinkle mix-blend-screen"
          style={
            {
              left: l.left,
              top: l.top,
              width: l.size,
              height: l.size,
              background: l.color,
              boxShadow: `0 0 ${l.size * 4}px ${l.size * 1.4}px ${l.color}, 0 0 ${l.size * 10}px ${l.size * 2}px ${l.color}`,
              "--dur": l.duration,
              "--delay": l.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Hero() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoOn, setVideoOn] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (videoOn) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [videoOn]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    const qs = params.toString();
    navigate(`/explore${qs ? `?${qs}` : ""}`);
  };

  return (
    <section className="relative pt-28 md:pt-36 pb-20 md:pb-28 overflow-hidden">
      {/* Video background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          src={HERO_VIDEO_SRC}
          autoPlay
          loop
          muted={muted}
          playsInline
          preload="auto"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            videoOn ? "opacity-90 dark:opacity-60" : "opacity-0"
          }`}
        />
        {/* Tint + readability overlays on top of video */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            videoOn
              ? "bg-gradient-to-b from-background/30 via-background/55 to-background"
              : "opacity-0"
          }`}
        />
      </div>

      {/* Blinking-lights wow layer — dark mode only; light mode stays clean white */}
      <div className="hidden dark:block absolute inset-0 z-[1]">
        <HeroBlinkingLights active={!videoOn} />
      </div>

      {/* Layered decorative background — heavy blooms only in dark mode */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Conic mesh blobs (dark mode only) */}
        <div
          className={`hidden dark:block absolute -top-40 left-1/2 -translate-x-1/2 h-[44rem] w-[80rem] rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,hsl(18_100%_55%/0.22),hsl(32_100%_55%/0.22),hsl(330_90%_60%/0.18),hsl(18_100%_55%/0.22))] blur-[140px] transition-opacity duration-700 ${
            videoOn ? "opacity-40" : "opacity-90"
          }`}
        />
        <div
          className={`hidden dark:block absolute top-1/3 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[160px] transition-opacity duration-700 ${
            videoOn ? "opacity-50" : "opacity-100"
          }`}
        />
        <div
          className={`hidden dark:block absolute top-1/4 -right-24 h-[30rem] w-[30rem] rounded-full bg-[hsl(32_100%_55%/0.22)] blur-[170px] transition-opacity duration-700 ${
            videoOn ? "opacity-50" : "opacity-100"
          }`}
        />

        {/* Dot grid (dark mode only) */}
        <div
          className="hidden dark:block absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(0 0% 0% / 0.08) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 70% 65% at 50% 40%, black 35%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 65% at 50% 40%, black 35%, transparent 80%)",
          }}
        />

        {/* Bottom fade into page */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 relative z-10 w-full text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur border border-primary/20 mb-8 shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Now live in 12 Indian cities
          </span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/70">
            124 live classes now
          </span>
        </motion.div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-[6rem] font-black tracking-[-0.04em] leading-[0.95] uppercase text-foreground">
          <motion.span
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            One Membership.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="block text-gradient-brand"
          >
            Unlimited Gyms.
          </motion.span>
        </h1>

        <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Access India's best gyms and studios on a single pass. Book any class,
          walk in with a QR — from sunrise yoga to midnight MMA.
        </p>

        {/* Search bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-10 w-full max-w-3xl"
        >
          <div className="rounded-2xl bg-card/90 backdrop-blur-xl border border-border p-2 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-secondary rounded-xl text-left">
              <Search className="h-5 w-5 text-primary shrink-0" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search gym or activity..."
                className="border-0 bg-transparent h-10 text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>
            <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-secondary rounded-xl md:max-w-[240px] text-left">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City or location..."
                className="border-0 bg-transparent h-10 text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="bg-gradient-brand text-white border-none h-14 px-8 text-base font-black tracking-wide shadow-[0_10px_30px_-10px_hsl(18_100%_55%/0.8)] hover:opacity-95 rounded-xl"
            >
              <Search className="h-5 w-5 mr-2" /> Search
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Popular:
            </span>
            {popularCities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCity(c);
                  navigate(`/explore?city=${encodeURIComponent(c)}`);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-border text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </motion.form>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/memberships">
            <Button
              size="lg"
              className="bg-gradient-brand text-white border-none h-14 px-8 text-base font-black tracking-wide shadow-[0_16px_50px_-12px_hsl(18_100%_55%/0.6)] hover:opacity-95 w-full sm:w-auto"
            >
              Get GYMCO Pass <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <Link href="/explore">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold w-full sm:w-auto bg-white/70 backdrop-blur"
            >
              Browse gyms
            </Button>
          </Link>
        </div>

        {/* Live ticker */}
        <LiveTicker />

        {/* Trust strip */}
        <div className="mt-8 flex items-center justify-center gap-5 flex-wrap">
          <div className="flex -space-x-3">
            {testimonials.map((t) => (
              <img
                key={t.name}
                src={t.avatar}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-background"
              />
            ))}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1 text-primary">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
              <span className="text-foreground text-sm font-bold ml-1.5">
                4.9
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Loved by 40,000+ members
            </div>
          </div>
        </div>

        {/* Floating Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-16 md:mt-20 w-full grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-border border border-border shadow-[0_30px_80px_-40px_rgba(0,0,0,0.2)]"
        >
          {stats.map((s) => (
            <div key={s.label} className="bg-card/95 backdrop-blur p-6 md:p-8 text-left">
              <div className="text-3xl md:text-4xl font-black text-gradient-brand tabular-nums">
                <CountUp value={s.value} />
              </div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Video controls — top-right floating pill (visible inside hero viewport) */}
      <div className="absolute top-24 right-4 md:top-28 md:right-8 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setVideoOn((v) => !v)}
          aria-pressed={videoOn}
          aria-label={videoOn ? "Pause background video" : "Play background video"}
          className="h-11 w-11 rounded-full bg-card/85 backdrop-blur-xl border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-card transition-colors"
          data-testid="hero-video-toggle"
        >
          {videoOn ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          disabled={!videoOn}
          aria-pressed={!muted}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="h-11 w-11 rounded-full bg-card/85 backdrop-blur-xl border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="hero-video-mute"
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </section>
  );
}

function PartnerStrip() {
  // Two identical tracks side-by-side. We translate the wrapper by exactly
  // one track's width (-50%) so the second track lands where the first started
  // — seamless, no phase mismatch regardless of internal gaps.
  const Track = () => (
    <div className="flex shrink-0 items-center gap-16 pr-16">
      {partnerGyms.map((g, i) => (
        <div
          key={`${g.name}-${i}`}
          className="text-2xl md:text-3xl font-black tracking-wider text-foreground/40 hover:text-foreground transition-colors whitespace-nowrap"
        >
          {g.letters}
        </div>
      ))}
    </div>
  );
  return (
    <section className="border-y border-border bg-secondary/30 py-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-8">
          Trusted by India's best fitness brands
        </div>
        <div className="relative overflow-hidden marquee-mask">
          <div className="flex w-max animate-marquee" aria-hidden="true">
            <Track />
            <Track />
          </div>
        </div>
      </div>
    </section>
  );
}

// Animated count-up that triggers on scroll-in.
// Avoids final→0 flicker by initializing to "0 + suffix" up front,
// then animating up to the target only after the element enters the viewport.
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  // Parse "500+" -> 500, "4.9" -> 4.9, "8K+" -> 8 (K is treated as suffix).
  const match = value.match(/^([\d.]+)(.*)$/);
  const target = match ? parseFloat(match[1]) : NaN;
  const suffix = match ? match[2] : "";
  const isDecimal = !Number.isNaN(target) && !Number.isInteger(target);
  const numericValid = !Number.isNaN(target);

  const format = (v: number) =>
    (isDecimal ? v.toFixed(1) : Math.round(v).toString()) + suffix;

  const [display, setDisplay] = useState<string>(() =>
    numericValid ? format(0) : value,
  );

  useEffect(() => {
    if (!inView || !numericValid) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(format(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, target, isDecimal, suffix, numericValid]);

  return <span ref={ref}>{display}</span>;
}

const liveTicks = [
  { name: "Aarav", action: "checked into Iron Republic", city: "Indiranagar" },
  { name: "Priya", action: "booked Sunrise Yoga", city: "Koramangala" },
  { name: "Kabir", action: "earned a 30-day streak", city: "Bandra West" },
  { name: "Meera", action: "started a HIIT class", city: "HSR Layout" },
  { name: "Rohan", action: "joined GYMCO Elite", city: "Powai" },
  { name: "Ananya", action: "redeemed wallet cashback", city: "Indiranagar" },
];

function LiveTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % liveTicks.length), 3200);
    return () => clearInterval(t);
  }, []);
  const item = liveTicks[i];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="mt-8 inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur border border-border shadow-sm max-w-full"
    >
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500 ticker-dot shrink-0" />
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-green-600 shrink-0">
        Live
      </span>
      <span className="h-3 w-px bg-border shrink-0" />
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="text-xs md:text-sm font-semibold text-foreground/80 truncate"
        >
          <span className="font-black text-foreground">{item.name}</span>{" "}
          {item.action}
          <span className="text-muted-foreground"> · {item.city}</span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function FeaturedGyms() {
  const { data: gyms, isLoading } = useListFeaturedGyms();
  const items = (gyms ?? []).slice(0, 6);

  return (
    <section id="gyms-list" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
              Featured gyms
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
              Handpicked studios.{" "}
              <span className="text-gradient-brand">All on one pass.</span>
            </h2>
          </div>
          <Link href="/explore">
            <Button variant="ghost" className="font-semibold">
              Browse all gyms <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-2xl bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((gym, i) => (
              <motion.div
                key={gym.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.06 }}
              >
                <Link href={`/gyms/${gym.id}`}>
                  <div className="group relative rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={gym.heroImage}
                        alt={gym.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      {gym.isPremium && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-brand text-white text-[10px] font-black tracking-wider uppercase shadow-lg">
                          <Crown className="h-3 w-3" /> Premium
                        </div>
                      )}
                      {gym.openNow && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Open
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                          <h3 className="text-xl font-black text-white leading-tight">
                            {gym.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-white/80 mt-1">
                            <MapPin className="h-3 w-3" />
                            {gym.area}, {gym.city}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-black/50 backdrop-blur px-2 py-1 rounded-full text-white text-xs font-bold">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {gym.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {gym.categories.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-secondary border border-border text-foreground/70"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          from
                        </div>
                        <div className="text-base font-black text-gradient-brand">
                          ₹{gym.priceFrom.toLocaleString("en-IN")}
                          <span className="text-xs text-muted-foreground font-bold">
                            /mo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-2xl mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
            How it works
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
            From signup to first sweat in{" "}
            <span className="text-gradient-brand">under 90 seconds.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="relative h-full rounded-2xl border border-border bg-card p-8 overflow-hidden transition-all hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-brand-soft" />
                <div className="relative">
                  <div className="text-7xl font-black text-foreground/[0.04] absolute -top-4 -right-2 select-none">
                    0{i + 1}
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mb-6 shadow-[0_10px_30px_-10px_hsl(18_100%_55%/0.7)]">
                    <step.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section id="classes" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
              Classes
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
              Whatever{" "}
              <span className="text-gradient-brand">moves you</span>, we've got
              a class for it.
            </h2>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" className="font-semibold">
              Browse all classes <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.06 }}
              className="group relative aspect-[4/5] md:aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer"
            >
              <img
                src={c.image}
                alt={c.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  {c.sessions}
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {c.name}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureBlock() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-2xl mb-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
            Built for the way you train
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
            More than a gym pass.{" "}
            <span className="text-gradient-brand">A fitness OS.</span>
          </h2>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[minmax(180px,auto)] gap-4">
          {/* 1. Hero feature — phone mock */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className="md:col-span-3 md:row-span-2 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-8 md:p-10"
          >
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(32_100%_55%/0.22)] blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Smartphone className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Your pocket coach
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black leading-tight mb-3">
                The whole network,{" "}
                <span className="text-gradient-brand">one tap away.</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
                Live class capacity, rotating QR check-in, and an AI coach that
                learns from every session — built into a single, beautiful app.
              </p>
            </div>

            {/* Phone mockup */}
            <div className="relative mt-2 flex justify-center md:justify-end">
              <div className="relative w-[230px] md:w-[280px] aspect-[9/19] rounded-[2.2rem] bg-gradient-to-br from-foreground to-foreground/80 p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] rotate-[6deg] hover:rotate-[3deg] transition-transform duration-700">
                <div className="absolute inset-2 rounded-[1.9rem] bg-background overflow-hidden flex flex-col">
                  <div className="h-7 flex items-center justify-center">
                    <div className="h-1 w-12 rounded-full bg-foreground/15" />
                  </div>
                  <div className="px-4 pb-4 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Good morning
                        </div>
                        <div className="text-base font-black">Priya</div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gradient-brand" />
                    </div>
                    <div className="rounded-xl bg-gradient-brand p-3 text-white">
                      <div className="text-[8px] font-bold uppercase tracking-wider opacity-90">
                        Today's class
                      </div>
                      <div className="text-sm font-black mt-0.5">
                        Sunrise Yoga · 6:30am
                      </div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        Iron Republic, Indiranagar
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-full">
                        Check in
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        This week
                      </div>
                      <div className="flex items-end justify-between mt-1">
                        <div className="text-2xl font-black text-gradient-brand">
                          4
                        </div>
                        <div className="flex items-end gap-1 h-8">
                          {[3, 5, 2, 7, 4, 6, 3].map((h, k) => (
                            <div
                              key={k}
                              className="w-1.5 rounded-sm bg-gradient-brand"
                              style={{ height: `${h * 12}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-primary">
                        Streak
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Flame className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black">
                          27 days · personal best
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. AI Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.05 }}
            className="md:col-span-3 relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 group hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-brand-soft border border-primary/20 flex items-center justify-center mb-4">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-black text-xl mb-2">
                  AI that knows your goals
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Class picks tuned to your sleep, recovery and weekly load.
                </p>
              </div>
              <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
                {["Mobility — 92%", "Strength — 87%", "HIIT — 71%"].map((row) => {
                  const [label, pct] = row.split(" — ");
                  const value = parseInt(pct, 10);
                  return (
                    <div
                      key={label}
                      className="flex items-center gap-2 text-[10px] font-bold"
                    >
                      <span className="text-muted-foreground w-14 text-right">
                        {label}
                      </span>
                      <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-brand rounded-full"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* 3. Streaks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl border border-border bg-card p-6 group hover:border-primary/40 transition-colors"
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-brand-soft border border-primary/20 flex items-center justify-center mb-4">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-black text-lg mb-1.5">Streaks & score</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Daily fitness score that compounds.
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gradient-brand tabular-nums">
                <CountUp value="847" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                avg score
              </span>
            </div>
          </motion.div>

          {/* 4. Trainer marketplace */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.15 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl border border-border bg-card p-6 group hover:border-primary/40 transition-colors"
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-brand-soft border border-primary/20 flex items-center justify-center mb-4">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-black text-lg mb-1.5">Trainer marketplace</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              India's best coaches, 1-on-1 or in small groups.
            </p>
            <div className="flex -space-x-2">
              {testimonials.map((t) => (
                <img
                  key={t.name}
                  src={t.avatar}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-card"
                />
              ))}
              <div className="h-8 w-8 rounded-full bg-secondary ring-2 ring-card inline-flex items-center justify-center text-[10px] font-black text-foreground/70">
                +28
              </div>
            </div>
          </motion.div>

          {/* 5. Wallet cashback */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-secondary/40 p-6 group hover:border-primary/40 transition-colors"
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-brand-soft border border-primary/20 flex items-center justify-center mb-4">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-black text-lg mb-1.5">Cashback wallet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Earn on every class. Redeem on anything.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                Up to 8% back
              </span>
            </div>
          </motion.div>

          {/* 6. Live community */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.25 }}
            className="md:col-span-4 relative overflow-hidden rounded-3xl border border-border bg-foreground text-background p-6 md:p-8"
          >
            <div className="absolute inset-0 opacity-30 pointer-events-none">
              <div className="absolute -top-20 right-10 h-60 w-60 rounded-full bg-primary/40 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-60 w-60 rounded-full bg-[hsl(32_100%_55%/0.5)] blur-3xl" />
            </div>
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 ticker-dot" />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">
                    Live community
                  </span>
                </div>
                <h3 className="font-black text-2xl md:text-3xl leading-tight">
                  <span className="text-gradient-brand">
                    <CountUp value="1240" />
                  </span>{" "}
                  members training across India right now.
                </h3>
                <p className="text-background/70 text-sm leading-relaxed mt-2 max-w-md">
                  From sunrise yoga in Mumbai to midnight MMA in Bangalore.
                  Join a city that never stops moving.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 shrink-0">
                {[
                  { icon: Users, k: "40K+", l: "Members" },
                  { icon: Activity, k: "8K+", l: "Classes/mo" },
                  { icon: Zap, k: "98%", l: "Show-up rate" },
                ].map((it) => (
                  <div
                    key={it.l}
                    className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-3 md:p-4 min-w-[88px]"
                  >
                    <it.icon className="h-4 w-4 text-primary mb-2" />
                    <div className="text-base md:text-lg font-black text-gradient-brand tabular-nums">
                      <CountUp value={it.k} />
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-background/60 mt-0.5">
                      {it.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-2xl mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
            Members
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
            People who{" "}
            <span className="text-gradient-brand">stopped settling.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-card border border-border shadow-sm p-8 relative"
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/30" />
              <p className="text-lg leading-relaxed text-foreground/90 mb-8">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/30"
                />
                <div>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-brand p-10 md:p-20 text-center">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-black/30 blur-3xl" />
          <div className="relative max-w-3xl mx-auto">
            <div className="text-white text-3xl md:text-4xl font-black tracking-[0.18em] mb-6 drop-shadow-2xl">
              GYMCO
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">
              Your next workout is one tap away.
            </h2>
            <p className="text-white/85 text-lg md:text-xl mb-10">
              Join 40,000+ members training across India's best gyms. First
              month, 50% off.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/memberships">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-white/90 h-14 px-8 text-base font-black tracking-wide w-full sm:w-auto"
                >
                  Claim your pass <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base font-bold bg-white/10 border-white/30 text-white hover:bg-white/20 w-full sm:w-auto"
                >
                  Explore the app
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <PartnerStrip />
      <NearbyGyms />
      <FeaturedGyms />
      <HowItWorks />
      <Categories />
      <FeatureBlock />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
