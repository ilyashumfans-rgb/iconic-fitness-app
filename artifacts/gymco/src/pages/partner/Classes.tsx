import { useEffect, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerClass } from "@/lib/partnerApi";
import { Dumbbell, Clock, Users } from "lucide-react";

export default function PartnerClasses() {
  const [rows, setRows] = useState<PartnerClass[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    partnerApi.classes().then(setRows).catch((e) => setErr(String(e)));
  }, []);

  return (
    <PartnerLayout title="Classes">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}
      {rows.length === 0 ? (
        <PartnerCard className="p-10 text-center">
          <Dumbbell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400">
            No classes scheduled at your gyms yet.
          </div>
        </PartnerCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <PartnerCard key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-orange-600 font-semibold">
                    {c.category}
                  </div>
                  <h3 className="text-white font-semibold mt-1 truncate">
                    {c.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    {c.gymName}
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-md ${
                    c.intensity === "high"
                      ? "bg-red-500/15 text-red-300"
                      : c.intensity === "medium"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {c.intensity}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(c.startsAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {c.capacity} cap · {c.durationMin}m
                </div>
              </div>
              {c.trainerName && (
                <div className="mt-3 text-xs text-slate-500">
                  Trainer: <span className="text-slate-300">{c.trainerName}</span>
                </div>
              )}
            </PartnerCard>
          ))}
        </div>
      )}
    </PartnerLayout>
  );
}
