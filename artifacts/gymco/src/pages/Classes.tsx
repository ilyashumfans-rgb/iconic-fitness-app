import { useState } from "react";
import { useListClasses, useListTrendingClasses, getListClassesQueryKey, getListTrendingClassesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Search, ChevronRight, Zap } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Classes() {
  const [search, setSearch] = useState("");
  
  const { data: trending, isLoading: loadingTrending } = useListTrendingClasses({ query: { queryKey: getListTrendingClassesQueryKey() } });
  const { data: classes, isLoading: loadingClasses } = useListClasses(
    { category: search || undefined }, 
    { query: { queryKey: getListClassesQueryKey({ category: search || undefined }) } }
  );

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return 'bg-red-500/20 text-red-500 border-red-500/20';
      case 'medium': return 'bg-lime-500/20 text-lime-500 border-lime-500/20';
      case 'low': return 'bg-green-500/20 text-green-500 border-green-500/20';
      default: return 'bg-primary/20 text-primary border-primary/20';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Classes</h1>
          <p className="text-muted-foreground mt-1">Book your next sweat session.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by category (e.g. Yoga)" 
            className="pl-9 bg-card border-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Trending Rail */}
      {!search && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center"><Zap className="h-5 w-5 mr-2 text-primary" /> Trending Now</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {loadingTrending ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="min-w-[280px] h-[200px] rounded-xl snap-start" />)
            ) : trending?.map(cls => (
              <Link key={cls.id} href={`/classes/${cls.id}`}>
                <Card className="min-w-[280px] h-[200px] hover-elevate cursor-pointer overflow-hidden group snap-start border-none">
                  <div className="relative h-full w-full">
                    <img src={cls.coverImage} alt={cls.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    
                    <div className="absolute top-4 left-4">
                      <Badge variant="outline" className={cn("font-bold tracking-wider border", getIntensityColor(cls.intensity))}>
                        {cls.intensity.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{cls.category}</div>
                      <h3 className="font-bold text-xl leading-tight mb-1">{cls.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-300 font-medium">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(cls.startsAt), "HH:mm")} ({cls.durationMin}m)
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Class List */}
      <section>
        <h2 className="text-xl font-bold mb-4">Upcoming Schedule</h2>
        <div className="space-y-4">
          {loadingClasses ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          ) : classes?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
              <p className="font-medium text-lg">No classes found</p>
            </div>
          ) : classes?.map(cls => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <Card className="hover-elevate cursor-pointer overflow-hidden group border-none shadow-sm bg-card flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-32 md:h-auto relative shrink-0">
                  <img src={cls.coverImage} alt={cls.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                </div>
                <CardContent className="p-4 md:p-6 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{cls.category}</div>
                      <h3 className="font-bold text-lg">{cls.title}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-lg">{format(new Date(cls.startsAt), "HH:mm")}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(cls.startsAt), "MMM d")}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-foreground/50" />
                      {cls.gymName}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-foreground/50" />
                      {cls.durationMin} min
                    </div>
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-medium rounded-sm px-1.5 py-0.5 text-[10px] uppercase">
                      {cls.trainerName}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", (cls.booked / cls.capacity) > 0.8 ? "bg-red-500" : "bg-primary")} 
                          style={{ width: `${(cls.booked / cls.capacity) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                        {cls.booked}/{cls.capacity} BOOKED
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
