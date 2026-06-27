import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { MEAL_ICON, MEAL_LABEL } from "@/lib/icons";
import { getMealPlan, planTotals } from "@/lib/mealPlans";

export default function MealPlanDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = getMealPlan(id);

  if (!plan) {
    return (
      <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
        <ModalHeader title="Meal Plan" />
        <EmptyState icon="coffee" title="Plan not found" />
      </Screen>
    );
  }

  const totals = planTotals(plan);

  return (
    <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title={plan.name} />

      <Card style={styles.summary} tone="elevated">
        <View style={styles.headRow}>
          <View style={[styles.icon, { backgroundColor: colors.primary + "22" }]}>
            <Feather name={plan.icon} size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={18}>
              {plan.goal}
            </AppText>
            <AppText muted size={13}>
              {plan.meals.length} meals · full day
            </AppText>
          </View>
        </View>
        <AppText muted size={14}>
          {plan.tagline}
        </AppText>
        <View style={styles.macroRow}>
          <Macro label="Calories" value={`${totals.calories}`} color={colors.calorie} />
          <Macro label="Protein" value={`${totals.proteinG}g`} color={colors.protein} />
          <Macro label="Carbs" value={`${totals.carbsG}g`} color={colors.water} />
          <Macro label="Fat" value={`${totals.fatG}g`} color={colors.calorie} />
        </View>
      </Card>

      <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
        The day&apos;s meals
      </AppText>

      <View style={{ gap: 12 }}>
        {plan.meals.map((meal, i) => (
          <Card key={`${meal.slot}-${i}`} style={styles.meal}>
            <View style={styles.mealHead}>
              <View
                style={[styles.mealIcon, { backgroundColor: colors.calorie + "22" }]}
              >
                <Feather
                  name={MEAL_ICON[meal.slot] ?? "coffee"}
                  size={16}
                  color={colors.calorie}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={15}>
                  {meal.name}
                </AppText>
                <AppText muted size={12}>
                  {MEAL_LABEL[meal.slot]}
                </AppText>
              </View>
              <AppText weight="700" size={15}>
                {meal.calories}
                <AppText muted size={12}>
                  {" kcal"}
                </AppText>
              </AppText>
            </View>

            <View style={styles.items}>
              {meal.items.map((it, j) => (
                <View key={j} style={styles.itemRow}>
                  <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                  <AppText size={14} style={{ flex: 1 }}>
                    {it}
                  </AppText>
                </View>
              ))}
            </View>

            <View style={[styles.mealMacros, { borderTopColor: colors.border }]}>
              <AppText muted size={12}>
                {meal.proteinG}P · {meal.carbsG}C · {meal.fatG}F
              </AppText>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function Macro({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.macro}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <AppText weight="700" size={15}>
        {value}
      </AppText>
      <AppText muted size={11}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 16 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
  macro: { alignItems: "center", gap: 4, flex: 1 },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  meal: { gap: 12 },
  mealHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  items: { gap: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  mealMacros: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
