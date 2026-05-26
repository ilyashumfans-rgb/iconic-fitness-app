import { QRCodeSVG } from "qrcode.react";
import { Building2, Dumbbell } from "lucide-react";

export type GymQrPosterGym = {
  id: number;
  name: string;
  slug: string;
  city: string;
  area: string;
};

export function buildGymToken(g: GymQrPosterGym): string {
  return `GYMCO-GYM|${g.id}|${g.slug}`;
}

export function downloadGymQrSvg(gym: GymQrPosterGym, svgId = "gym-qr-svg") {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gymco-checkin-${gym.slug ?? "gym"}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Branded printable check-in poster: GYMCO logo lockup, large QR with orange
 * corner brackets, gym name + area, numbered steps, fallback URL.
 *
 * Wrap with a print-only stylesheet on the page; this component just renders
 * the poster card.
 */
export function GymQrPoster({
  gym,
  svgId = "gym-qr-svg",
  fallbackOrigin,
}: {
  gym: GymQrPosterGym;
  svgId?: string;
  fallbackOrigin?: string;
}) {
  const token = buildGymToken(gym);
  const origin =
    fallbackOrigin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const memberUrl = `${origin}/checkin?gym=${gym.id}`;

  return (
    <div className="p-8 md:p-12 print:p-12">
      {/* Logo lockup */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_10px_30px_-12px_rgba(249,115,22,0.55)]">
          <Dumbbell className="h-5 w-5" />
          <div className="text-left">
            <div className="text-2xl font-black tracking-tight leading-none">
              GYMCO
            </div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/85 mt-0.5">
              Go to any gym
            </div>
          </div>
        </div>

        <div className="mt-6 inline-block px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-black tracking-[0.28em] uppercase">
          Check-in here
        </div>

        <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-[-0.02em] text-slate-900">
          Welcome to {gym.name}
        </h2>
        <p className="mt-2 text-slate-500 text-sm md:text-base flex items-center justify-center gap-1.5">
          <Building2 className="h-4 w-4" />
          {gym.area} · {gym.city}
        </p>
      </div>

      {/* QR with corner brackets */}
      <div className="mt-8 flex justify-center">
        <div className="relative bg-white p-6 md:p-8 rounded-2xl border-2 border-orange-200">
          <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-orange-500 rounded-tl-xl" />
          <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-orange-500 rounded-tr-xl" />
          <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-orange-500 rounded-bl-xl" />
          <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-orange-500 rounded-br-xl" />
          <QRCodeSVG
            id={svgId}
            value={token}
            size={300}
            fgColor="#0f172a"
            bgColor="#ffffff"
            level="H"
            marginSize={2}
          />
        </div>
      </div>

      {/* Steps */}
      <ol className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {[
          { n: 1, t: "Open the app", s: "Tap Check-in" },
          { n: 2, t: "Tap Scan gym QR", s: "Allow camera access" },
          { n: 3, t: "Point at this code", s: "You're in" },
        ].map((step) => (
          <li
            key={step.n}
            className="text-center p-4 rounded-xl bg-orange-50/60 border border-orange-100"
          >
            <div className="mx-auto h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black flex items-center justify-center">
              {step.n}
            </div>
            <div className="mt-2 font-bold text-slate-900 text-sm">
              {step.t}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{step.s}</div>
          </li>
        ))}
      </ol>

      <div className="mt-8 text-center text-xs text-slate-500">
        No app?{" "}
        <span className="font-mono text-slate-700">{memberUrl}</span>
      </div>
      <div className="mt-2 text-center text-[10px] uppercase tracking-[0.22em] text-slate-400">
        GYMCO · Powered by your partner gym
      </div>
    </div>
  );
}
