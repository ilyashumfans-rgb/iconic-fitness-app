import { useEffect, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerGym } from "@/lib/partnerApi";
import { Smartphone, Printer, Download, RefreshCcw } from "lucide-react";
import { GymQrPoster, downloadGymQrSvg } from "@/components/GymQrPoster";

export default function PartnerDisplayQr() {
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [gymId, setGymId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnerApi.gyms
      .list()
      .then((g) => {
        setGyms(g);
        if (g.length > 0) setGymId(g[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const gym = gyms.find((g) => g.id === gymId) ?? null;

  return (
    <PartnerLayout title="Display gym QR">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              onClick={() => window.print()}
              disabled={!gym}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
            >
              <Printer className="h-4 w-4" /> Print poster
            </button>
            <button
              type="button"
              onClick={() => gym && downloadGymQrSvg(gym)}
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

        <div className="lg:col-span-2">
          <div className="gym-qr-print-sheet rounded-3xl bg-white border border-orange-100 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] overflow-hidden print:border-0 print:shadow-none">
            {!gym ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                Select a gym to generate its check-in QR.
              </div>
            ) : (
              <GymQrPoster gym={gym} />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: 1754px 2480px; margin: 0; }
          html, body { background: white !important; width: 1754px; }
          aside, header, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .gym-qr-print-sheet {
            width: 1754px !important;
            max-width: 1754px !important;
            min-height: 2480px !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </PartnerLayout>
  );
}
