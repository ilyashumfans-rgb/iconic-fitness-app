import { useEffect, useRef, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerGym } from "@/lib/partnerApi";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type ScanResult =
  | { kind: "ok"; gymName: string; userName: string; memberCode: string; at: string }
  | { kind: "err"; message: string };

export default function PartnerScanner() {
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [gymId, setGymId] = useState<number | "">("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastTokenRef = useRef<string>("");
  const lastTokenAtRef = useRef<number>(0);

  useEffect(() => {
    partnerApi.gyms.list().then((g) => {
      setGyms(g);
      if (g.length > 0) setGymId(g[0].id);
    });
  }, []);

  useEffect(() => {
    return () => {
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (!inst) return;
      // Must await stop() before clear(); otherwise html5-qrcode throws
      // "Cannot clear while scan is ongoing" and React's unmount crashes.
      void inst
        .stop()
        .catch(() => {})
        .then(() => {
          try {
            inst.clear();
          } catch {
            /* element may already be detached */
          }
        });
    };
  }, []);

  async function submitToken(token: string) {
    if (!gymId) {
      setResult({ kind: "err", message: "Select a gym first." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const r = await partnerApi.scanCheckin(token, gymId);
      setResult({
        kind: "ok",
        gymName: r.gymName,
        userName: r.userName,
        memberCode: r.memberCode,
        at: new Date(r.checkedInAt).toLocaleString("en-IN"),
      });
    } catch (e: unknown) {
      setResult({
        kind: "err",
        message: e instanceof Error ? e.message : "Scan failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function startScan() {
    setResult(null);
    if (!gymId) {
      setResult({ kind: "err", message: "Select a gym first." });
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setResult({
        kind: "err",
        message:
          "Camera is not available in this browser. Open the site over HTTPS or use the manual token field below.",
      });
      return;
    }
    if (scannerRef.current) {
      const prev = scannerRef.current;
      scannerRef.current = null;
      try { await prev.stop(); } catch { /* ignore */ }
      try { prev.clear(); } catch { /* ignore */ }
    }
    // Expand the reader container BEFORE starting the camera, otherwise
    // html5-qrcode measures a 0-height div and the video can fail to attach.
    setScanning(true);
    // Let React flush the layout change before we hand the element to html5-qrcode.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const inst = new Html5Qrcode("partner-qr-reader");
    scannerRef.current = inst;
    try {
      await inst.start(
        { facingMode: "environment" },
        {
          fps: 10,
          // Adapt qrbox to the available viewfinder size so it never exceeds
          // the actual video stream (which crashes html5-qrcode on small cameras).
          qrbox: (vw: number, vh: number) => {
            const min = Math.min(vw, vh);
            const size = Math.max(150, Math.floor(min * 0.7));
            return { width: size, height: size };
          },
        },
        (decoded) => {
          const now = Date.now();
          if (decoded === lastTokenRef.current && now - lastTokenAtRef.current < 4000) return;
          lastTokenRef.current = decoded;
          lastTokenAtRef.current = now;
          void submitToken(decoded);
        },
        () => {},
      );
    } catch (e: unknown) {
      scannerRef.current = null;
      setScanning(false);
      const raw = e instanceof Error ? e.message : String(e);
      let friendly = `Camera error: ${raw}`;
      if (/permission|denied|NotAllowed/i.test(raw)) {
        friendly =
          "Camera permission was blocked. Allow camera access in your browser settings and try again, or paste the token below.";
      } else if (/NotFound|no camera/i.test(raw)) {
        friendly =
          "No camera was found on this device. You can paste the QR token below instead.";
      } else if (/secure|https/i.test(raw)) {
        friendly =
          "Camera requires a secure (HTTPS) connection. Open the live site, or paste the token below.";
      }
      setResult({ kind: "err", message: friendly });
    }
  }

  async function stopScan() {
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (inst) {
      try { await inst.stop(); } catch { /* ignore */ }
      try { inst.clear(); } catch { /* ignore */ }
    }
    setScanning(false);
  }

  return (
    <PartnerLayout title="Check-in scanner">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PartnerCard>
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-sm font-semibold text-white">Scan member QR</div>
              <div className="text-xs text-slate-400">Point the camera at a member's QR code</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
                Gym
              </label>
              <select
                value={gymId}
                onChange={(e) => setGymId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
              >
                {gyms.length === 0 && <option value="">No gyms yet</option>}
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.area}
                  </option>
                ))}
              </select>
            </div>

            <div
              id="partner-qr-reader"
              className="w-full rounded-xl overflow-hidden bg-black border border-slate-800"
              style={{ minHeight: scanning ? 280 : 0, height: scanning ? "auto" : 0 }}
            />

            <div className="flex gap-2">
              {!scanning ? (
                <button
                  type="button"
                  onClick={startScan}
                  disabled={!gymId}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold"
                >
                  Start camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScan}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
                >
                  Stop camera
                </button>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4">
              <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
                Or paste / type token manually
              </label>
              <div className="flex gap-2">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="GYMCO|MEMBER|…"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono"
                />
                <button
                  type="button"
                  disabled={!manual.trim() || submitting}
                  onClick={() => submitToken(manual.trim())}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
                </button>
              </div>
            </div>
          </div>
        </PartnerCard>

        <PartnerCard>
          <div className="mb-3">
            <div className="text-sm font-semibold text-white">Last scan</div>
            <div className="text-xs text-slate-400">Result of the most recent check-in attempt</div>
          </div>
          {!result && (
            <div className="text-sm text-slate-500 py-8 text-center">
              No scans yet.
            </div>
          )}
          {result?.kind === "ok" && (
            <div className="rounded-xl border border-emerald-700/50 bg-emerald-900/20 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-emerald-300">Checked in</div>
                <div className="text-slate-200 mt-1">{result.userName}</div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {result.memberCode} • {result.gymName}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">at {result.at}</div>
              </div>
            </div>
          )}
          {result?.kind === "err" && (
            <div className="rounded-xl border border-rose-700/50 bg-rose-900/20 p-4 flex items-start gap-3">
              <XCircle className="h-6 w-6 text-rose-400 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-rose-300">Could not check in</div>
                <div className="text-slate-300 mt-1">{result.message}</div>
              </div>
            </div>
          )}
        </PartnerCard>
      </div>
    </PartnerLayout>
  );
}
