import { useCallback, useEffect, useState } from "react";

import {
  loadBodyData,
  removeWeight as removeWeightFn,
  saveMeasurements as saveMeasurementsFn,
  saveProfile as saveProfileFn,
  upsertWeight,
  type BodyData,
  type BodyProfile,
  type Measurements,
} from "@/lib/bodyStats";

const EMPTY: BodyData = { profile: {}, weightLog: [], measurements: {} };

export function useBodyStats() {
  const [data, setData] = useState<BodyData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadBodyData()
      .then((loaded) => {
        if (active) setData(loaded);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addWeight = useCallback((kg: number) => {
    setData((prev) => upsertWeight(prev, kg));
  }, []);

  const deleteWeight = useCallback((date: string) => {
    setData((prev) => removeWeightFn(prev, date));
  }, []);

  const updateProfile = useCallback((profile: BodyProfile) => {
    setData((prev) => saveProfileFn(prev, profile));
  }, []);

  const updateMeasurements = useCallback((m: Measurements) => {
    setData((prev) => saveMeasurementsFn(prev, m));
  }, []);

  return {
    data,
    loading,
    addWeight,
    deleteWeight,
    updateProfile,
    updateMeasurements,
  };
}
