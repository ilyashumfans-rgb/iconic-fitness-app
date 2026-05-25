import { useState } from "react";
import { useListMyBookings, useCancelBooking, getListMyBookingsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, Clock, CalendarIcon, QrCode } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

export default function Bookings() {
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const queryClient = useQueryClient();
  
  const { data: bookings, isLoading } = useListMyBookings(
    { status: tab },
    { query: { queryKey: getListMyBookingsQueryKey({ status: tab }) } }
  );

  const cancelBooking = useCancelBooking();

  const handleCancel = (bookingId: number) => {
    cancelBooking.mutate(
      { bookingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-primary text-primary-foreground font-bold">CONFIRMED</Badge>;
      case 'attended': return <Badge variant="secondary" className="bg-green-500/20 text-green-500 font-bold border-none">ATTENDED</Badge>;
      case 'cancelled': return <Badge variant="secondary" className="bg-red-500/20 text-red-500 font-bold border-none">CANCELLED</Badge>;
      default: return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Your Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage your upcoming classes.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-3 bg-card border border-border p-1">
          <TabsTrigger value="upcoming" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Upcoming</TabsTrigger>
          <TabsTrigger value="past" className="font-bold rounded-md">Past</TabsTrigger>
          <TabsTrigger value="cancelled" className="font-bold rounded-md">Cancelled</TabsTrigger>
        </TabsList>
        
        <div className="mt-6 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
          ) : bookings?.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-card rounded-xl border border-border">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">No {tab} bookings found</p>
              {tab === "upcoming" && (
                <Button className="mt-4 font-bold" onClick={() => window.location.href = '/classes'}>
                  Find a Class
                </Button>
              )}
            </div>
          ) : bookings?.map(booking => (
            <Card key={booking.id} className="overflow-hidden border-none shadow-sm bg-card group">
              <div className="flex flex-col md:flex-row">
                {/* QR Section for upcoming */}
                {tab === "upcoming" && booking.qrCode && (
                  <div className="bg-white p-6 flex flex-col items-center justify-center shrink-0 border-r border-gray-100 md:w-48">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 mb-2">
                      <QRCodeSVG value={booking.qrCode} size={100} fgColor="#000" />
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                      <QrCode className="h-3 w-3 mr-1" /> Scan at front desk
                    </div>
                  </div>
                )}
                
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {getStatusBadge(booking.status)}
                      <h3 className="font-black text-2xl mt-2">{booking.classTitle}</h3>
                      <div className="text-sm font-medium text-muted-foreground mt-1">with {booking.trainerName}</div>
                    </div>
                    <div className="text-right shrink-0 bg-secondary/50 rounded-lg p-3 text-center min-w-[80px]">
                      <div className="text-sm font-bold text-muted-foreground uppercase">{format(new Date(booking.startsAt), "MMM")}</div>
                      <div className="text-2xl font-black">{format(new Date(booking.startsAt), "dd")}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm font-medium mb-6">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2 text-foreground/40" />
                      {format(new Date(booking.startsAt), "h:mm a")} ({booking.durationMin}m)
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 text-foreground/40" />
                      {booking.gymName}, {booking.gymCity}
                    </div>
                  </div>
                  
                  {tab === "upcoming" && (
                    <div className="mt-auto flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 font-bold">
                            Cancel Booking
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black text-destructive">Cancel Booking?</AlertDialogTitle>
                            <AlertDialogDescription className="text-base">
                              Are you sure you want to cancel your spot in <strong>{booking.classTitle}</strong>? 
                              <br/><br/>
                              Cancellations within 12 hours of the class start time may incur a penalty or loss of credit.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleCancel(booking.id)} 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                            >
                              Yes, Cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
