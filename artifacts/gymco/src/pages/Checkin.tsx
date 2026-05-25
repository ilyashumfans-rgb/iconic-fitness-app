import { useGetCheckinQr, useListCheckins, useCreateCheckin, getGetCheckinQrQueryKey, getListCheckinsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Fingerprint, ScanFace, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Checkin() {
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState(60);
  
  const { data: qr, isLoading: loadingQr, refetch: refetchQr } = useGetCheckinQr({ query: { queryKey: getGetCheckinQrQueryKey(), refetchInterval: 60000 } });
  const { data: history, isLoading: loadingHistory } = useListCheckins({ query: { queryKey: getListCheckinsQueryKey() } });
  
  const createCheckin = useCreateCheckin();

  // Timer effect for rotating QR
  useEffect(() => {
    if (!qr) return;
    
    // Simplistic timer that resets when QR refetches
    setTimeLeft(60);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          refetchQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [qr, refetchQr]);

  const handleDemoCheckin = () => {
    // Demo: check into gym ID 1
    createCheckin.mutate(
      { data: { gymId: 1, method: "qr" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCheckinsQueryKey() });
          toast.success("Checked in successfully", {
            description: "Welcome to the gym. Have a great workout!"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight">Check-in</h1>
        <p className="text-muted-foreground mt-1">Scan at the front desk to enter.</p>
      </div>

      {/* Main QR Card */}
      <Card className="border-none shadow-2xl bg-card overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        <CardContent className="p-8 md:p-12 flex flex-col items-center">
          {loadingQr ? (
            <Skeleton className="w-64 h-64 rounded-2xl" />
          ) : qr ? (
            <>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-inner border border-gray-100 mb-8 relative">
                {/* Scanner corner accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg -ml-2 -mt-2"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg -mr-2 -mt-2"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg -ml-2 -mb-2"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg -mr-2 -mb-2"></div>
                
                <QRCodeSVG value={qr.token} size={240} fgColor="#000" level="Q" className="mx-auto" />
              </div>
              
              <div className="text-center w-full">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Member Code</div>
                <div className="text-4xl font-mono tracking-widest font-black text-foreground">{qr.memberCode}</div>
                <div className="text-sm font-bold text-muted-foreground mt-1">{qr.userName}</div>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground bg-secondary/50 py-2 px-4 rounded-full">
                <QrCode className="h-4 w-4 text-primary" />
                Code refreshes in <span className="font-mono text-foreground font-bold w-6">{timeLeft}s</span>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Demo Button */}
      <Button 
        onClick={handleDemoCheckin} 
        disabled={createCheckin.isPending}
        className="w-full font-bold border-2 border-primary/50" 
        variant="outline"
      >
        [Demo] Simulate Front Desk Scan
      </Button>

      {/* History */}
      <section className="pt-4">
        <h2 className="text-lg font-bold mb-4">Recent Check-ins</h2>
        <div className="space-y-3">
          {loadingHistory ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : history?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">No recent check-ins</div>
          ) : history?.map(checkin => (
            <div key={checkin.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  {checkin.method === 'qr' ? <QrCode className="h-5 w-5 text-muted-foreground" /> :
                   checkin.method === 'face' ? <ScanFace className="h-5 w-5 text-muted-foreground" /> :
                   <Fingerprint className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <div className="font-bold flex items-center text-sm md:text-base">
                    <MapPin className="h-3 w-3 mr-1 text-primary" /> {checkin.gymName}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                    <Clock className="h-3 w-3 mr-1" /> {format(new Date(checkin.checkedInAt), "MMM d, h:mm a")}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase">{checkin.method}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
