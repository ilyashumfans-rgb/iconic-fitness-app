import { useEffect, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerGym } from "@/lib/partnerApi";
import { QRCodeSVG } from "qrcode.react";
import { Building2, Printer, Smartphone, Download, RefreshCcw } from "lucide-react";

function buildGymToken(g: PartnerGym): string {
  return `GYMCO-GYM|${g.id}|${g.slug}`;
}

export default function PartnerDisplayQr() {
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [gymId, setGymId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnerApi.gyms.list()
      .then((g) => {
        setGyms(g);
        if (g.length > 0) setGymId(g[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const gym = gyms.find((g) => g.id === gymId) ?? null;
  const token = gym ? buildGymToken(gym) : "";
  const memberUrl = gym
    ? `${window.location.origin}/checkin?gym=${gym.id}`
    : "";

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const svg = document.getElementById("gym-qr-svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gymco-checkin-${gym?.slug ?? "gym"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PartnerLayout title="Display gym QR">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <PartnerCard className="p-6 lg:col-span-1 print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Members scan this code
              </div>
              <div className="text-xs text-slate-500">
                Print and place at the front desk
              </div>
            </div>
          </div>

          <label className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-1.5 block">
            Choose gym
          </label>
          <select
            value={gymId}
            onChange={(e) => setGymId(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-white border border-orange-200 text-slate-900 text-sm focus:border-orange-500 focus:outline-none"
          >
            {loading && <option value="">Loading…</option>}
            {!loading && gyms.length === 0 && (
              <option value="">No gyms yet</option>
            )}
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.area}
              </option>
            ))}
          </select>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!gym}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
            >
              <Printer className="h-4 w-4" /> Print poster
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!gym}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-orange-200 hover:border-orange-500 text-orange-700 text-sm font-bold transition-colors"
            >
              <Download className="h-4 w-4" /> Download SVG
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-orange-100 hover:border-orange-300 text-slate-600 text-sm font-semibold transition-colors"
            >
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-100 text-xs text-slate-700 leading-relaxed">
            <div className="font-bold text-slate-900 mb-1">How it works</div>
            Members open the GYMCO app → tap{" "}
            <span className="font-bold">Check-in</span> → tap{" "}
            <span className="font-bold">Scan gym QR</span> → point camera at
            this poster. Their pass is verified automatically.
          </div>
        </PartnerCard>

        {/* Poster (printable) */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl bg-white border border-orange-100 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] overflow-hidden print:border-0 print:shadow-none">
            {!gym ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                Select a gym to generate its check-in QR.
              </div>
            ) : (
              <div className="p-8 md:p-12 print:p-12">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[11px] font-black tracking-[0.28em] uppercase shadow-lg">
                    GYMCO Check-in
                  </div>
                  <h2 className="mt-5 text-3xl md:text-5xl font-black tracking-[-0.02em] text-slate-900">
                    Welcome to {gym.name}
                  </h2>
                  <p className="mt-2 text-slate-500 text-sm md:text-base flex items-center justify-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {gym.area} · {gym.city}
                  </p>
                </div>

                {/* QR + framing */}
                <div className="mt-8 flex justify-center">
                  <div className="relative bg-white p-6 md:p-8 rounded-2xl border-2 border-orange-200">
                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-orange-500 rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-orange-500 rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-orange-500 rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-orange-500 rounded-br-xl" />
                    <QRCodeSVG
                      id="gym-qr-svg"
                      value={token}
                      size={300}
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                      level="H"
                      marginSize={2}
                    />
                  </div>
                </div>

                {/* Numbered steps */}
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
                      <div className="text-xs text-slate-500 mt-0.5">
                        {step.s}
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Fallback URL */}
                <div className="mt-8 text-center text-xs text-slate-500">
                  No app?{" "}
                  <span className="font-mono text-slate-700">{memberUrl}</span>
                </div>
                <div className="mt-2 text-center text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  GYMCO · Go to any gym
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          aside, header, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </PartnerLayout>
  );
}
