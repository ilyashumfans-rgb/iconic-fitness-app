import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Sparkles, MapPin, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";

type Booking = {
  classTitle: string;
  gymName: string;
  startsAt: string;
  coverImage: string;
} | null | undefined;

type Props = {
  greeting: string;
  aiTip: string;
  fitnessScore: number;
  streakDays: number;
  userName?: string;
  nextBooking?: Booking;
};

type Slide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  accent?: React.ReactNode;
};

const STOCK = {
  sunrise:
    "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1400&q=80",
  weights:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
  yoga: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1400&q=80",
  city: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
};

export function WowHeroSlider({
  greeting,
  aiTip,
  fitnessScore,
  streakDays,
  userName,
  nextBooking,
}: Props) {
  const slides: Slide[] = [
    {
      id: "greeting",
      image: STOCK.sunrise,
      eyebrow: userName ? `Welcome back, ${userName.split(" ")[0]}` : "Welcome back",
      title: greeting,
      body: aiTip,
      accent: (
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
            <Trophy className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
              Fitness Score
            </div>
            <div className="text-3xl font-black text-white leading-none mt-0.5">
              {fitnessScore}
            </div>
          </div>
        </div>
      ),
    },
    ...(nextBooking
      ? [
          {
            id: "next",
            image: nextBooking.coverImage,
            eyebrow: "Up next today",
            title: nextBooking.classTitle,
            body: nextBooking.gymName,
            cta: { label: "View booking", href: "/bookings" },
            accent: (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 text-white text-sm font-bold">
                <Clock className="h-4 w-4" />
                {new Date(nextBooking.startsAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            ),
          } as Slide,
        ]
      : []),
    {
      id: "streak",
      image: STOCK.weights,
      eyebrow: "Keep the fire alive",
      title:
        streakDays > 0
          ? `${streakDays}-day streak`
          : "Start a streak today",
      body:
        streakDays > 0
          ? "Don't break the chain — one session today keeps it alive."
          : "One workout today, one tomorrow. Streaks build identity.",
      cta: { label: "Find a class", href: "/explore" },
      accent: (
        <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
          <Flame className="h-7 w-7 text-white" />
        </div>
      ),
    },
    {
      id: "discover",
      image: STOCK.city,
      eyebrow: "Unlimited access",
      title: "Walk into any gym in your city",
      body: "One pass. 600+ gyms and studios. Zero commitments.",
      cta: { label: "Explore gyms", href: "/explore" },
      accent: (
        <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
          <MapPin className="h-7 w-7 text-white" />
        </div>
      ),
    },
  ];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const active = slides[index]!;

  return (
    <div
      className="relative h-[340px] md:h-[400px] w-full rounded-3xl overflow-hidden shadow-[0_30px_80px_-30px_hsl(96_56%_55%/0.55)] ring-1 ring-border/60"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <motion.img
            src={active.image}
            alt=""
            initial={{ scale: 1.12 }}
            animate={{ scale: 1.0 }}
            transition={{ duration: 6, ease: "linear" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* brand-tinted gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(96_56%_50%/0.85)] via-[hsl(96_56%_45%/0.75)] to-black/70 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* subtle grain via radial dots */}
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-black/30 blur-3xl" />
        </motion.div>
      </AnimatePresence>

      {/* Drag layer for swipe */}
      <motion.div
        className="absolute inset-0"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) go(index + 1);
          else if (info.offset.x > 60) go(index - 1);
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full p-6 md:p-9 flex flex-col justify-between text-white pointer-events-none">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">
              {active.eyebrow}
            </span>
          </div>
          {active.accent && (
            <div className="pointer-events-auto">{active.accent}</div>
          )}
        </div>

        <div className="pointer-events-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${active.id}-text`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]">
                {active.title}
              </h2>
              <p className="mt-2.5 text-white/90 text-[14px] md:text-[15px] leading-relaxed max-w-lg">
                {active.body}
              </p>
              {active.cta && (
                <Link
                  href={active.cta.href}
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-white text-[hsl(96_56%_45%)] text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition"
                >
                  {active.cta.label}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="mt-5 flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-white"
                    : "w-1.5 bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
