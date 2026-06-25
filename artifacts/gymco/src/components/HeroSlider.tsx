import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  image: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

const slides: Slide[] = [
  {
    eyebrow: "The Fitness Company",
    title: "One Membership.",
    highlight: "Every Iconic Gym.",
    subtitle:
      "Unlimited access to every Iconic Fitness location across Bangalore — 365 days a year, one premium pass.",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80",
    primary: { label: "Get your pass", href: "/memberships" },
    secondary: { label: "Browse gyms", href: "/explore" },
  },
  {
    eyebrow: "Train Anywhere",
    title: "Premium Gyms,",
    highlight: "World-Class Equipment.",
    subtitle:
      "From strength floors to reformer studios — discover handpicked gyms built for serious results.",
    image:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1920&q=80",
    primary: { label: "Explore gyms", href: "/explore" },
    secondary: { label: "Book a GX class", href: "/book-gx" },
  },
  {
    eyebrow: "Iconic Store",
    title: "Gear Up.",
    highlight: "Train Like an Icon.",
    subtitle:
      "Shop premium supplements, apparel and accessories — curated by the Iconic Fitness team and delivered to your door.",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80",
    primary: { label: "Shop the store", href: "/store" },
    secondary: { label: "View memberships", href: "/memberships" },
  },
  {
    eyebrow: "Group Classes",
    title: "Every Day,",
    highlight: "Sunrise to Sunset.",
    subtitle:
      "HIIT, yoga, strength and combat — reserve your spot in seconds with live class capacity.",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1920&q=80",
    primary: { label: "Book a class", href: "/book-gx" },
    secondary: { label: "See pricing", href: "/memberships" },
  },
];

const AUTOPLAY_MS = 6000;

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (n: number) => setIndex((n + count) % count),
    [count],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, paused, count]);

  const slide = slides[index];

  return (
    <section
      className="relative h-[88vh] min-h-[560px] max-h-[860px] w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured highlights"
    >
      {/* Background image (crossfade + slow ken-burns zoom) */}
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1 }, scale: { duration: 7, ease: "linear" } }}
        >
          <img
            src={slide.image}
            alt=""
            className="h-full w-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlays for legibility + brand tint */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      <div
        className="absolute inset-0 mix-blend-soft-light opacity-60"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 100%, hsl(91 52% 51% / 0.55), transparent 55%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-5 md:px-8 flex items-center">
        <div className="max-w-2xl pt-20 md:pt-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(91_52%_51%)]" />
                <span className="text-[10.5px] md:text-xs font-bold uppercase tracking-[0.22em] text-white/90">
                  {slide.eyebrow}
                </span>
              </span>

              <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-white">
                {slide.title}
                <span className="block text-[hsl(91_60%_55%)] drop-shadow-[0_2px_24px_hsl(91_60%_45%/0.5)]">
                  {slide.highlight}
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base md:text-lg text-white/80 leading-relaxed">
                {slide.subtitle}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href={slide.primary.href}>
                  <Button
                    size="lg"
                    className="bg-gradient-brand text-white border-none h-13 md:h-14 px-7 text-base font-black tracking-wide shadow-[0_16px_50px_-12px_hsl(91_56%_55%/0.7)] hover:opacity-95 w-full sm:w-auto"
                  >
                    {slide.primary.label}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                {slide.secondary && (
                  <Link href={slide.secondary.href}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-13 md:h-14 px-7 text-base font-bold w-full sm:w-auto bg-white/10 text-white border-white/30 backdrop-blur hover:bg-white/20 hover:text-white"
                    >
                      {slide.secondary.label}
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur hover:bg-black/50 hover:border-[hsl(91_52%_51%)] transition"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur hover:bg-black/50 hover:border-[hsl(91_52%_51%)] transition"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
        {slides.map((s, i) => (
          <button
            key={s.image}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className={
              i === index
                ? "h-2 w-8 rounded-full bg-[hsl(91_52%_51%)] transition-all"
                : "h-2 w-2 rounded-full bg-white/45 hover:bg-white/70 transition-all"
            }
          />
        ))}
      </div>
    </section>
  );
}
