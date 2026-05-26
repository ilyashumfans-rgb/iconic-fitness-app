import { useEffect, useMemo, useState } from "react";
import { locationsApi, type City, type Area } from "@/lib/locationsApi";
import { MapPin, Plus, Trash2, Check, X, Pencil, Star } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

const btnPrimary =
  "px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold disabled:opacity-60 inline-flex items-center gap-2";

const btnGhost =
  "px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 inline-flex items-center gap-2";

export default function CityAreaManagement() {
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<number | null>(null);

  const [newCity, setNewCity] = useState("");
  const [newArea, setNewArea] = useState("");
  const [editingCity, setEditingCity] = useState<{ id: number; name: string } | null>(null);
  const [editingArea, setEditingArea] = useState<{ id: number; name: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [c, a] = await Promise.all([
        locationsApi.listCities(),
        locationsApi.listAreas(),
      ]);
      setCities(c);
      setAreas(a);
      if (!selectedCity && c.length) setSelectedCity(c[0].id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cityAreas = useMemo(
    () => areas.filter((a) => a.cityId === selectedCity),
    [areas, selectedCity],
  );
  const currentCity = useMemo(
    () => cities.find((c) => c.id === selectedCity) ?? null,
    [cities, selectedCity],
  );

  const onAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCity.trim();
    if (!name) return;
    try {
      const created = await locationsApi.createCity(name);
      setCities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCity("");
      setSelectedCity(created.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  const onSaveCity = async (id: number, name: string, isActive?: boolean) => {
    const body: Record<string, unknown> = {};
    if (name !== undefined) body.name = name;
    if (isActive !== undefined) body.isActive = isActive;
    const updated = await locationsApi.updateCity(id, body);
    setCities((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingCity(null);
  };

  const onDeleteCity = async (id: number) => {
    if (!confirm("Delete this city and all its areas?")) return;
    await locationsApi.removeCity(id);
    setCities((prev) => prev.filter((c) => c.id !== id));
    setAreas((prev) => prev.filter((a) => a.cityId !== id));
    if (selectedCity === id) setSelectedCity(null);
  };

  const onAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newArea.trim();
    if (!name || !selectedCity) return;
    try {
      const created = await locationsApi.createArea(selectedCity, name);
      setAreas((prev) => [...prev, created]);
      setNewArea("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  const onSaveArea = async (id: number, name?: string, isActive?: boolean) => {
    const body: Record<string, unknown> = {};
    if (name !== undefined) body.name = name;
    if (isActive !== undefined) body.isActive = isActive;
    const updated = await locationsApi.updateArea(id, body);
    setAreas((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setEditingArea(null);
  };

  const onDeleteArea = async (id: number) => {
    if (!confirm("Delete this area?")) return;
    await locationsApi.removeArea(id);
    setAreas((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-orange-400" />
            Cities & Areas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage the location catalog used across gyms, partners, and member search.
          </p>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cities */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Cities</h2>
            <span className="text-xs text-slate-400">{cities.length} total</span>
          </div>

          <form onSubmit={onAddCity} className="flex gap-2">
            <input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="New city name (e.g. Bengaluru)"
              className={inputCls}
            />
            <button className={btnPrimary}>
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>

          <div className="divide-y divide-slate-800 -mx-5">
            {loading ? (
              <div className="px-5 py-6 text-sm text-slate-400">Loading…</div>
            ) : cities.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-400">No cities yet.</div>
            ) : (
              cities.map((c) => {
                const isSelected = c.id === selectedCity;
                const isEditing = editingCity?.id === c.id;
                const areaCount = areas.filter((a) => a.cityId === c.id).length;
                return (
                  <div
                    key={c.id}
                    className={`px-5 py-3 flex items-center gap-3 ${isSelected ? "bg-slate-800/50" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCity(c.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingCity!.name}
                          onChange={(e) => setEditingCity({ id: c.id, name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className={inputCls}
                        />
                      ) : (
                        <div>
                          <div className="text-white font-medium truncate">{c.name}</div>
                          <div className="text-xs text-slate-500">{areaCount} area{areaCount === 1 ? "" : "s"}</div>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await locationsApi.updateCity(c.id, {
                          isDefault: !c.isDefault,
                        });
                        setCities((prev) =>
                          prev.map((row) =>
                            row.id === updated.id
                              ? updated
                              : updated.isDefault
                                ? { ...row, isDefault: false }
                                : row,
                          ),
                        );
                      }}
                      title={
                        c.isDefault
                          ? "Default city for member search"
                          : "Make this the default city"
                      }
                      className={`p-2 rounded-lg border transition ${
                        c.isDefault
                          ? "bg-amber-500/15 border-amber-400 text-amber-500"
                          : "bg-slate-800 border-slate-700 text-slate-500 hover:text-amber-400"
                      }`}
                    >
                      <Star
                        className={`h-4 w-4 ${c.isDefault ? "fill-amber-400" : ""}`}
                      />
                    </button>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={c.isActive}
                        onChange={(e) => onSaveCity(c.id, c.name, e.target.checked)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      Active
                    </label>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSaveCity(c.id, editingCity!.name.trim() || c.name)}
                          className="p-2 rounded-lg bg-emerald-600/20 text-emerald-300"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCity(null)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-300"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingCity({ id: c.id, name: c.name })}
                          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-orange-300"
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCity(c.id)}
                          className="p-2 rounded-lg bg-rose-600/20 text-rose-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Areas */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Areas {currentCity ? <span className="text-slate-400 font-normal">in {currentCity.name}</span> : null}
            </h2>
            <span className="text-xs text-slate-400">{cityAreas.length} total</span>
          </div>

          {currentCity ? (
            <>
              <form onSubmit={onAddArea} className="flex gap-2">
                <input
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="New area name (e.g. Koramangala)"
                  className={inputCls}
                />
                <button className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Add
                </button>
              </form>

              <div className="divide-y divide-slate-800 -mx-5">
                {cityAreas.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-400">No areas in this city yet.</div>
                ) : (
                  cityAreas.map((a) => {
                    const isEditing = editingArea?.id === a.id;
                    return (
                      <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingArea!.name}
                              onChange={(e) => setEditingArea({ id: a.id, name: e.target.value })}
                              className={inputCls}
                            />
                          ) : (
                            <div className="text-white font-medium truncate">{a.name}</div>
                          )}
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={a.isActive}
                            onChange={(e) => onSaveArea(a.id, undefined, e.target.checked)}
                            className="h-4 w-4 accent-orange-500"
                          />
                          Active
                        </label>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onSaveArea(a.id, editingArea!.name.trim() || a.name)}
                              className="p-2 rounded-lg bg-emerald-600/20 text-emerald-300"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingArea(null)}
                              className="p-2 rounded-lg bg-slate-800 text-slate-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingArea({ id: a.id, name: a.name })}
                              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-orange-300"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteArea(a.id)}
                              className="p-2 rounded-lg bg-rose-600/20 text-rose-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 py-6">
              Select a city on the left to manage its areas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
