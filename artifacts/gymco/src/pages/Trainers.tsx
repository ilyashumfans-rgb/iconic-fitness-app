import { useState } from "react";
import { useListTrainers, getListTrainersQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function Trainers() {
  const [search, setSearch] = useState("");
  
  const { data: trainers, isLoading } = useListTrainers(
    { specialty: search || undefined }, 
    { query: { queryKey: getListTrainersQueryKey({ specialty: search || undefined }) } }
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Trainers</h1>
          <p className="text-muted-foreground mt-1">Book 1-on-1 sessions with elite coaches.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by specialty..." 
            className="pl-9 bg-card border-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)
        ) : trainers?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
            <p className="font-medium text-lg">No trainers found</p>
          </div>
        ) : trainers?.map(trainer => (
          <Link key={trainer.id} href={`/trainers/${trainer.id}`}>
            <Card className="hover-elevate cursor-pointer overflow-hidden group border-none shadow-md bg-card h-full flex flex-col">
              <div className="relative h-64 overflow-hidden bg-muted">
                <img src={trainer.photoUrl} alt={trainer.name} className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <Badge className="bg-primary text-primary-foreground font-bold mb-2 tracking-wider text-[10px]">{trainer.specialty.toUpperCase()}</Badge>
                  <h3 className="font-black text-2xl leading-tight">{trainer.name}</h3>
                </div>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-foreground/50" />
                    {trainer.city}
                  </div>
                  <div className="flex items-center font-bold text-foreground">
                    <Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" />
                    {trainer.rating} <span className="text-muted-foreground font-normal ml-1">({trainer.sessionsCount})</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border flex justify-between items-end">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Session</div>
                    <div className="font-black text-lg">₹{trainer.pricePerSession}</div>
                  </div>
                  <div className="text-primary font-bold text-sm group-hover:underline">View Profile →</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
