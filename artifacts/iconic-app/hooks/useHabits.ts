import { useCallback, useEffect, useState } from "react";

import {
  loadHabitData,
  toggleHabit as toggleHabitFn,
  type HabitData,
  type HabitKey,
} from "@/lib/habits";

const EMPTY: HabitData = { completions: {} };

export function useHabits() {
  const [data, setData] = useState<HabitData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadHabitData()
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

  const toggle = useCallback((key: HabitKey) => {
    setData((prev) => toggleHabitFn(prev, key));
  }, []);

  return { data, loading, toggle };
}
