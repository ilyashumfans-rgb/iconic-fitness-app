import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListFeaturedGyms } from "@workspace/api-client-react";
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
  PlayCircle,
  Quote,
  Star,
  Search,
  Clock,
  Crown,
} from "lucide-react";
import logoUrl from "@assets/Go_To_Any_Gym._(2)_1779712879770.png";

const popularCities = [
  "Bangalore",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
];

const heroSlides = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=85",
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1920&q=85",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=85",
  "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1920&q=85",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1920&q=85",
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

const plans = [
  {
    name: "Lite",
    price: "1,499",
    strikethrough: "1,999",
    tagline: "Try the network",
    perks: ["Access to 80+ gyms", "6 classes / month", "Cancel anytime"],
    cta: "Start with Lite",
    popular: false,
  },
  {
    name: "Pro",
    price: "2,999",
    strikethrough: "3,999",
    tagline: "Most popular",
    perks: [
      "Access to 350+ gyms",
      "20 classes / month",
      "Trainer marketplace",
      "Wallet cashback",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Elite",
    price: "4,999",
    strikethrough: "6,499",
    tagline: "Unlimited everything",
    perks: [
      "All 500+ gyms",
      "Unlimited classes",
      "Priority booking",
      "Free guest passes",
    ],
    cta: "Unlock Elite",
    popular: false,
  },
];

function TopNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src={logoUrl}
            alt="GYMCO"
            className="h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(255,107,26,0.5)]"
          />
          <span className="text-xl font-black tracking-tight text-gradient-brand">
            GYMCO
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#how" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#gyms" className="hover:text-foreground transition-colors">
            Gyms
          </a>
          <a href="#classes" className="hover:text-foreground transition-colors">
            Classes
          </a>
          <a href="#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-sm font-semibold hidden sm:inline-flex">
              Sign in
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-gradient-brand text-white border-none font-bold shadow-[0_8px_24px_-8px_hsl(18_100%_55%/0.7)] hover:opacity-95">
              Open app <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIdx((i) => (i + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    const qs = params.toString();
    navigate(`/explore${qs ? `?${qs}` : ""}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-28 md:pt-32 pb-20 md:pb-28 overflow-hidden">
      {/* Background slider */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={slideIdx}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ opacity: { duration: 1.6 }, scale: { duration: 6, ease: "linear" } }}
            className="absolute inset-0"
          >
            <img
              src={heroSlides[slideIdx]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
        {/* Overlays — let the slider breathe while keeping text readable */}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[140px] mix-blend-screen" />
        <div className="absolute -top-20 right-0 h-[32rem] w-[32rem] rounded-full bg-[hsl(268_76%_58%/0.3)] blur-[160px] mix-blend-screen" />
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-[hsl(330_90%_55%/0.25)] blur-[140px] mix-blend-screen" />
      </div>

      {/* Slide indicator dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSlideIdx(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === slideIdx
                ? "w-10 bg-gradient-brand shadow-[0_0_12px_hsl(18_100%_55%/0.8)]"
                : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">
              Now live in 12 Indian cities
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-[-0.03em] leading-[1] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            One Membership
            <br />
            <span className="text-gradient-brand">Unlimited Gyms</span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
            Access India's best gyms and studios on a single pass. Book any
            class, walk in with a QR — from sunrise yoga to midnight MMA.
          </p>

          {/* Search bar — the killer hero feature */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-10 w-full max-w-3xl mx-auto"
          >
            <div className="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-background/40 rounded-xl">
                <Search className="h-5 w-5 text-primary shrink-0" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search gym or activity..."
                  className="border-0 bg-transparent h-10 text-base text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                />
              </div>
              <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-background/40 rounded-xl md:max-w-[260px]">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City or location..."
                  className="border-0 bg-transparent h-10 text-base text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
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

            {/* Popular city pills */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 mr-1">
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
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/15 hover:text-white hover:border-primary/40 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </motion.form>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/memberships">
              <Button
                size="lg"
                className="bg-gradient-brand text-white border-none h-14 px-8 text-base font-black tracking-wide shadow-[0_16px_50px_-12px_hsl(18_100%_55%/0.8)] hover:opacity-95 w-full sm:w-auto"
              >
                Get GYMCO Pass <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold bg-white/5 border-white/15 text-white hover:bg-white/10 w-full sm:w-auto"
            >
              <PlayCircle className="h-5 w-5 mr-2" /> Watch the film
            </Button>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex items-center gap-6 flex-wrap justify-center">
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
            <div>
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
                <span className="text-white text-sm font-bold ml-1.5">4.9</span>
              </div>
              <div className="text-xs text-white/60 mt-0.5">
                Loved by 40,000+ members
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-white/10 border border-white/10 backdrop-blur-xl"
        >
          {stats.map((s) => (
            <div key={s.label} className="bg-background/70 p-6 md:p-8">
              <div className="text-3xl md:text-4xl font-black text-gradient-brand">
                {s.value}
              </div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-wider text-white/60 mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PartnerStrip() {
  return (
    <section className="border-y border-white/5 bg-background/50 py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-white/40 mb-6">
          Trusted by India's best fitness brands
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {partnerGyms.map((g) => (
            <div
              key={g.name}
              className="text-lg md:text-xl font-black tracking-wider text-white/40 hover:text-white transition-colors"
            >
              {g.letters}
            </div>
          ))}
        </div>
      </div>
    </section>
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
                  <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
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
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70"
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
              <div className="relative h-full rounded-2xl border border-white/10 bg-card/60 backdrop-blur-sm p-8 overflow-hidden transition-all hover:border-primary/40 hover:-translate-y-1 duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-brand-soft" />
                <div className="relative">
                  <div className="text-7xl font-black text-white/5 absolute -top-4 -right-2 select-none">
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
    <section id="gyms" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
            Built for the way you train
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-8">
            More than a gym pass.{" "}
            <span className="text-gradient-brand">A fitness OS.</span>
          </h2>
          <div className="space-y-6">
            {[
              {
                icon: Heart,
                title: "AI-powered recommendations",
                body: "We learn what you love. Get class suggestions tailored to your goals, sleep and recovery.",
              },
              {
                icon: Trophy,
                title: "Streaks & fitness score",
                body: "Compete with yourself. Daily score, weekly streaks, and milestone rewards keep you honest.",
              },
              {
                icon: Dumbbell,
                title: "Trainer marketplace",
                body: "Book India's best coaches 1-on-1 or in small groups. Strength, mobility, nutrition — your call.",
              },
              {
                icon: Flame,
                title: "Cashback wallet",
                body: "Every class earns reward points. Redeem for free classes, gear, and trainer credits.",
              },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-brand-soft border border-primary/20 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-lg mb-1">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 bg-gradient-brand opacity-30 blur-3xl -z-10" />
          <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1571388208497-71bedc66e932?w=1200&q=80"
              alt="Train anywhere"
              className="w-full aspect-[4/5] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Live now
                </div>
                <div className="text-white font-black text-xl">
                  124 members training across Bangalore
                </div>
              </div>
            </div>
          </div>
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
              className="rounded-2xl bg-card/70 backdrop-blur-sm border border-white/10 p-8 relative"
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

function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
            Pricing
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
            Pick a pass. <span className="text-gradient-brand">Cancel anytime.</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            All plans include city-wide access, the trainer marketplace, and the
            GYMCO wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 flex flex-col ${
                plan.popular
                  ? "bg-card ring-glow-brand scale-[1.03] z-10"
                  : "bg-card/70 border border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-brand text-white text-[10px] font-black tracking-[0.18em] px-4 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-black">GYMCO {plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.tagline}
                </p>
              </div>
              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-end gap-1">
                  <span className="text-base font-bold text-muted-foreground mb-2">
                    ₹
                  </span>
                  <span className="text-5xl font-black tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground mb-2">
                    /mo
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{plan.strikethrough}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Save 25%
                  </span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.perks.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link href="/memberships">
                <Button
                  className={`w-full h-12 font-black tracking-wide ${
                    plan.popular
                      ? "bg-gradient-brand text-white border-none shadow-[0_10px_30px_-10px_hsl(18_100%_55%/0.7)] hover:opacity-95"
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "secondary"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
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
            <img
              src={logoUrl}
              alt=""
              className="h-20 w-20 object-contain mx-auto mb-6 drop-shadow-2xl"
            />
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

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt="GYMCO" className="h-8 w-8 object-contain" />
            <span className="text-lg font-black tracking-tight text-gradient-brand">
              GYMCO
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">About</a>
            <a href="#" className="hover:text-foreground">Partners</a>
            <a href="#" className="hover:text-foreground">Careers</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
          <div className="text-xs text-muted-foreground">
            © 2026 GYMCO India · Made in Bangalore
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <PartnerStrip />
      <FeaturedGyms />
      <HowItWorks />
      <Categories />
      <FeatureBlock />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
