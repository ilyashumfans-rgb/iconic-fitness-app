import { Feather } from "@expo/vector-icons";
import {
  getGetTrackingSummaryQueryKey,
  useAddMeal,
  useDeleteMeal,
  useGetMealDay,
  type MealInputMealType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Chip, ChipRow, EmptyState } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { MEAL_ICON, MEAL_LABEL } from "@/lib/icons";
import { istToday } from "@/lib/dates";

const MEAL_TYPES: MealInputMealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export function NutritionTab() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dayQuery = useGetMealDay({ date: istToday() });
  const addMeal = useAddMeal();
  const deleteMeal = useDeleteMeal();

  const [type, setType] = useState<MealInputMealType>("breakfast");
  const [desc, setDesc] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [busy, setBusy] = useState(false);

  const day = dayQuery.data;

  const refresh = async () => {
    await dayQuery.refetch();
    await queryClient.invalidateQueries({
      queryKey: getGetTrackingSummaryQueryKey(),
    });
  };

  const onAdd = async () => {
    if (!calories) {
      Alert.alert("Required", "Please enter calories.");
      return;
    }
    setBusy(true);
    try {
      await addMeal.mutateAsync({
        data: {
          mealType: type,
          name: desc || MEAL_LABEL[type],
          calories: Number(calories) || 0,
          proteinG: Number(protein) || 0,
        },
      });
      setDesc("");
      setCalories("");
      setProtein("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await deleteMeal.mutateAsync({ id });
    await refresh();
  };

  return (
    <View style={{ gap: 16, paddingBottom: 24 }}>
      {/* Summary */}
      <View style={styles.statGrid}>
        <Stat icon="pie-chart" tint={colors.protein} value={`${day?.totalCalories ?? 0}`} label={`of ${day?.goalCalories ?? 0} kcal`} />
        <Stat icon="droplet" tint={colors.primary} value={`${day?.totalProteinG ?? 0}g`} label={`of ${day?.goalProteinG ?? 0}g protein`} />
      </View>

      {/* Meal Plans Link */}
      <Pressable
        onPress={() => router.push("/meal-plans")}
        style={({ pressed }) => [
          styles.bodyLink,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.bodyLinkIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="book-open" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={15}>
            Meal Plans
          </AppText>
          <AppText muted size={12}>
            Goal-based plans with macros done for you
          </AppText>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Pressable>

      {/* Add form */}
      <AppText weight="700" size={18} style={{ marginTop: 8, marginBottom: 0 }}>
        Log a meal
      </AppText>
      <Card style={{ gap: 14 }}>
        <ChipRow>
          {MEAL_TYPES.map((t) => (
            <Chip key={t} label={MEAL_LABEL[t]} active={t === type} onPress={() => setType(t)} />
          ))}
        </ChipRow>
        <Field label="Description (optional)" value={desc} onChangeText={setDesc} placeholder="e.g. Chicken salad" />
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
          </View>
          <View style={styles.half}>
            <Field label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" />
          </View>
        </View>
        <Button label="Add meal" onPress={onAdd} loading={busy} icon="plus" />
      </Card>

      {/* Entries */}
      <AppText weight="700" size={18} style={{ marginTop: 8, marginBottom: 0 }}>
        Today&apos;s meals
      </AppText>
      {(day?.entries ?? []).length === 0 ? (
        <EmptyState icon="coffee" title="No meals logged yet" />
      ) : (
        <View style={{ gap: 10 }}>
          {(day?.entries ?? []).map((e) => (
            <Card key={e.id} style={styles.entry}>
              <View style={[styles.entryIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name={MEAL_ICON[e.mealType] as any} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="600" size={15}>
                  {e.name || MEAL_LABEL[e.mealType] || e.mealType}
                </AppText>
                {e.proteinG != null && e.proteinG > 0 && (
                  <AppText muted size={12}>
                    {e.proteinG}g protein
                  </AppText>
                )}
              </View>
              <AppText weight="700" size={14}>
                {e.calories} kcal
              </AppText>
              <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                <Feather name="trash-2" size={17} color={colors.mutedForeground} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({
  icon,
  tint,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  value: string;
  label: string;
}) {
  const colors = useColors();
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint + "22" }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <AppText weight="700" size={22}>
        {value}
      </AppText>
      <AppText muted size={12}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, gap: 8 },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bodyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bodyLinkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  row2: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  entry: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  entryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
