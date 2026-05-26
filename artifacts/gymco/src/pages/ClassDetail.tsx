import { useParams, Link, useLocation } from "wouter";
import { useGetClass, useCreateBooking, getGetClassQueryKey, getListMyBookingsQueryKey, getGetDashboardQueryKey, getListClassesQueryKey, getListTrendingClassesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, Clock, User, ChevronLeft, Zap, CheckCircle2, Sparkles } from "lucide-react";
import { LeadEnquiryDialog } from "@/components/LeadEnquiryDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import confetti from "canvas-confetti";

export default function ClassDetail() {
  const { classId } = useParams();
  const id = Number(classId);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const { data: cls, isLoading } = useGetClass(id, { query: { enabled: !!id, queryKey: getGetClassQueryKey(id) } });
  
  const createBooking = useCreateBooking();

  const handleBook = () => {
    createBooking.mutate(
      { data: { classId: id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClassQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListTrendingClassesQueryKey() });
          setBookingSuccess(true);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ccff00', '#ffffff', '#000000'] // primary color
          });
        }
      }
    );
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return 'bg-red-500/20 text-red-500 border-red-500/20';
      case 'medium': return 'bg-orange-500/20 text-orange-500 border-orange-500/20';
      case 'low': return 'bg-green-500/20 text-green-500 border-green-500/20';
      default: return 'bg-primary/20 text-primary border-primary/20';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 md:h-80 w-full rounded-b-3xl" />
        <div className="px-4 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-20" /></div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!cls) return <div className="p-8 text-center">Class not found</div>;

  if (bookingSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-500">
        <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black mb-2">You're booked!</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Your spot for {cls.title} at {cls.gymName} is confirmed. Get ready to sweat.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={() => setLocation("/bookings")} className="w-full font-bold h-12 text-lg">
            View Booking QR
          </Button>
          <Button variant="outline" onClick={() => setLocation("/classes")} className="w-full">
            Browse More Classes
          </Button>
        </div>
      </div>
    );
  }

  const isFull = cls.booked >= cls.capacity;

  return (
    <div className="pb-24 animate-in fade-in duration-500 relative -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <img src={cls.coverImage} alt={cls.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/40" />
        
        <Link href="/classes">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md z-10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-primary text-primary-foreground font-bold">{cls.category}</Badge>
            <Badge variant="outline" className={cn("font-bold backdrop-blur-md border", getIntensityColor(cls.intensity))}>
              {cls.intensity.toUpperCase()} INTENSITY
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 leading-tight">{cls.title}</h1>
        </div>
      </div>

      <div className="px-6 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Key Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-border">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Date</div>
              <div className="font-bold">{format(new Date(cls.startsAt), "MMM d, yyyy")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Time</div>
              <div className="font-bold">{format(new Date(cls.startsAt), "h:mm a")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Duration</div>
              <div className="font-bold">{cls.durationMin} min</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Burn Est.</div>
              <div className="font-bold text-orange-500 flex items-center"><Zap className="h-4 w-4 mr-1" /> {cls.calorieEstimate} kcal</div>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-3">About this class</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{cls.description}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Equipment Needed</h2>
            <div className="flex flex-wrap gap-2">
              {cls.equipmentNeeded.map(eq => (
                <span key={eq} className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm font-medium">
                  {eq}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              <Link href={`/gyms/${cls.gymId}`}>
                <div className="p-4 border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-bold uppercase">Location</div>
                      <div className="font-bold group-hover:text-primary transition-colors">{cls.gymName}</div>
                      <div className="text-xs text-muted-foreground">{cls.gymCity}</div>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
                </div>
              </Link>
              
              <div className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-foreground/50" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-bold uppercase">Trainer</div>
                  <div className="font-bold">{cls.trainerName}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Capacity</span>
                <span className="text-sm font-bold text-muted-foreground">{cls.booked} / {cls.capacity} booked</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-6">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000", isFull ? "bg-red-500" : "bg-primary")} 
                  style={{ width: `${(cls.booked / cls.capacity) * 100}%` }}
                />
              </div>

              <LeadEnquiryDialog
                kind="class"
                classId={cls.id}
                gymId={cls.gymId}
                className={cls.title}
                gymName={cls.gymName}
                source="class-detail"
                trigger={
                  <Button
                    type="button"
                    className="w-full h-14 text-lg font-black tracking-wide mb-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.7)]"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    BOOK FREE CLASS
                  </Button>
                }
              />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full h-12 text-base font-black tracking-wide" 
                    disabled={isFull || createBooking.isPending}
                    variant={isFull ? "secondary" : "outline"}
                  >
                    {isFull ? "CLASS FULL" : "Book with membership"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black">Confirm Booking</AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                      You are about to book <strong>{cls.title}</strong> at <strong>{cls.gymName}</strong> on {format(new Date(cls.startsAt), "MMM d 'at' h:mm a")}.
                      <br/><br/>
                      This will use 1 class credit from your membership.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBook} className="font-bold">Confirm Booking</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
