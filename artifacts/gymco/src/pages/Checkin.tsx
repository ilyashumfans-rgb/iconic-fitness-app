import {
  useGetCheckinQr,
  useListCheckins,
  useCreateCheckin,
  getGetCheckinQrQueryKey,
  getListCheckinsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Fingerprint,
  ScanFace,
  MapPin,
  Clock,
  Camera,
  X,
  CheckCircle2,
  XCircle,
  ScanLine,
  Hand,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

type Mode = "show" | "scan";

function parseGymToken(decoded: string): number | null {
  // Accept GYMCO-GYM|<id>|<slug> or gym=<id> URL or bare number
  const trimmed = decoded.trim();
  const pipe = trimmed.match(/^GYMCO-GYM\|(\d+)/i);
  if (pipe) return Number(pipe[1]);
  try {
    const u = new URL(trimmed);
    const q = u.searchParams.get("gym");
    if (q && /^\d+$/.test(q)) return Number(q);
  } catch {
    /* not a URL */
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return null;
}

export default function Checkin() {
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState(60);
  const [mode, setMode] = useState<Mode>("show");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastSeenRef = useRef<{ token: string; at: number }>({
    token: "",
    at: 0,
  });

  const {
    data: qr,
    isLoading: loadingQr,
    refetch: refetchQr,
  } = useGetCheckinQr({
    query: {
      queryKey: getGetCheckinQrQueryKey(),
      refetchInterval: 60000,
    },
  });
  const { data: history, isLoading: loadingHistory } = useListCheckins({
    query: { queryKey: getListCheckinsQueryKey() },
  });
  const createCheckin = useCreateCheckin();

  // Rotating QR timer
  useEffect(() => {
    if (!qr) return;
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

  // Auto-open from /checkin?gym=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gymQ = params.get("gym");
    if (gymQ && /^\d+$/.test(gymQ)) {
      submitGymCheckin(Number(gymQ));
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop camera on unmount or mode change. `clear()` must run AFTER `stop()`
  // resolves, otherwise html5-qrcode throws "Cannot clear while scan is ongoing"
  // and the React teardown then crashes with removeChild.
  useEffect(() => {
    return () => {
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (!inst) return;
      void inst
        .stop()
        .catch(() => {})
        .then(() => {
          try {
            inst.clear();
          } catch {
            /* element may already be gone after unmount */
          }
        });
    };
  }, []);

  useEffect(() => {
    if (mode !== "scan" && scannerRef.current) {
      void stopScan();
    }
  }, [mode]);

  async function startScan() {
    setScanError(null);
    if (scannerRef.current) {
      const prev = scannerRef.current;
      scannerRef.current = null;
      try { await prev.stop(); } catch { /* ignore */ }
      try { prev.clear(); } catch { /* ignore */ }
    }
    const inst = new Html5Qrcode("member-gym-reader");
    scannerRef.current = inst;
    try {
      await inst.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          const now = Date.now();
          if (
            decoded === lastSeenRef.current.token &&
            now - lastSeenRef.current.at < 4000
          )
            return;
          lastSeenRef.current = { token: decoded, at: now };
          const gymId = parseGymToken(decoded);
          if (!gymId) {
            setScanError("That QR isn't a GYMCO gym code. Try again.");
            return;
          }
          void submitGymCheckin(gymId);
        },
        () => {
          /* per-frame fail, ignore */
        },
      );
      setScanning(true);
    } catch (e: unknown) {
      setScanError(
        e instanceof Error
          ? `Camera error: ${e.message}`
          : "Could not start camera.",
      );
    }
  }

  async function stopScan() {
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (inst) {
      try {
        await inst.stop();
      } catch {
        /* ignore */
      }
      try {
        inst.clear();
      } catch {
        /* ignore */
      }
    }
    setScanning(false);
  }

  function submitGymCheckin(gymId: number) {
    createCheckin.mutate(
      { data: { gymId, method: "qr" } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({
            queryKey: getListCheckinsQueryKey(),
          });
          toast.success("Checked in", {
            description: `Welcome to ${res.gymName}. Have a great workout!`,
          });
          void stopScan();
          setMode("show");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Couldn't check in.";
          toast.error("Check-in failed", { description: msg });
          setScanError(msg);
        },
      },
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-black tracking-tight">Check-in</h1>
        <p className="text-muted-foreground mt-1">
          {mode === "show"
            ? "Show this QR at the front desk, or scan the gym's poster."
            : "Point your camera at the GYMCO poster at the gym."}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex p-1 rounded-2xl bg-secondary/50 border border-border">
        <button
          type="button"
          onClick={() => setMode("show")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "show"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Hand className="h-4 w-4" /> Show my QR
        </button>
        <button
          type="button"
          onClick={() => setMode("scan")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "scan"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ScanLine className="h-4 w-4" /> Scan gym QR
        </button>
      </div>

      {mode === "show" ? (
        <Card className="border-none shadow-2xl bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
          <CardContent className="p-8 md:p-12 flex flex-col items-center">
            {loadingQr ? (
              <Skeleton className="w-64 h-64 rounded-2xl" />
            ) : qr ? (
              <>
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-inner border border-gray-100 mb-8 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg -ml-2 -mt-2" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg -mr-2 -mt-2" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg -ml-2 -mb-2" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg -mr-2 -mb-2" />
                  <QRCodeSVG
                    value={qr.token}
                    size={240}
                    fgColor="#000"
                    level="Q"
                    className="mx-auto"
                  />
                </div>
                <div className="text-center w-full">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Member Code
                  </div>
                  <div className="text-4xl font-mono tracking-widest font-black text-foreground">
                    {qr.memberCode}
                  </div>
                  <div className="text-sm font-bold text-muted-foreground mt-1">
                    {qr.userName}
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground bg-secondary/50 py-2 px-4 rounded-full">
                  <QrCode className="h-4 w-4 text-primary" />
                  Refreshes in{" "}
                  <span className="font-mono text-foreground font-bold w-6">
                    {timeLeft}s
                  </span>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-2xl bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
          <CardContent className="p-6 md:p-8 flex flex-col items-center">
            <div
              id="member-gym-reader"
              className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black border border-border relative"
            >
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm gap-2 px-6 text-center">
                  <Camera className="h-10 w-10 text-orange-400" />
                  <div className="font-semibold">Camera is off</div>
                  <div className="text-xs text-white/60">
                    Tap start, then point at the gym's QR poster.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2 w-full max-w-sm">
              {!scanning ? (
                <Button
                  onClick={startScan}
                  disabled={createCheckin.isPending}
                  className="flex-1 bg-gradient-brand text-white border-none font-black tracking-wide h-11"
                >
                  <Camera className="h-4 w-4 mr-1.5" /> Start camera
                </Button>
              ) : (
                <Button
                  onClick={stopScan}
                  variant="outline"
                  className="flex-1 font-bold h-11"
                >
                  <X className="h-4 w-4 mr-1.5" /> Stop
                </Button>
              )}
            </div>

            {scanError && (
              <div className="mt-4 w-full max-w-sm rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                <div className="text-xs text-rose-600">{scanError}</div>
              </div>
            )}

            {createCheckin.isPending && (
              <div className="mt-4 w-full max-w-sm rounded-xl border border-orange-500/40 bg-orange-500/5 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                <div className="text-xs font-semibold text-orange-700">
                  Checking you in…
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-muted-foreground text-center max-w-sm">
              Can't find a poster? Ask the front desk to open{" "}
              <span className="font-semibold">Display gym QR</span> in the
              partner portal.
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <section className="pt-2">
        <h2 className="text-lg font-bold mb-4">Recent Check-ins</h2>
        <div className="space-y-3">
          {loadingHistory ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))
          ) : history?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              No recent check-ins
            </div>
          ) : (
            history?.map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    {checkin.method === "qr" ? (
                      <QrCode className="h-5 w-5 text-muted-foreground" />
                    ) : checkin.method === "face" ? (
                      <ScanFace className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Fingerprint className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold flex items-center text-sm md:text-base">
                      <MapPin className="h-3 w-3 mr-1 text-primary" />{" "}
                      {checkin.gymName}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                      <Clock className="h-3 w-3 mr-1" />{" "}
                      {format(
                        new Date(checkin.checkedInAt),
                        "MMM d, h:mm a",
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold uppercase"
                >
                  {checkin.method}
                </Badge>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
