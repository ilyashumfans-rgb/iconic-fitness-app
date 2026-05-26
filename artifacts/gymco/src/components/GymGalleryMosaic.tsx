import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

interface GymGalleryMosaicProps {
  images: string[];
  gymName: string;
}

export function GymGalleryMosaic({ images, gymName }: GymGalleryMosaicProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const count = images.length;

  // Auto-rotate the big hero image when there are 2+ photos
  useEffect(() => {
    if (count < 2 || open || heroPaused) return undefined;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % count);
    }, 3500);
    return () => window.clearInterval(id);
  }, [count, open, heroPaused]);

  const triggerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const openAt = (i: number, e?: React.MouseEvent<HTMLElement>) => {
    if (e) triggerRef.current = e.currentTarget;
    setIndex(i);
    setOpen(true);
  };

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      const n = ((next % count) + count) % count;
      setIndex(n);
    },
    [count],
  );
  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  // Keyboard nav scoped to open lightbox
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next]);

  // Body scroll-lock while open
  useEffect(() => {
    if (!open) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus management: focus close on open, restore on close
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    triggerRef.current?.focus?.();
    return undefined;
  }, [open]);

  if (count === 0) return null;

  const hero = images[0];
  const sideRaw = images.slice(1, 4);
  while (sideRaw.length < 3) sideRaw.push(hero);
  const side = sideRaw;
  const activeHero = images[heroIndex] ?? hero;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 h-[280px] md:h-[460px] rounded-2xl md:rounded-3xl overflow-hidden">
        {/* Big left image — auto-slides */}
        <button
          type="button"
          onClick={(e) => openAt(heroIndex, e)}
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          aria-label={`Open gallery — ${gymName} photo ${heroIndex + 1}`}
          className="relative group overflow-hidden md:col-span-2 rounded-2xl md:rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={heroIndex}
              src={activeHero}
              alt={`${gymName} photo ${heroIndex + 1}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-transparent pointer-events-none" />

          {count > 1 && (
            <>
              <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-1.5">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === heroIndex
                          ? "w-6 bg-white"
                          : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/90 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {heroIndex + 1} / {count}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHeroIndex((i) => (i - 1 + count) % count);
                }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/35 hover:bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHeroIndex((i) => (i + 1) % count);
                }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/35 hover:bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </button>

        {/* Right stack (desktop only) */}
        <div className="hidden md:grid grid-rows-3 gap-3">
          {side.map((src, i) => {
            const isLast = i === 2;
            return (
              <button
                key={`side-${i}`}
                type="button"
                onClick={(e) => openAt(i + 1 < count ? i + 1 : 0, e)}
                aria-label={
                  isLast
                    ? `View all ${count} photos`
                    : `Open gallery — ${gymName} photo ${i + 2}`
                }
                className="relative group overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src={src}
                  alt={isLast ? "" : `${gymName} photo ${i + 2}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                {isLast && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-colors group-hover:bg-black/70">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 text-foreground text-[11px] font-black uppercase tracking-[0.18em] shadow-lg">
                      <Images className="h-3.5 w-3.5" />
                      View Gallery
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile "View all photos" pill */}
      <button
        type="button"
        onClick={(e) => openAt(0, e)}
        className="md:hidden mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-xs font-black uppercase tracking-[0.18em]"
      >
        <Images className="h-3.5 w-3.5" />
        View all {count} photos
      </button>

      {/* Lightbox */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${gymName} gallery, photo ${index + 1} of ${count}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
            onClick={() => setOpen(false)}
          >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              aria-label="Close gallery"
              className="absolute top-5 right-5 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous photo"
              className="absolute left-3 md:left-8 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center transition-colors"
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
              className="absolute right-3 md:right-8 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <motion.img
              key={index}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              src={images[index]}
              alt={`${gymName} photo ${index + 1}`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
            />

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold tracking-wider">
              {index + 1} / {count}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
