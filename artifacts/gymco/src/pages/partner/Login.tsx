import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { partnerApi } from "@/lib/partnerApi";
import {
  Loader2,
  Handshake,
  ShieldCheck,
  Zap,
  QrCode,
  X,
  Mail,
  Lock,
  Sparkles,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function PartnerLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const consumingRef = useRef(false);

  useEffect(() => {
    partnerApi
      .me()
      .then(() => navigate("/partner"))
      .catch(() => {});
  }, [navigate]);

  // If we land via URL ?token=... (e.g. user opens the QR with their phone
  // camera app), auto-consume it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) return;
    consumingRef.current = true;
    partnerApi
      .qrLogin(t)
      .then(() => navigate("/partner"))
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "QR sign-in failed"),
      );
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await partnerApi.login(email, password);
      navigate("/partner");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }

  async function openScanner() {
    setScanErr(null);
    setScanOpen(true);
    // Wait for the modal DOM node to mount, then start camera.
    setTimeout(async () => {
      try {
        const inst = new Html5Qrcode("partner-login-qr");
        scannerRef.current = inst;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decoded) => {
            if (consumingRef.current) return;
            consumingRef.current = true;
            setScanBusy(true);
            try {
              await partnerApi.qrLogin(decoded);
              await stopScanner();
              setScanOpen(false);
              navigate("/partner");
            } catch (e) {
              setScanErr(
                e instanceof Error ? e.message : "QR sign-in failed",
              );
              consumingRef.current = false;
            } finally {
              setScanBusy(false);
            }
          },
          () => {},
        );
      } catch (e) {
        setScanErr(
          e instanceof Error
            ? `Camera error: ${e.message}`
            : "Could not start camera.",
        );
      }
    }, 100);
  }

  async function closeScanner() {
    await stopScanner();
    setScanOpen(false);
    setScanErr(null);
    consumingRef.current = false;
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0b14] text-white">
      {/* Brand background — full-bleed, mobile-first wow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.35),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(217,70,239,0.18),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 80%)",
          }}
        />
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="absolute top-24 -right-20 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-72 w-[120%] bg-gradient-to-t from-orange-600/30 to-transparent blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="text-center mb-7">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 blur-xl opacity-60" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 shadow-[0_15px_40px_-12px_rgba(249,115,22,0.7)] flex items-center justify-center ring-1 ring-white/20">
                <Handshake className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-5 text-4xl font-black tracking-tight bg-gradient-to-r from-orange-300 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              GYMCO
            </div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-orange-300/90 font-bold mt-1.5">
              Partner Portal
            </div>
            <p className="text-sm text-slate-300/80 mt-3 max-w-xs mx-auto leading-relaxed">
              Run your gym, classes, and check-ins from one calm dashboard.
            </p>
          </div>

          {/* QR scan CTA — primary on mobile */}
          <button
            type="button"
            onClick={openScanner}
            className="group relative w-full mb-5 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-xl p-4 flex items-center gap-4 text-left hover:bg-white/[0.09] transition-colors"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 via-transparent to-amber-500/15 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">
                  Scan QR to sign in
                </span>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </div>
              <div className="text-xs text-slate-300/80 mt-0.5">
                One-tap login — point camera at the code from your admin
              </div>
            </div>
            <div className="relative text-[10px] uppercase tracking-wider font-bold text-orange-300 bg-orange-500/15 border border-orange-400/30 rounded-full px-2 py-1">
              Fast
            </div>
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              or sign in with email
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Partner email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60 text-base"
                  placeholder="you@yourgym.in"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60 text-base"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {err && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="relative w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold transition-all shadow-[0_12px_30px_-10px_rgba(249,115,22,0.7)] active:scale-[0.99] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in to portal
            </button>
          </form>

          {/* Trust strip */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
              <div className="text-xs text-slate-300 leading-tight">
                Secure
                <br />
                session login
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-2.5">
              <Zap className="h-4 w-4 text-amber-300 shrink-0" />
              <div className="text-xs text-slate-300 leading-tight">
                Real-time
                <br />
                check-ins
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
            New gym partner? Contact your GYMCO account manager for credentials.
            <br />
            Forgot password? Admin can reset it or issue a one-time QR.
          </p>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#0f0f1a] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-orange-400" />
                <div className="font-semibold text-white">
                  Scan login QR
                </div>
              </div>
              <button
                onClick={closeScanner}
                className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black ring-1 ring-white/10">
                <div id="partner-login-qr" className="absolute inset-0" />
                {/* Viewfinder corners */}
                <div className="pointer-events-none absolute inset-6 rounded-xl">
                  <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-400 rounded-tl-xl" />
                  <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-400 rounded-tr-xl" />
                  <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-400 rounded-bl-xl" />
                  <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-400 rounded-br-xl" />
                </div>
                {scanBusy && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <div className="text-sm">Signing you in…</div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
                Ask your GYMCO admin to open Partners → "QR sign-in" and hold
                the code in front of your camera.
              </p>

              {scanErr && (
                <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  {scanErr}
                </div>
              )}

              <button
                onClick={closeScanner}
                className="mt-4 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
