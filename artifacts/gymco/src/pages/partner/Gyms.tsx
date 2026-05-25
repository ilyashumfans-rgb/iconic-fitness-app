import { useEffect, useState } from "react";
import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi, type PartnerGym } from "@/lib/partnerApi";
import { Building2, MapPin, Star, Edit3, X, Save } from "lucide-react";

export default function PartnerGyms() {
  const [rows, setRows] = useState<PartnerGym[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PartnerGym | null>(null);

  const load = () => {
    setBusy(true);
    partnerApi.gyms
      .list()
      .then(setRows)
      .catch((e) => setErr(String(e)))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  return (
    <PartnerLayout title="My Gyms">
      {err && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {err}
        </div>
      )}
      {rows.length === 0 && !busy ? (
        <PartnerCard className="p-10 text-center">
          <Building2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <div className="text-white font-semibold">No gyms assigned yet</div>
          <div className="text-sm text-slate-500 mt-1">
            Once GYMCO admin assigns gyms to your account, you'll be able to
            manage them here.
          </div>
        </PartnerCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((g) => (
            <PartnerCard key={g.id} className="overflow-hidden flex flex-col">
              <div
                className="h-36 bg-slate-800 bg-cover bg-center"
                style={{ backgroundImage: `url(${g.heroImage})` }}
              />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-white font-semibold">{g.name}</h3>
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    {g.rating.toFixed(1)}
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {g.area}, {g.city}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.categories.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] uppercase tracking-wide text-slate-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      g.openNow ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {g.openNow ? "Open now" : "Closed"}
                  </span>
                  <button
                    onClick={() => setEditing(g)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                </div>
              </div>
            </PartnerCard>
          ))}
        </div>
      )}

      {editing && (
        <EditGymModal
          gym={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </PartnerLayout>
  );
}

function EditGymModal({
  gym,
  onClose,
  onSaved,
}: {
  gym: PartnerGym;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(gym.name);
  const [address, setAddress] = useState(gym.address);
  const [area, setArea] = useState(gym.area);
  const [city, setCity] = useState(gym.city);
  const [about, setAbout] = useState(gym.about);
  const [hours, setHours] = useState(gym.hours);
  const [heroImage, setHeroImage] = useState(gym.heroImage);
  const [priceFrom, setPriceFrom] = useState(String(gym.priceFrom));
  const [openNow, setOpenNow] = useState(gym.openNow);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await partnerApi.gyms.update(gym.id, {
        name,
        address,
        area,
        city,
        about,
        hours,
        heroImage,
        priceFrom: Number(priceFrom) || 0,
        openNow,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900">
          <h3 className="text-lg font-semibold text-white">Edit {gym.name}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" value={name} onChange={setName} className="sm:col-span-2" />
          <Field label="Hero image URL" value={heroImage} onChange={setHeroImage} className="sm:col-span-2" />
          <Field label="Area" value={area} onChange={setArea} />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="Address" value={address} onChange={setAddress} className="sm:col-span-2" />
          <Field label="Hours" value={hours} onChange={setHours} />
          <Field label="Starting price (₹)" value={priceFrom} onChange={setPriceFrom} type="number" />
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
              About
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={openNow}
              onChange={(e) => setOpenNow(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800"
            />
            Currently open
          </label>
          {err && (
            <div className="sm:col-span-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {err}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60"
      />
    </div>
  );
}
