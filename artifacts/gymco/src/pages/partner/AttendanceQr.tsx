import { useEffect, useState } from "react";
import { Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PartnerCard, PartnerLayout } from "@/components/partner/PartnerLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminApi, request } from "@/lib/adminApi";
import { Link } from "wouter";
import {
  partnerApi,
  type PartnerGym,
} from "@/lib/partnerApi";

type AttendanceQrData = {
  gymId: number;
  gymName: string;
  address: string;
  code: string;
};

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load attendance QR code.";
}

export default function PartnerAttendanceQr({ adminPartnerId }: { adminPartnerId?: number } = {}) {
  const Layout = adminPartnerId !== undefined ? AdminLayout : PartnerLayout;
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<number | null>(null);
  const [qr, setQr] = useState<AttendanceQrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
        if (adminPartnerId !== undefined) {
          const ownGyms = (await adminApi.gyms.list()).filter((gym: PartnerGym) => gym.ownerPartnerId === adminPartnerId);
          if (cancelled) return;
          setGyms(ownGyms);
          setSelectedGymId(ownGyms[0]?.id ?? null);
          return;
        }
        const partner = await partnerApi.me();
        if (partner.isStaff && !(partner.permissions ?? []).includes("checkins")) {
          if (!cancelled) setNotAuthorized(true);
          return;
        }

        const ownGyms = await partnerApi.gyms.list();
        if (cancelled) return;
        setGyms(ownGyms);
        setSelectedGymId(ownGyms[0]?.id ?? null);
    };
    load()
      .catch((err) => {
        if (!cancelled) setError(messageFrom(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adminPartnerId]);

  useEffect(() => {
    if (selectedGymId === null || notAuthorized) {
      setQr(null);
      return;
    }

    let cancelled = false;
    setQr(null);
    setError(null);
    setQrLoading(true);
    const fetchQr = adminPartnerId !== undefined
      ? request<AttendanceQrData>(`/admin/partners/${adminPartnerId}/gyms/${selectedGymId}/attendance-qr`)
      : partnerApi.gyms.attendanceQr(selectedGymId);
    fetchQr
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch((err) => {
        if (!cancelled) setError(messageFrom(err));
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGymId, notAuthorized, adminPartnerId]);

  const qrValue = qr
    ? `iconic-app://check-in?code=${encodeURIComponent(qr.code)}`
    : "";

  return (
    <Layout title="Attendance QR">
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #attendance-print-poster,
          #attendance-print-poster * { visibility: visible !important; }
          #attendance-print-poster {
            position: fixed !important;
            inset: 0 !important;
            width: auto !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>

      {adminPartnerId !== undefined && (
        <Link href="/admin/partners" className="attendance-controls mb-4 inline-block text-sm font-medium text-lime-700 hover:underline">
          ← Back to partners
        </Link>
      )}
      {loading ? (
        <PartnerCard className="p-8 text-center text-slate-600">
          Loading your branches...
        </PartnerCard>
      ) : notAuthorized ? (
        <PartnerCard className="p-8 text-center">
          <QrCode className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Not authorized</h2>
          <p className="mt-2 text-sm text-slate-600">
            Ask the partner account owner to grant you the Check-ins permission.
          </p>
        </PartnerCard>
      ) : (
        <div className="mx-auto max-w-3xl">
          <div className="attendance-controls mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="block flex-1">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Branch
              </span>
              <select
                value={selectedGymId ?? ""}
                onChange={(event) => setSelectedGymId(Number(event.target.value))}
                disabled={gyms.length === 0}
                className="h-10 w-full rounded-lg border border-lime-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20"
              >
                {gyms.length === 0 ? (
                  <option value="">No branches assigned</option>
                ) : (
                  gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!qr}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-lime-600 px-5 text-sm font-semibold text-white hover:bg-lime-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print poster
            </button>
          </div>

          {error && (
            <div className="attendance-controls mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {gyms.length === 0 ? (
            <PartnerCard className="p-8 text-center text-slate-600">
              No branches are assigned to this partner account.
            </PartnerCard>
          ) : qrLoading ? (
            <PartnerCard className="p-8 text-center text-slate-600">
              Generating attendance QR code...
            </PartnerCard>
          ) : qr ? (
            <section
              id="attendance-print-poster"
              className="mx-auto flex min-h-[720px] max-w-[640px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm"
            >
              <div className="text-sm font-bold uppercase tracking-[0.22em] text-lime-700">
                Iconic Fitness
              </div>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-950">
                {qr.gymName}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                {qr.address}
              </p>

              <div className="mt-8 bg-white">
                <QRCodeSVG
                  value={qrValue}
                  size={280}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  marginSize={4}
                  title={`Attendance check-in for ${qr.gymName}`}
                />
              </div>

              <h3 className="mt-8 text-2xl font-bold text-slate-950">
                Scan to check in or out
              </h3>
              <div className="mt-4 max-w-md space-y-2 text-base leading-7 text-slate-700">
                <p>1. Open the Iconic Fitness app on your phone.</p>
                <p>2. Scan this QR code with your camera.</p>
                <p>3. Follow the prompt to check in or check out.</p>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </Layout>
  );
}