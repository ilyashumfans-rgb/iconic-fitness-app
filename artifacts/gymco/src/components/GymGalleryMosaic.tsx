import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Images, Play, X } from "lucide-react";

interface GymGalleryMosaicProps {
  images: string[];
  gymName: string;
  videoUrl?: string | null;
}

type VideoEmbed = { kind: "iframe" | "file"; src: string };

function buildVideoEmbed(url: string | null | undefined): VideoEmbed | null {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  // Direct video file
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { kind: "file", src: u };
  // YouTube (watch, youtu.be, shorts, embed, /v/)
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (yt) {
    const id = yt[1];
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      loop: "1",
      playlist: id,
      controls: "1",
      modestbranding: "1",
      rel: "0",
      playsinline: "1",
    });
    return {
      kind: "iframe",
      src: `https://www.youtube.com/embed/${id}?${params.toString()}`,
    };
  }
  // Vimeo
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1`,
    };
  }
  // Already a known embed/player URL — embed as-is.
  if (/(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/)/i.test(u)) {
    return { kind: "iframe", src: u };
  }
  // Unrecognized URL: do not embed (avoids broken/blank hero slide). The
  // gallery falls back to photo-only behavior.
  return null;
}

const heroSlideVariants = {
  enter: (d: number) => ({ x: d >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (d: number) => ({ x: d >= 0 ? "-100%" : "100%", opacity: 0 }),
};

export function GymGalleryMosaic({
  images,
  gymName,
  videoUrl,
}: GymGalleryMosaicProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [dir, setDir] = useState(1);
  const count = images.length;

  const embed = buildVideoEmbed(videoUrl);
  const hasVideo = !!embed;
  const slideCount = count + (hasVideo ? 1 : 0);
  const isVideoSlide = hasVideo && heroIndex === 0;
  // Map a hero slide index to the underlying gallery image index (or -1 for video)
  const imageIndexForSlide = (slide: number) => (hasVideo ? slide - 1 : slide);

  const advanceSlide = useCallback(
    (delta: number) => {
      if (slideCount < 1) return;
      setDir(delta >= 0 ? 1 : -1);
      setHeroIndex((i) => (i + delta + slideCount) % slideCount);
    },
    [slideCount],
  );

  // Auto-advance the big hero slide. Image slides rotate quickly. A playable
  // file video advances precisely when it finishes (see onEnded) so we only
  // keep a long safety fallback for it; embedded (iframe) videos can't report
  // completion, so they dwell a fixed window. Pauses on hover / lightbox open.
  useEffect(() => {
    if (slideCount < 2 || open || heroPaused) return undefined;
    const isFileVideo = isVideoSlide && embed?.kind === "file";
    const delay = isFileVideo ? 60000 : isVideoSlide ? 9000 : 3500;
    const id = window.setTimeout(() => advanceSlide(1), delay);
    return () => window.clearTimeout(id);
  }, [
    slideCount,
    open,
    heroPaused,
    isVideoSlide,
    embed,
    heroIndex,
    advanceSlide,
  ]);

  const triggerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const openAt = (i: number, e?: React.MouseEvent<HTMLElement>) => {
    if (count === 0) return;
    if (e) triggerRef.current = e.currentTarget;
    setIndex(((i % count) + count) % count);
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

  if (count === 0 && !hasVideo) return null;

  const hero = images[0] ?? "";
  const sideRaw = images.slice(1, 4);
  while (count > 0 && sideRaw.length < 3) sideRaw.push(hero);
  const side = sideRaw;
  const activeImageIndex = imageIndexForSlide(heroIndex);
  const activeHero = images[activeImageIndex] ?? hero;

  const goPrevSlide = () => advanceSlide(-1);
  const goNextSlide = () => advanceSlide(1);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 h-[280px] md:h-[460px] rounded-2xl md:rounded-3xl overflow-hidden">
        {/* Big left slide — video (if set) then auto-rotating photos */}
        <div
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          className="relative group overflow-hidden md:col-span-2 rounded-2xl md:rounded-none bg-black"
        >
          <AnimatePresence initial={false} mode="sync" custom={dir}>
            {isVideoSlide ? (
              <motion.div
                key="hero-video"
                custom={dir}
                variants={heroSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 w-full h-full bg-black"
              >
                {embed!.kind === "file" ? (
                  <video
                    src={embed!.src}
                    autoPlay
                    muted
                    playsInline
                    controls
                    onEnded={goNextSlide}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <iframe
                    src={embed!.src}
                    title={`${gymName} video`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                )}
              </motion.div>
            ) : (
              <motion.button
                key={`hero-img-${heroIndex}`}
                type="button"
                onClick={(e) => openAt(activeImageIndex, e)}
                aria-label={`Open gallery — ${gymName} photo ${activeImageIndex + 1}`}
                custom={dir}
                variants={heroSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src={activeHero}
                  alt={`${gymName} photo ${activeImageIndex + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-transparent pointer-events-none" />
              </motion.button>
            )}
          </AnimatePresence>

          {slideCount > 1 && (
            <>
              <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between gap-3 z-10 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === heroIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/90 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                  {isVideoSlide && <Play className="h-2.5 w-2.5 fill-current" />}
                  {heroIndex + 1} / {slideCount}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrevSlide();
                }}
                aria-label="Previous slide"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/35 hover:bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNextSlide();
                }}
                aria-label="Next slide"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/35 hover:bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Right stack (desktop only) */}
        {count > 0 && (
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
        )}
      </div>

      {/* Mobile "View all photos" pill */}
      {count > 0 && (
        <button
          type="button"
          onClick={(e) => openAt(0, e)}
          className="md:hidden mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-xs font-black uppercase tracking-[0.18em]"
        >
          <Images className="h-3.5 w-3.5" />
          View all {count} photos
        </button>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {open && count > 0 && (
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
