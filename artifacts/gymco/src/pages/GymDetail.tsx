import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetGym,
  useListGymClasses,
  getGetGymQueryKey,
  getListGymClassesQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";
import {
  MapPin,
  Star,
  Clock,
  Info,
  Calendar,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Navigation,
  Dot,
} from "lucide-react";
import { format } from "date-fns";
import { GymGalleryMosaic } from "@/components/GymGalleryMosaic";

type AmenityRow = {
  id: number;
  name: string;
  description?: string;
  icon: string;
};
type HourRow = {
  dayOfWeek: number;
  isClosed: boolean;
  openMinute: number;
  closeMinute: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtMinutes(m: number): string {
  const safe = Math.max(0, Math.min(1440, Math.round(m)));
  const h = Math.floor(safe / 60);
  const mm = safe % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const lookup = (LucideIcons as unknown as Record<string, unknown>)[name];
  const Comp =
    typeof lookup === "function" || typeof lookup === "object"
      ? (lookup as React.ComponentType<{ className?: string }>)
      : Dot;
  try {
    return <Comp className={className} />;
  } catch {
    return <Dot className={className} />;
  }
}

export default function GymDetail() {
  const { gymId } = useParams();
  const id = Number(gymId);

  const { data: gym, isLoading } = useGetGym(id, {
    query: { enabled: !!id, queryKey: getGetGymQueryKey(id) },
  });
  const { data: classes, isLoading: loadingClasses } = useListGymClasses(id, {
    query: { enabled: !!id, queryKey: getListGymClassesQueryKey(id) },
  });

  const [amenityData, setAmenityData] = useState<{
    catalog: AmenityRow[];
    custom: AmenityRow[];
  } | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<HourRow[] | null>(null);

  useEffect(() => {
    if (!id) return;
    let abort = false;
    (async () => {
      try {
        const [amRes, hrRes] = await Promise.all([
          fetch(`/api/gyms/${id}/amenities`),
          fetch(`/api/gyms/${id}/hours`),
        ]);
        if (amRes.ok) {
          const a = await amRes.json();
          if (!abort) setAmenityData(a);
        }
        if (hrRes.ok) {
          const h = await hrRes.json();
          if (!abort) setWeeklyHours(h);
        }
      } catch {
        // silent — fall back to gym.amenities/hours fields
      }
    })();
    return () => {
      abort = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-[280px] md:h-[460px] w-full rounded-2xl md:rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!gym) return <div className="p-8 text-center">Gym not found</div>;

  const galleryImages =
    gym.gallery && gym.gallery.length > 0
      ? gym.gallery
      : gym.heroImage
        ? [gym.heroImage]
        : [];

  return (
    <div className="pb-16 animate-in fade-in duration-500 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs md:text-sm flex items-center gap-1.5 text-muted-foreground font-medium">
        <Link href="/">
          <span className="hover:text-foreground transition-colors cursor-pointer">
            Home
          </span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <Link href="/explore">
          <span className="hover:text-foreground transition-colors cursor-pointer">
            Browse Gyms
          </span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="text-foreground font-bold truncate">{gym.name}</span>
      </nav>

      {/* Gallery mosaic at top */}
      <GymGalleryMosaic images={galleryImages} gymName={gym.name} />

      {/* Gym header row — name, badges, location */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <header>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {gym.isPremium && (
                <Badge className="bg-gradient-brand text-white border-none font-black uppercase tracking-wider px-2.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Elite
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-secondary text-foreground border-none font-bold"
              >
                <Star className="h-3 w-3 mr-1 text-yellow-400 fill-current" />
                {gym.rating}
              </Badge>
              {gym.openNow && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 border-none font-bold uppercase tracking-wider"
                >
                  Open now
                </Badge>
              )}
              <span className="text-xs text-muted-foreground font-medium">
                Group Classes
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {gym.name}
            </h1>
          </header>

          {/* Location + hours card (cult.fit style) */}
          <Card className="border-border bg-card">
            <CardContent className="p-0 divide-y divide-border">
              <div className="p-5 md:p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary inline-flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">
                    {gym.area} <span className="text-muted-foreground">•</span>{" "}
                    {gym.city}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {gym.address}
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${gym.name} ${gym.address}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-primary hover:opacity-80 transition-opacity shrink-0"
                >
                  <Navigation className="h-4 w-4" />
                  Navigate
                </a>
              </div>
              <div className="p-5 md:p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary inline-flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{gym.hours}</div>
                  <div className="text-sm text-green-600 font-bold mt-0.5">
                    {gym.openNow ? "Open now" : "Closed"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <section>
            <h2 className="text-xl font-bold mb-3 flex items-center">
              <Info className="h-5 w-5 mr-2 text-primary" /> About
            </h2>
            <p className="text-muted-foreground leading-relaxed">{gym.about}</p>
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-xl font-bold mb-3">Amenities</h2>
            {amenityData &&
            (amenityData.catalog.length > 0 ||
              amenityData.custom.length > 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...amenityData.catalog, ...amenityData.custom].map((a) => (
                  <div
                    key={`a-${a.id}-${a.name}`}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3 py-2.5"
                    title={a.description ?? ""}
                  >
                    <span className="h-8 w-8 rounded-full bg-primary/10 inline-flex items-center justify-center shrink-0">
                      <AmenityIcon
                        name={a.icon}
                        className="h-4 w-4 text-primary"
                      />
                    </span>
                    <span className="text-sm font-semibold truncate">
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gym.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Weekly hours */}
          {weeklyHours && weeklyHours.length === 7 && (
            <section>
              <h2 className="text-xl font-bold mb-3 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-primary" /> Weekly hours
              </h2>
              <Card className="border-border bg-card">
                <CardContent className="p-0 divide-y divide-border">
                  {weeklyHours.map((h) => (
                    <div
                      key={h.dayOfWeek}
                      className="px-5 py-3 flex items-center justify-between"
                    >
                      <span className="font-semibold text-sm">
                        {DAY_NAMES[h.dayOfWeek]}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {h.isClosed
                          ? "Closed"
                          : `${fmtMinutes(h.openMinute)} – ${fmtMinutes(h.closeMinute)}`}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Enroll CTA */}
          <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-8 md:p-10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.18)]">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(32_100%_55%/0.22)] blur-3xl" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                    Limited launch offer
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                  Train at{" "}
                  <span className="text-gradient-brand">{gym.name}</span>{" "}
                  starting today
                </h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  Activate your GYMCO Pass and walk in with a QR. Cancel anytime
                  — no long contracts, no joining fees.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Unlimited check-ins, 7 days a week",
                    "Access 500+ partner gyms across India",
                    "Freeze or cancel anytime",
                  ].map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2.5 text-sm font-medium"
                    >
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col items-stretch gap-3 md:items-end">
                <div className="rounded-2xl bg-background/80 backdrop-blur border border-border p-6 w-full max-w-sm md:ml-auto shadow-md">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Starting from
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-4xl md:text-5xl font-black text-gradient-brand">
                      ₹{gym.priceFrom}
                    </span>
                    <span className="text-base font-bold text-muted-foreground">
                      / month
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Billed monthly • taxes included
                  </div>

                  <Link href="/memberships">
                    <Button
                      size="lg"
                      className="mt-5 w-full bg-gradient-brand text-white border-none h-14 text-base font-black tracking-wide shadow-[0_16px_50px_-12px_hsl(18_100%_55%/0.6)] hover:opacity-95"
                    >
                      Enroll now <ArrowRight className="h-5 w-5 ml-1.5" />
                    </Button>
                  </Link>

                  <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    7-day money-back guarantee
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right sidebar: Book a class for free + Cultpass-style card */}
        <aside className="space-y-6 lg:sticky lg:top-24 self-start">
          <Card className="border-border bg-card overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-black text-lg leading-tight">
                    Book a class for free
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Try out a free class at this center to experience formats
                    first-hand.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-black text-gradient-brand leading-none">
                    2
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                    Free trial
                    <br />
                    classes
                  </div>
                </div>
              </div>
              <Link href="/classes">
                <Button
                  variant="outline"
                  className="w-full font-black uppercase tracking-wider border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Try for free
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-card to-secondary/30 overflow-hidden">
            <CardContent className="p-6">
              <div className="inline-flex items-center gap-1.5 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                  GYMCO Pass Elite
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Unlimited access to group classes & all Elite + Pro gyms across
                India.
              </p>
              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-3xl font-black">₹{gym.priceFrom}</span>
                <span className="text-xs font-bold text-muted-foreground">
                  per month onwards
                </span>
              </div>
              <Link href="/memberships">
                <Button className="w-full bg-gradient-brand text-white border-none font-black uppercase tracking-wider">
                  Buy now
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border bg-card/50">
              <h3 className="font-bold flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" /> Upcoming
                Classes
              </h3>
            </div>
            <div className="divide-y divide-border">
              {loadingClasses ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : classes?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No upcoming classes scheduled.
                </div>
              ) : (
                classes?.slice(0, 5).map((cls) => (
                  <Link key={cls.id} href={`/classes/${cls.id}`}>
                    <div className="p-4 hover:bg-secondary/50 cursor-pointer transition-colors flex items-center gap-4 group">
                      <div className="text-center w-14 shrink-0">
                        <div className="text-xs font-bold text-muted-foreground uppercase">
                          {format(new Date(cls.startsAt), "EEE")}
                        </div>
                        <div className="text-lg font-black text-primary">
                          {format(new Date(cls.startsAt), "HH:mm")}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate group-hover:text-primary transition-colors">
                          {cls.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cls.durationMin} min • {cls.trainerName}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {classes && classes.length > 5 && (
              <div className="p-4 bg-card/50">
                <Link href="/classes">
                  <Button variant="outline" className="w-full">
                    View all classes
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
