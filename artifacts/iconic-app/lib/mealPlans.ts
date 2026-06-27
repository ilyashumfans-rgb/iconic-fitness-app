import { Feather } from "@expo/vector-icons";

type FeatherName = keyof typeof Feather.glyphMap;

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type PlanMeal = {
  slot: MealSlot;
  name: string;
  items: string[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type MealPlan = {
  id: string;
  name: string;
  goal: string;
  tagline: string;
  icon: FeatherName;
  highlights: string[];
  meals: PlanMeal[];
};

export const MEAL_PLANS: MealPlan[] = [
  {
    id: "muscle-gain",
    name: "Muscle Gain",
    goal: "Build lean mass",
    tagline: "High-protein, calorie-surplus eating to fuel growth and recovery.",
    icon: "trending-up",
    highlights: ["~2,600 kcal", "190g protein", "5 meals"],
    meals: [
      {
        slot: "breakfast",
        name: "Power oats & eggs",
        items: ["Oats with banana & peanut butter", "3 whole eggs", "Glass of milk"],
        calories: 620,
        proteinG: 38,
        carbsG: 62,
        fatG: 24,
      },
      {
        slot: "snack",
        name: "Protein shake",
        items: ["Whey protein", "Greek yogurt", "Mixed berries"],
        calories: 320,
        proteinG: 40,
        carbsG: 24,
        fatG: 6,
      },
      {
        slot: "lunch",
        name: "Chicken rice bowl",
        items: ["Grilled chicken breast (200g)", "Brown rice", "Steamed broccoli"],
        calories: 700,
        proteinG: 55,
        carbsG: 70,
        fatG: 16,
      },
      {
        slot: "snack",
        name: "Pre-workout fuel",
        items: ["Whole-grain toast", "Almond butter", "Apple"],
        calories: 340,
        proteinG: 10,
        carbsG: 48,
        fatG: 13,
      },
      {
        slot: "dinner",
        name: "Salmon & quinoa",
        items: ["Baked salmon (180g)", "Quinoa", "Mixed greens"],
        calories: 620,
        proteinG: 47,
        carbsG: 44,
        fatG: 26,
      },
    ],
  },
  {
    id: "fat-loss",
    name: "Fat Loss",
    goal: "Lean down",
    tagline: "Calorie-controlled, high-protein meals that keep you full.",
    icon: "trending-down",
    highlights: ["~1,500 kcal", "140g protein", "4 meals"],
    meals: [
      {
        slot: "breakfast",
        name: "Egg white scramble",
        items: ["4 egg whites + 1 whole egg", "Spinach & tomato", "Black coffee"],
        calories: 240,
        proteinG: 26,
        carbsG: 8,
        fatG: 11,
      },
      {
        slot: "lunch",
        name: "Tuna salad",
        items: ["Tuna", "Mixed leaves", "Olive oil & lemon", "Chickpeas"],
        calories: 420,
        proteinG: 40,
        carbsG: 28,
        fatG: 16,
      },
      {
        slot: "snack",
        name: "Greek yogurt cup",
        items: ["Low-fat Greek yogurt", "Cucumber sticks"],
        calories: 180,
        proteinG: 22,
        carbsG: 12,
        fatG: 4,
      },
      {
        slot: "dinner",
        name: "Grilled chicken & veg",
        items: ["Grilled chicken (150g)", "Roasted vegetables", "Side salad"],
        calories: 460,
        proteinG: 48,
        carbsG: 26,
        fatG: 16,
      },
    ],
  },
  {
    id: "keto",
    name: "Keto",
    goal: "Low carb",
    tagline: "High-fat, very-low-carb meals to keep you in ketosis.",
    icon: "droplet",
    highlights: ["~1,800 kcal", "<30g carbs", "4 meals"],
    meals: [
      {
        slot: "breakfast",
        name: "Avocado & eggs",
        items: ["2 eggs fried in butter", "Half avocado", "Bacon"],
        calories: 520,
        proteinG: 24,
        carbsG: 6,
        fatG: 44,
      },
      {
        slot: "lunch",
        name: "Cheesy chicken salad",
        items: ["Chicken thigh", "Cheddar", "Leafy greens", "Olive oil"],
        calories: 560,
        proteinG: 42,
        carbsG: 7,
        fatG: 40,
      },
      {
        slot: "snack",
        name: "Nuts & cheese",
        items: ["Macadamia nuts", "Cheese cubes"],
        calories: 280,
        proteinG: 10,
        carbsG: 5,
        fatG: 26,
      },
      {
        slot: "dinner",
        name: "Steak & butter veg",
        items: ["Ribeye steak", "Asparagus in butter", "Side of greens"],
        calories: 640,
        proteinG: 46,
        carbsG: 8,
        fatG: 48,
      },
    ],
  },
  {
    id: "vegan",
    name: "Vegan",
    goal: "Plant-based",
    tagline: "Fully plant-based meals with complete protein sources.",
    icon: "feather",
    highlights: ["~2,000 kcal", "90g protein", "4 meals"],
    meals: [
      {
        slot: "breakfast",
        name: "Tofu scramble",
        items: ["Scrambled tofu with turmeric", "Whole-grain toast", "Avocado"],
        calories: 480,
        proteinG: 26,
        carbsG: 42,
        fatG: 22,
      },
      {
        slot: "lunch",
        name: "Buddha bowl",
        items: ["Chickpeas", "Quinoa", "Roasted veg", "Tahini dressing"],
        calories: 620,
        proteinG: 24,
        carbsG: 78,
        fatG: 22,
      },
      {
        slot: "snack",
        name: "Edamame & fruit",
        items: ["Steamed edamame", "Orange"],
        calories: 220,
        proteinG: 16,
        carbsG: 26,
        fatG: 7,
      },
      {
        slot: "dinner",
        name: "Lentil dal & rice",
        items: ["Spiced lentil dal", "Brown rice", "Sautéed spinach"],
        calories: 600,
        proteinG: 28,
        carbsG: 86,
        fatG: 14,
      },
    ],
  },
  {
    id: "vegetarian",
    name: "Vegetarian",
    goal: "Balanced veg",
    tagline: "Egg- and dairy-friendly vegetarian meals, balanced macros.",
    icon: "sun",
    highlights: ["~2,100 kcal", "110g protein", "4 meals"],
    meals: [
      {
        slot: "breakfast",
        name: "Paneer paratha",
        items: ["Paneer-stuffed paratha", "Curd", "Mint chutney"],
        calories: 520,
        proteinG: 26,
        carbsG: 54,
        fatG: 22,
      },
      {
        slot: "lunch",
        name: "Rajma chawal",
        items: ["Kidney bean curry", "Brown rice", "Cucumber salad"],
        calories: 640,
        proteinG: 26,
        carbsG: 92,
        fatG: 14,
      },
      {
        slot: "snack",
        name: "Sprout chaat",
        items: ["Mixed sprouts", "Onion, tomato & lemon"],
        calories: 220,
        proteinG: 14,
        carbsG: 30,
        fatG: 5,
      },
      {
        slot: "dinner",
        name: "Paneer & roti",
        items: ["Paneer tikka masala", "2 whole-wheat rotis", "Salad"],
        calories: 660,
        proteinG: 38,
        carbsG: 52,
        fatG: 32,
      },
    ],
  },
];

export type PlanTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function planTotals(plan: MealPlan): PlanTotals {
  return plan.meals.reduce<PlanTotals>(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function getMealPlan(id: string | undefined): MealPlan | undefined {
  if (!id) return undefined;
  return MEAL_PLANS.find((p) => p.id === id);
}
