import { useParams, Link } from "wouter";
import { useGetGym, useListGymClasses, getGetGymQueryKey, getListGymClassesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Clock, Info, ChevronLeft, Calendar, Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { GymGallerySlider } from "@/components/GymGallerySlider";

export default function GymDetail() {
  const { gymId } = useParams();
  const id = Number(gymId);

  const { data: gym, isLoading } = useGetGym(id, { query: { enabled: !!id, queryKey: getGetGymQueryKey(id) } });
  const { data: classes, isLoading: loadingClasses } = useListGymClasses(id, { query: { enabled: !!id, queryKey: getListGymClassesQueryKey(id) } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 md:h-96 w-full rounded-b-3xl" />
        <div className="px-4 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-20" /></div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!gym) return <div className="p-8 text-center">Gym not found</div>;

  return (
    <div className="pb-12 animate-in fade-in duration-500 relative -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      {/* Hero Header */}
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        <img src={gym.heroImage} alt={gym.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/40" />
        
        <Link href="/explore">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md z-10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            {gym.isPremium && <Badge className="bg-primary text-primary-foreground font-bold">PREMIUM</Badge>}
            <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur border-none">
              <Star className="h-3 w-3 mr-1 text-yellow-400 fill-current" /> {gym.rating}
            </Badge>
            {gym.openNow && <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-none backdrop-blur font-bold">OPEN NOW</Badge>}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">{gym.name}</h1>
          <div className="flex items-center text-gray-300 text-sm md:text-base font-medium">
            <MapPin className="h-4 w-4 mr-1 text-primary" />
            {gym.address}, {gym.city}
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <section>
            <h2 className="text-xl font-bold mb-3 flex items-center"><Info className="h-5 w-5 mr-2 text-primary" /> About</h2>
            <p className="text-muted-foreground leading-relaxed">{gym.about}</p>
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-xl font-bold mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {gym.amenities.map(amenity => (
                <span key={amenity} className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm font-medium">
                  {amenity}
                </span>
              ))}
            </div>
          </section>

          {/* Gallery slider */}
          {gym.gallery && gym.gallery.length > 0 && (
            <GymGallerySlider images={gym.gallery} gymName={gym.name} />
          )}

          {/* Enroll CTA */}
          <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-8 md:p-10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.18)]">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(268_76%_58%/0.22)] blur-3xl" />
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

        {/* Right Sidebar - Info & Classes */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="font-bold mb-4">Info</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Hours</div>
                    <div className="text-sm text-muted-foreground">{gym.hours}</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm text-muted-foreground">{gym.address}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-card/50">
              <h3 className="font-bold flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" /> Upcoming Classes
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
              ) : classes?.slice(0, 5).map(cls => (
                <Link key={cls.id} href={`/classes/${cls.id}`}>
                  <div className="p-4 hover:bg-secondary/50 cursor-pointer transition-colors flex items-center gap-4 group">
                    <div className="text-center w-14 shrink-0">
                      <div className="text-xs font-bold text-muted-foreground uppercase">{format(new Date(cls.startsAt), "EEE")}</div>
                      <div className="text-lg font-black text-primary">{format(new Date(cls.startsAt), "HH:mm")}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate group-hover:text-primary transition-colors">{cls.title}</div>
                      <div className="text-xs text-muted-foreground">{cls.durationMin} min • {cls.trainerName}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {classes && classes.length > 5 && (
              <div className="p-4 bg-card/50">
                <Link href="/classes">
                  <Button variant="outline" className="w-full">View all classes</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
