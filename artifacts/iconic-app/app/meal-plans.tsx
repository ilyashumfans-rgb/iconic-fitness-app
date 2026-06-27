import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";
import { MEAL_PLANS, planTotals } from "@/lib/mealPlans";

export default function MealPlansScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title="Meal Plans" />
      <AppText muted size={14} style={{ marginBottom: 18 }}>
        Pick a plan that matches your goal. Each one is a full day of meals with
        macros worked out for you.
      </AppText>

      <View style={{ gap: 14 }}>
        {MEAL_PLANS.map((plan) => {
          const totals = planTotals(plan);
          return (
            <Pressable
              key={plan.id}
              onPress={() => router.push(`/meal-plan/${plan.id}`)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.icon,
                      { backgroundColor: colors.primary + "22" },
                    ]}
                  >
                    <Feather name={plan.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="700" size={17}>
                      {plan.name}
                    </AppText>
                    <AppText muted size={12}>
                      {plan.goal}
                    </AppText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={colors.mutedForeground}
                  />
                </View>

                <AppText muted size={13} style={{ marginTop: 12 }}>
                  {plan.tagline}
                </AppText>

                <View style={styles.statRow}>
                  <Stat label="kcal" value={`${totals.calories}`} />
                  <Dot />
                  <Stat label="protein" value={`${totals.proteinG}g`} />
                  <Dot />
                  <Stat label="carbs" value={`${totals.carbsG}g`} />
                  <Dot />
                  <Stat label="fat" value={`${totals.fatG}g`} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <AppText weight="700" size={15}>
        {value}
      </AppText>
      <AppText muted size={11} color={colors.mutedForeground}>
        {label}
      </AppText>
    </View>
  );
}

function Dot() {
  const colors = useColors();
  return <View style={[styles.vline, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  card: { gap: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  vline: { width: StyleSheet.hairlineWidth, height: 28 },
});
