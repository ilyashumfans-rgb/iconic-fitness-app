import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useListGyms, useListClasses, getListClassesQueryKey, getListGymsQueryKey } from "@workspace/api-client-react";
import NearbyGyms from "@/components/NearbyGyms";
import { BlogTeaserSection } from "@/components/BlogTeaserSection";
import { PricingTeaserSection } from "@/components/PricingTeaserSection";
import { SiteFooter as Footer } from "@/components/SiteFooter";
import {
  ArrowRight,
  MapPin,
  Calendar,
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
  Play,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const popularCities = ["Bangalore"];

const stats = [
  { value: "16+", label: "Premium gyms" },
  { value: "1", label: "City live" },
  { value: "100%", label: "Satisfaction Members" },
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
    icon: Dumbbell,
    title: "Train your way",
    body: "One pass, every gym. Just show your membership at the front desk — no contracts, ever.",
  },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Product Designer · Bangalore",
    quote:
      "I switched between three gyms in one week — strength on Monday, reformer on Wednesday, MMA on Saturday. Iconic Fitness made it feel effortless.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
  },
  {
    name: "Rohan Kapoor",
    role: "Founder · Bangalore",
    quote:
      "The Elite plan pays for itself in week one. I train near my apartment, my office, and the airport lounge gym. One pass.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
  },
  {
    name: "Anjali Iyer",
    role: "Marathon runner · Bangalore",
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
  const { theme } = useTheme();
  const headerBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const headerLogo =
    theme === "dark"
      ? `${headerBase}/media/iconic-fitness-header-logo-dark.png`
      : `${headerBase}/media/iconic-fitness-header-logo-light.png`;
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="Iconic Fitness home"
        >
          <img
            src={headerLogo}
            alt="Iconic Fitness"
            className="h-16 md:h-20 w-auto object-contain"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/explore" className="hover:text-foreground transition-colors">
            Browse Gyms
          </Link>
          <Link href="/be-a-member" className="hover:text-foreground transition-colors">
            Be a Member
          </Link>
          <Link href="/store" className="hover:text-foreground transition-colors">
            Store
          </Link>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link href="/memberships" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/sign-in">
            <Button variant="ghost" className="text-sm font-semibold hidden sm:inline-flex">
              Sign in
            </Button>
          </Link>
          <Link href="/be-a-member" className="hidden sm:inline-flex">
            <Button className="bg-gradient-brand text-white border-none font-bold shadow-[0_8px_24px_-8px_hsl(96_56%_55%/0.7)] hover:opacity-95">
              Get started <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
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
                {[
                  { href: "/explore", label: "Browse Gyms" },
                  { href: "/be-a-member", label: "Be a Member" },
                  { href: "/store", label: "Store" },
                  { href: "/blog", label: "Blog" },
                  { href: "/memberships", label: "Pricing" },
                ].map((l) => (
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
                      Get started <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

const HERO_VIDEO_ID = "Nn5e8jcG-BY";


function Hero() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const suggestParams = { q: debouncedQuery || undefined };
  const { data: allSuggestions = [], isLoading: loadingSuggestions } = useListGyms(
    suggestParams,
    {
      query: {
        queryKey: getListGymsQueryKey(suggestParams),
        enabled: debouncedQuery.length >= 2,
      },
    },
  );
  const suggestions = allSuggestions.slice(0, 6);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape") setShowSuggestions(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        setShowSuggestions(false);
        navigate(`/gyms/${suggestions[activeIndex].id}`);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [videoOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    const qs = params.toString();
    navigate(`/explore${qs ? `?${qs}` : ""}`);
  };

  return (
    <section className="relative pt-24 md:pt-36 pb-16 md:pb-28 overflow-hidden">
      {/* Premium mobile backdrop — subtle peach/orange wash behind headline (desktop unchanged) */}
      <div className="pointer-events-none absolute inset-0 z-0 md:hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,hsl(96_56%_60%/0.18),transparent_70%)] dark:bg-[radial-gradient(closest-side,hsl(96_56%_60%/0.25),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Clean hero — no decorative bloom/light effects. Just a soft bottom fade into the page. */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden md:block">
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="max-w-5xl mx-auto px-5 md:px-8 relative z-10 w-full text-center flex flex-col items-center">
        {/* Premium stacked pills on mobile, single pill on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-7 md:mb-8 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 dark:bg-white/10 backdrop-blur border border-primary/25 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10.5px] md:text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Now live in Bangalore
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 dark:bg-white/10 backdrop-blur border border-border shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10.5px] md:text-xs font-bold uppercase tracking-[0.18em] text-foreground/80">
              124 classes now
            </span>
          </span>
        </motion.div>

        <h1 className="text-[1.75rem] xs:text-[2rem] leading-[1.02] sm:text-5xl md:text-6xl xl:text-[4.5rem] font-black tracking-[-0.04em] md:leading-[0.95] uppercase text-foreground whitespace-nowrap sm:whitespace-normal">
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
            16+ Gyms.
          </motion.span>
        </h1>

        <p className="mt-6 md:mt-7 text-base md:text-xl text-muted-foreground max-w-2xl leading-relaxed px-1">
          Enjoy unlimited access to all Iconic Fitness locations across Bangalore,
          365 days a year. we're always ready when you are.
        </p>

        {/* Search bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-8 md:mt-10 w-full max-w-3xl"
        >
          <div className="rounded-2xl md:rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 p-2 shadow-[0_20px_60px_-20px_hsl(96_56%_55%/0.25)] md:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] flex flex-col md:flex-row gap-2">
            <div ref={searchBoxRef} className="flex-1 relative">
              <div className="flex items-center gap-3 px-4 py-1.5 bg-secondary rounded-xl text-left">
                <Search className="h-5 w-5 text-primary shrink-0" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search gym or activity..."
                  role="combobox"
                  aria-expanded={showSuggestions && debouncedQuery.length >= 2}
                  aria-controls="hero-search-suggestions"
                  aria-activedescendant={
                    activeIndex >= 0 ? `hero-suggestion-${activeIndex}` : undefined
                  }
                  aria-autocomplete="list"
                  className="border-0 bg-transparent h-11 text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                />
              </div>
              {showSuggestions && debouncedQuery.length >= 2 && (
                <div
                  id="hero-search-suggestions"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.4)]"
                >
                  {loadingSuggestions ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No gyms match “{debouncedQuery}”
                    </div>
                  ) : (
                    suggestions.map((gym, idx) => (
                      <button
                        key={gym.id}
                        id={`hero-suggestion-${idx}`}
                        role="option"
                        aria-selected={idx === activeIndex}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => {
                          setShowSuggestions(false);
                          navigate(`/gyms/${gym.id}`);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          idx === activeIndex ? "bg-secondary" : "hover:bg-secondary"
                        }`}
                      >
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-secondary">
                          {gym.logoUrl || gym.heroImage ? (
                            <img
                              src={gym.logoUrl || gym.heroImage}
                              alt={gym.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {gym.name}
                          </p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {gym.area}, {gym.city}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center gap-3 px-4 py-1.5 bg-secondary rounded-xl md:max-w-[240px] text-left">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City or location..."
                className="border-0 bg-transparent h-11 text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="bg-gradient-brand text-white border-none h-14 md:h-14 px-8 text-base font-black tracking-wide shadow-[0_10px_30px_-10px_hsl(96_56%_55%/0.8)] hover:opacity-95 rounded-xl whitespace-nowrap"
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 md:gap-2 flex-wrap">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mr-1 w-full md:w-auto md:mr-1">
              Popular cities
            </span>
            {popularCities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCity(c);
                  navigate(`/explore?city=${encodeURIComponent(c)}`);
                }}
                className="text-xs font-semibold px-3.5 py-2 md:py-1.5 rounded-full bg-white/85 dark:bg-white/10 backdrop-blur border border-border text-foreground/80 hover:border-primary/40 hover:text-primary active:scale-95 transition"
              >
                {c}
              </button>
            ))}
          </div>
        </motion.form>

        <div className="mt-8 md:mt-9 w-full flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/memberships" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="bg-gradient-brand text-white border-none h-14 px-8 text-base font-black tracking-wide shadow-[0_16px_50px_-12px_hsl(96_56%_55%/0.6)] hover:opacity-95 w-full sm:w-auto"
            >
              Get Iconic Fitness Pass <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <Link href="/explore" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold w-full sm:w-auto bg-white/80 dark:bg-white/5 backdrop-blur border-border/80"
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
              Loved by 2,000+ members
            </div>
          </div>
        </div>

        {/* Floating Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-12 md:mt-20 w-full grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-border border border-border shadow-[0_20px_60px_-30px_hsl(96_56%_55%/0.4)] md:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.2)]"
        >
          {stats.map((s) => (
            <div key={s.label} className="bg-card/95 backdrop-blur p-5 md:p-8 text-left">
              <div className="text-2xl md:text-4xl font-black text-gradient-brand tabular-nums">
                <CountUp value={s.value} />
              </div>
              <div className="text-[10px] md:text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Watch video control — bottom-right on mobile, top-right on desktop */}
      <div className="absolute bottom-6 right-4 md:bottom-auto md:top-28 md:right-8 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          aria-label="Play video"
          className="group flex items-center gap-2 h-11 pl-2.5 pr-4 rounded-full bg-card/85 backdrop-blur-xl border border-border shadow-lg text-foreground hover:bg-card transition-colors"
          data-testid="hero-video-toggle"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-white">
            <Play className="h-3.5 w-3.5 ml-0.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.14em]">
            Watch video
          </span>
        </button>
      </div>

      <AnimatePresence>
        {videoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setVideoOpen(false)}
            data-testid="hero-video-modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Iconic Fitness video"
            >
              <button
                type="button"
                autoFocus
                onClick={() => setVideoOpen(false)}
                aria-label="Close video"
                className="absolute -top-3 -right-3 md:top-3 md:right-3 z-10 h-9 w-9 rounded-full bg-white text-black shadow-lg flex items-center justify-center hover:bg-white/90 transition-colors"
                data-testid="hero-video-close"
              >
                <X className="h-4 w-4" />
              </button>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${HERO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                title="Iconic Fitness"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  { name: "Aarav", action: "checked into Iconic Fitness", city: "Indiranagar" },
  { name: "Priya", action: "booked Sunrise Yoga", city: "Koramangala" },
  { name: "Kabir", action: "earned a 30-day streak", city: "Bandra West" },
  { name: "Meera", action: "started a HIIT class", city: "HSR Layout" },
  { name: "Rohan", action: "joined Iconic Fitness Elite", city: "Powai" },
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
  const { data: gyms, isLoading } = useListGyms();
  const items = gyms ?? [];

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
                      {gym.logoUrl ? (
                        <div className="absolute bottom-3 right-3 z-10 h-12 w-12 rounded-xl bg-white ring-2 ring-white shadow-lg overflow-hidden">
                          <img
                            src={gym.logoUrl}
                            alt={`${gym.name} logo`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}
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
                        <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold text-primary bg-lime-50 border border-lime-100 px-2 py-1 rounded">
                          Included with plan
                        </span>
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
                  <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center mb-6 shadow-[0_10px_30px_-10px_hsl(96_56%_55%/0.7)]">
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
  const { data: classes, isLoading } = useListClasses(
    {},
    { query: { queryKey: getListClassesQueryKey({}) } },
  );

  const fallbackImage =
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&q=80";

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
          <Link href="/classes">
            <Button variant="ghost" className="font-semibold">
              Browse all classes <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] md:aspect-[4/3] rounded-2xl bg-secondary/50 animate-pulse"
              />
            ))}
          </div>
        ) : !classes || classes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            <p className="font-bold text-lg">No classes scheduled yet</p>
            <p className="text-sm mt-1">Check back soon for new sessions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {classes.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: Math.min(i, 8) * 0.05 }}
              >
                <Link href={`/classes/${cls.id}`}>
                  <div className="group relative aspect-[4/5] md:aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer">
                    <img
                      src={cls.coverImage || fallbackImage}
                      alt={cls.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                      <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                        {cls.category}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                        {cls.title}
                      </h3>
                      <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-white/80">
                        {cls.gymName} · {cls.durationMin}m
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
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(84_60%_55%/0.22)] blur-3xl" />
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
                Live class capacity, instant booking, and an AI coach that
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
                        Iconic Fitness, Indiranagar
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-full">
                        Booked
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
              <div className="absolute -bottom-20 left-10 h-60 w-60 rounded-full bg-[hsl(84_60%_55%/0.5)] blur-3xl" />
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
                  From sunrise yoga in Indiranagar to midnight MMA in Koramangala.
                  Join a city that never stops moving.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 shrink-0">
                {[
                  { icon: Users, k: "100%", l: "Satisfaction Members" },
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

const videoTestimonials = [
  {
    name: "Rikitha",
    role: "Fashion Designer · Entrepreneur",
    quote:
      "One pass, every gym near me — I finally stopped making excuses and started showing up.",
    src: `${import.meta.env.BASE_URL}media/testimonial-rikitha.mp4`,
    poster: `${import.meta.env.BASE_URL}media/testimonial-rikitha-poster.jpg`,
  },
  {
    name: "Suraj",
    role: "Product Manager · IT Services",
    quote:
      "The flexibility is unreal. I train wherever my day takes me and never miss a session.",
    src: `${import.meta.env.BASE_URL}media/testimonial-suraj.mp4`,
    poster: `${import.meta.env.BASE_URL}media/testimonial-suraj-poster.jpg`,
  },
  {
    name: "Albha",
    role: "IT Professional",
    quote:
      "Best decision I made this year. The gyms are world-class and the community keeps me going.",
    src: `${import.meta.env.BASE_URL}media/testimonial-albha.mp4`,
    poster: `${import.meta.env.BASE_URL}media/testimonial-albha-poster.jpg`,
  },
];

function VideoTestimonialCard({
  item,
}: {
  item: (typeof videoTestimonials)[number];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekedRef = useRef(false);
  const [started, setStarted] = useState(false);

  const handlePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    const result = v.play();
    if (result && typeof result.then === "function") {
      result.catch(() => setStarted(false));
    }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || seekedRef.current) return;
    if (v.duration > 2) {
      v.currentTime = 2;
    }
    seekedRef.current = true;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-black">
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster}
          preload="none"
          playsInline
          controls={started}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setStarted(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!started && (
          <button
            type="button"
            onClick={handlePlay}
            aria-label={`Play ${item.name}'s testimonial`}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30 group"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
              <Play className="h-7 w-7 translate-x-0.5 text-primary fill-primary" />
            </span>
          </button>
        )}
      </div>
      <div className="p-6">
        <Quote className="h-6 w-6 text-primary/30 mb-3" />
        <p className="text-base leading-relaxed text-foreground/90 mb-4">
          "{item.quote}"
        </p>
        <div className="font-bold">{item.name}</div>
        <div className="text-xs text-muted-foreground">{item.role}</div>
      </div>
    </motion.div>
  );
}

function VideoTestimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const child = c as HTMLElement;
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const dist = Math.abs(childCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  };

  const scrollTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.clientWidth) / 2,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-20 md:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-2xl mb-12 md:mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
            Real stories
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
            Hear it from{" "}
            <span className="text-gradient-brand">our members.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real Iconic Fitness members on how one membership changed the way
            they train.
          </p>
        </div>

        {/* Desktop / tablet grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoTestimonials.map((item) => (
            <VideoTestimonialCard key={item.name} item={item} />
          ))}
        </div>
      </div>

      {/* Mobile sliding carousel */}
      <div className="sm:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-8 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {videoTestimonials.map((item, i) => (
            <div
              key={item.name}
              className={cn(
                "snap-center shrink-0 w-[82%] transition-all duration-500 ease-out",
                i === active
                  ? "scale-100 opacity-100"
                  : "scale-[0.9] opacity-50",
              )}
            >
              <VideoTestimonialCard item={item} />
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="mt-7 flex items-center justify-center gap-2">
          {videoTestimonials.map((item, i) => (
            <button
              key={item.name}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to ${item.name}'s testimonial`}
              aria-current={i === active}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === active
                  ? "w-7 bg-gradient-brand"
                  : "w-2 bg-border hover:bg-muted-foreground/40",
              )}
            />
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
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-brand-deep p-10 md:p-20 text-center">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-black/30 blur-3xl" />
          <div className="relative max-w-3xl mx-auto">
            <div className="text-white text-3xl md:text-4xl font-black tracking-[0.18em] mb-6 drop-shadow-2xl">
              Iconic Fitness
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">
              Your next workout is one tap away.
            </h2>
            <p className="text-white/85 text-lg md:text-xl mb-10">
              Join 2,000+ members training across Bangalore's best gyms. First
              month, 50% off.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/memberships">
                <Button
                  size="lg"
                  className="!bg-none bg-white text-black hover:bg-white/90 h-14 px-8 text-base font-black tracking-wide w-full sm:w-auto"
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
      {/* <NearbyGyms /> */}
      <FeaturedGyms />
      <HowItWorks />
      <FeatureBlock />
      <Testimonials />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <PricingTeaserSection />
      </section>
      <VideoTestimonials />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <BlogTeaserSection />
      </section>
      <CTA />
      <Footer />
    </div>
  );
}
