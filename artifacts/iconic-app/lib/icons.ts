import { Feather } from "@expo/vector-icons";

type FeatherName = keyof typeof Feather.glyphMap;

export const WORKOUT_ICON: Record<string, FeatherName> = {
  run: "zap",
  walk: "navigation",
  strength: "activity",
  cycling: "disc",
  yoga: "wind",
  hiit: "target",
  swim: "droplet",
  sports: "award",
  other: "more-horizontal",
};

export const WORKOUT_LABEL: Record<string, string> = {
  run: "Run",
  walk: "Walk",
  strength: "Strength",
  cycling: "Cycling",
  yoga: "Yoga",
  hiit: "HIIT",
  swim: "Swim",
  sports: "Sports",
  other: "Other",
};

export const MEAL_ICON: Record<string, FeatherName> = {
  breakfast: "coffee",
  lunch: "sun",
  dinner: "moon",
  snack: "gift",
};

export const MEAL_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function workoutIcon(type: string): FeatherName {
  return WORKOUT_ICON[type] ?? "activity";
}
