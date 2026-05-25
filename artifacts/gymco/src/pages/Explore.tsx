import { useEffect, useState } from "react";
import { useListGymCategories, useListFeaturedGyms, useListGyms, getListGymCategoriesQueryKey, getListFeaturedGymsQueryKey, getListGymsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, ChevronRight, LayoutGrid, List, Clock } from "lucide-react";
import { Link, useSearch } from "wouter";
import { cn } from "@/lib/utils";

export default function Explore() {
  const queryString = useSearch();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [view, setView] = useState<"grid" | "list">("grid");

  // Sync URL params (?city=..., ?q=..., ?category=...) into local filter state
  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const city = params.get("city");
    const q = params.get("q");
    const category = params.get("category");
    if (q ?? city) setSearch(q ?? city ?? "");
    if (category) setSelectedCategory(category);
  }, [queryString]);
  
  const { data: categories, isLoading: loadingCategories } = useListGymCategories({ query: { queryKey: getListGymCategoriesQueryKey() } });
  const { data: featuredGyms, isLoading: loadingFeatured } = useListFeaturedGyms({ query: { queryKey: getListFeaturedGymsQueryKey() } });
  const { data: gyms, isLoading: loadingGyms } = useListGyms(
    { q: search || undefined, category: selectedCategory }, 
    { query: { queryKey: getListGymsQueryKey({ q: search || undefined, category: selectedCategory }) } }
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Explore</h1>
          <p className="text-muted-foreground mt-1">Find your next training ground.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search gyms, areas..." 
            className="pl-9 bg-card border-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <section>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            variant={selectedCategory === undefined ? "default" : "secondary"}
            className="rounded-full whitespace-nowrap"
            onClick={() => setSelectedCategory(undefined)}
          >
            All
          </Button>
          {loadingCategories ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-full" />)
          ) : categories?.map(cat => (
            <Button
              key={cat.category}
              variant={selectedCategory === cat.category ? "default" : "secondary"}
              className="rounded-full whitespace-nowrap bg-card text-foreground hover:bg-card/80 border border-border"
              onClick={() => setSelectedCategory(cat.category)}
            >
              {cat.category}
            </Button>
          ))}
        </div>
      </section>

      {/* Featured Rail (Only show when not searching/filtering) */}
      {!search && !selectedCategory && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Featured Locations</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {loadingFeatured ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="min-w-[280px] h-[300px] rounded-xl snap-start" />)
            ) : featuredGyms?.map(gym => (
              <Link key={gym.id} href={`/gyms/${gym.id}`}>
                <Card className="min-w-[280px] md:min-w-[320px] h-[300px] hover-elevate cursor-pointer overflow-hidden group snap-start border-none">
                  <div className="relative h-full w-full">
                    <img src={gym.heroImage} alt={gym.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    
                    <div className="absolute top-4 left-4">
                      {gym.isPremium && (
                        <Badge className="bg-primary text-primary-foreground font-bold tracking-wider">PREMIUM</Badge>
                      )}
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="font-black text-2xl leading-tight mb-1">{gym.name}</h3>
                      <div className="flex flex-wrap items-center gap-y-1 text-sm text-gray-300">
                        <div className="flex items-center mr-3">
                          <MapPin className="h-3 w-3 mr-1 text-primary" />
                          {gym.area}, {gym.city}
                        </div>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 mr-1 text-yellow-400 fill-current" />
                          {gym.rating} ({gym.reviewsCount})
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

      {/* Full Results */}
      <section>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">
              {search || selectedCategory ? "Results" : "All Gyms"}
            </h2>
            {!loadingGyms && gyms && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {gyms.length} {gyms.length === 1 ? "gym" : "gyms"} found
              </p>
            )}
          </div>

          {/* Grid / List toggle */}
          <div className="inline-flex items-center rounded-full bg-secondary border border-border p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                view === "grid"
                  ? "bg-gradient-brand text-white shadow-[0_8px_20px_-8px_hsl(18_100%_55%/0.6)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                view === "list"
                  ? "bg-gradient-brand text-white shadow-[0_8px_20px_-8px_hsl(18_100%_55%/0.6)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>

        {loadingGyms ? (
          <div className={cn(view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3")}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={view === "grid" ? "h-64 rounded-xl" : "h-32 rounded-xl"} />
            ))}
          </div>
        ) : gyms?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-lg">No gyms found</p>
            <p className="text-sm">Try adjusting your filters or search term.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gyms?.map((gym) => (
              <Link key={gym.id} href={`/gyms/${gym.id}`}>
                <Card className="hover-elevate cursor-pointer overflow-hidden group border-none shadow-md bg-card h-full">
                  <div className="relative h-48">
                    <img src={gym.heroImage} alt={gym.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-bold text-lg">{gym.name}</h3>
                      <div className="flex items-center text-xs opacity-90">
                        <MapPin className="h-3 w-3 mr-1" />
                        {gym.area} • {gym.distanceKm}km away
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {gym.categories.slice(0, 3).map((cat) => (
                        <span key={cat} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="font-black text-lg">₹{gym.priceFrom}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                      <div className="flex items-center text-sm font-bold">
                        <Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" />
                        {gym.rating}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {gyms?.map((gym) => (
              <Link key={gym.id} href={`/gyms/${gym.id}`}>
                <Card className="hover-elevate cursor-pointer overflow-hidden group border-border shadow-sm bg-card">
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full sm:w-56 md:w-72 shrink-0 h-44 sm:h-auto">
                      <img
                        src={gym.heroImage}
                        alt={gym.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/30 hidden sm:block" />
                    </div>

                    <CardContent className="flex-1 p-5 md:p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="font-black text-lg md:text-xl truncate group-hover:text-primary transition-colors">
                            {gym.name}
                          </h3>
                          <span className="inline-flex items-center text-xs font-bold bg-secondary px-2 py-0.5 rounded">
                            <Star className="h-3 w-3 mr-1 text-yellow-400 fill-current" />
                            {gym.rating}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground mb-2.5">
                          <MapPin className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
                          <span className="truncate">
                            {gym.area} • {gym.distanceKm}km away
                          </span>
                          <span className="mx-2 text-muted-foreground/50">·</span>
                          <Clock className="h-3.5 w-3.5 mr-1 shrink-0" />
                          <span className="truncate">Open today</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {gym.categories.slice(0, 4).map((cat) => (
                            <span
                              key={cat}
                              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-1 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 shrink-0 sm:border-l sm:pl-6 sm:border-border">
                        <div className="text-right">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            From
                          </div>
                          <div className="font-black text-2xl text-gradient-brand leading-none">
                            ₹{gym.priceFrom}
                          </div>
                          <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                            / month
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-2 transition-all">
                          View <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
