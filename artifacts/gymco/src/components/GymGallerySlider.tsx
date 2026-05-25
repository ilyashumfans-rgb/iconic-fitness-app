import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X, Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  gymName: string;
}

export function GymGallerySlider({ images, gymName }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [paused, setPaused] = useState(false);

  const count = images.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      const normalized = ((next % count) + count) % count;
      if (normalized === index) return;
      setDirection(next > index ? 1 : -1);
      setIndex(normalized);
    },
    [count, index],
  );

  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  // Autoplay
  useEffect(() => {
    if (paused || lightbox || count <= 1) return;
    const t = setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % count);
    }, 4500);
    return () => clearTimeout(t);
  }, [index, paused, lightbox, count]);

  // Keyboard nav — only when lightbox is open (avoids hijacking page keys)
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  // Body scroll lock while lightbox is open
  useEffect(() => {
    if (!lightbox) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [lightbox]);

  if (count === 0) return null;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 1.05,
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
      scale: 1,
    }),
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary mb-1">
            Inside the gym
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Gallery
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm font-bold hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Images className="h-4 w-4" /> View all {count}
        </button>
      </div>

      <div
        className="relative group rounded-3xl overflow-hidden bg-card border border-border shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Glow halo */}
        <div className="pointer-events-none absolute -inset-20 bg-gradient-brand opacity-15 blur-3xl -z-10" />

        {/* Main stage */}
        <div className="relative aspect-[16/10] md:aspect-[16/9] w-full overflow-hidden">
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <motion.img
              key={index}
              src={images[index]}
              alt={`${gymName} photo ${index + 1}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 260, damping: 32 },
                opacity: { duration: 0.35 },
                scale: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
              }}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          </AnimatePresence>

          {/* Gradient + caption */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                {gymName}
              </div>
              <div className="text-lg md:text-xl font-black mt-0.5">
                Photo {index + 1} of {count}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="pointer-events-auto h-10 w-10 rounded-full bg-white/15 backdrop-blur border border-white/20 hover:bg-white/25 flex items-center justify-center transition-colors"
              aria-label="Open fullscreen"
            >
              <Expand className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Arrows */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/85 backdrop-blur border border-white shadow-lg text-foreground hover:bg-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/85 backdrop-blur border border-white shadow-lg text-foreground hover:bg-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Progress dots */}
          {count > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index
                      ? "w-8 bg-white shadow-md"
                      : "w-1.5 bg-white/50 hover:bg-white/80",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {count > 1 && (
          <div className="p-3 md:p-4 bg-card border-t border-border">
            <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  className={cn(
                    "relative shrink-0 h-16 w-24 md:h-20 md:w-32 rounded-xl overflow-hidden transition-all",
                    i === index
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-[1.02]"
                      : "opacity-60 hover:opacity-100",
                  )}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img
                    src={img}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {i === index && (
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${gymName} gallery, photo ${index + 1} of ${count}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(false);
              }}
              aria-label="Close"
              className="absolute top-5 right-5 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  aria-label="Previous photo"
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  aria-label="Next photo"
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <motion.img
              key={index}
              src={images[index]}
              alt={`${gymName} photo ${index + 1}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-semibold">
              {index + 1} / {count}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
