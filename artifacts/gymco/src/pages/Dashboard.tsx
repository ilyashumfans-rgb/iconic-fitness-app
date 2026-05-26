import { useGetDashboard, getGetDashboardQueryKey, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Flame, MapPin, ChevronRight, Clock, Droplets, Moon, Star } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BlogTeaserSection } from "@/components/BlogTeaserSection";
import { WowHeroSlider } from "@/components/WowHeroSlider";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Wow Slider */}
      <WowHeroSlider
        greeting={dashboard.greeting}
        aiTip={dashboard.aiTip}
        fitnessScore={dashboard.fitnessScore}
        streakDays={dashboard.streakDays}
        userName={me?.name}
        nextBooking={dashboard.nextBooking ?? undefined}
      />

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border/60 hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-primary">
                <Zap className="h-6 w-6" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Score</span>
              </div>
              <div className="text-4xl font-black text-gradient-brand">{dashboard.fitnessScore}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-orange-500">
                <Flame className="h-6 w-6" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Streak</span>
              </div>
              <div className="text-4xl font-black">{dashboard.streakDays}<span className="text-xl text-muted-foreground ml-1">days</span></div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-blue-500">
                <Droplets className="h-6 w-6" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Water</span>
              </div>
              <div className="text-4xl font-black">{dashboard.waterMl}<span className="text-xl text-muted-foreground ml-1">ml</span></div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-indigo-500">
                <Moon className="h-6 w-6" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sleep</span>
              </div>
              <div className="text-4xl font-black">{dashboard.sleepHours}<span className="text-xl text-muted-foreground ml-1">h</span></div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Next Booking */}
      {dashboard.nextBooking && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Up Next</h2>
          </div>
          <Link href="/bookings">
            <Card className="hover-elevate cursor-pointer overflow-hidden border-none shadow-md">
              <div className="flex h-32">
                <div className="w-32 bg-muted relative">
                  <img src={dashboard.nextBooking.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                </div>
                <div className="flex-1 p-4 flex flex-col justify-center bg-card">
                  <h3 className="font-bold text-lg">{dashboard.nextBooking.classTitle}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {dashboard.nextBooking.gymName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-primary font-medium mt-2">
                    <Clock className="h-4 w-4" />
                    {new Date(dashboard.nextBooking.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* Gyms near you */}
      {dashboard.nearbyGyms.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Gyms near you</h2>
            <Link href="/explore" className="text-sm text-primary font-medium flex items-center">
              See all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboard.nearbyGyms.map((g) => (
              <Link key={g.id} href={`/gyms/${g.id}`}>
                <Card className="hover-elevate cursor-pointer overflow-hidden group">
                  <div className="relative h-40">
                    <img
                      src={g.heroImage}
                      alt={g.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {g.area || g.city}
                      </div>
                      <h3 className="font-bold text-lg leading-tight">{g.name}</h3>
                      <div className="flex items-center gap-3 text-sm opacity-90 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {g.rating?.toFixed?.(1) ?? g.rating}
                        </span>
                        {typeof g.distanceKm === "number" && (
                          <span>{g.distanceKm.toFixed(1)} km away</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <BlogTeaserSection />
    </div>
  );
}
