import { useParams, Link } from "wouter";
import { useGetTrainer, getGetTrainerQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Award, ChevronLeft } from "lucide-react";

export default function TrainerDetail() {
  const { trainerId } = useParams();
  const id = Number(trainerId);

  const { data: trainer, isLoading } = useGetTrainer(id, { query: { enabled: !!id, queryKey: getGetTrainerQueryKey(id) } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 md:h-96 w-full rounded-b-3xl" />
        <div className="px-4 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!trainer) return <div className="p-8 text-center">Trainer not found</div>;

  return (
    <div className="pb-12 animate-in fade-in duration-500 relative -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      {/* Hero */}
      <div className="relative h-72 md:h-96 w-full bg-muted">
        <img src={trainer.photoUrl} alt={trainer.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/30" />
        
        <Link href="/trainers">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md z-10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
      </div>

      <div className="px-6 md:px-8 -mt-20 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <Badge className="bg-primary text-primary-foreground font-bold mb-3 tracking-wider">{trainer.specialty.toUpperCase()}</Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2">{trainer.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-primary" />
                {trainer.city}
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" />
                <span className="text-foreground font-bold">{trainer.rating}</span> ({trainer.sessionsCount} sessions)
              </div>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">{trainer.bio}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 flex items-center"><Award className="h-5 w-5 mr-2 text-primary" /> Certifications</h2>
            <ul className="space-y-3">
              {trainer.certifications.map(cert => (
                <li key={cert} className="flex items-center p-3 bg-card rounded-lg border border-border shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mr-3" />
                  <span className="font-medium">{cert}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6 lg:mt-20">
          <Card className="bg-card border-none shadow-xl sticky top-24">
            <CardContent className="p-6">
              <div className="text-center mb-6 pb-6 border-b border-border">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Session Rate</div>
                <div className="text-4xl font-black">₹{trainer.pricePerSession}</div>
              </div>
              
              <Button className="w-full h-14 text-lg font-black tracking-wide" disabled>
                REQUEST SESSION
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3 font-medium">
                Trainer schedules are currently handled via direct request.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
