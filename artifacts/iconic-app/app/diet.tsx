import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetTrackingSummaryQueryKey,
  useAddMeal,
  useDeleteMeal,
  useGetMealDay,
  type MealInputMealType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
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

export default function DietScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const dayQuery = useGetMealDay({ date: istToday() });
  const addMeal = useAddMeal();
  const deleteMeal = useDeleteMeal();

  const [mealType, setMealType] = useState<MealInputMealType>("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [busy, setBusy] = useState(false);

  const day = dayQuery.data;

  const refresh = async () => {
    await dayQuery.refetch();
    await queryClient.invalidateQueries({
      queryKey: getGetTrackingSummaryQueryKey(),
    });
  };

  const onAdd = async () => {
    if (!name.trim() || !calories) {
      Alert.alert("Add details", "Enter at least a name and calories.");
      return;
    }
    setBusy(true);
    try {
      await addMeal.mutateAsync({
        data: {
          name: name.trim(),
          mealType,
          calories: Number(calories) || 0,
          proteinG: Number(protein) || 0,
          carbsG: Number(carbs) || 0,
          fatG: Number(fat) || 0,
        },
      });
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await deleteMeal.mutateAsync({ id });
    await refresh();
  };

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title="Diet" />

      {/* Meal plans entry */}
      <Pressable onPress={() => router.push("/meal-plans")}>
        <Card style={styles.planCta} tone="elevated">
          <View style={[styles.planIcon, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="book-open" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={15}>
              Meal plans
            </AppText>
            <AppText muted size={12}>
              Goal-based plans with macros done for you
            </AppText>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Card>
      </Pressable>

      {/* Macro summary */}
      <Card style={styles.summary}>
        <View style={styles.calRow}>
          <View>
            <AppText weight="700" size={30}>
              {day?.totalCalories ?? 0}
            </AppText>
            <AppText muted size={13}>
              of {day?.goalCalories ?? 0} kcal
            </AppText>
          </View>
          <View
            style={[styles.calIcon, { backgroundColor: colors.calorie + "22" }]}
          >
            <Feather name="zap" size={24} color={colors.calorie} />
          </View>
        </View>
        <View style={styles.macros}>
          <Macro label="Protein" value={`${day?.totalProteinG ?? 0}g`} color={colors.protein} />
          <Macro label="Carbs" value={`${day?.totalCarbsG ?? 0}g`} color={colors.water} />
          <Macro label="Fat" value={`${day?.totalFatG ?? 0}g`} color={colors.calorie} />
        </View>
      </Card>

      {/* Add form */}
      <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
        Log a meal
      </AppText>
      <Card style={{ gap: 14 }}>
        <ChipRow>
          {MEAL_TYPES.map((m) => (
            <Chip
              key={m}
              label={MEAL_LABEL[m]}
              active={m === mealType}
              onPress={() => setMealType(m)}
            />
          ))}
        </ChipRow>
        <Field label="Food name" value={name} onChangeText={setName} placeholder="e.g. Grilled chicken bowl" />
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
          </View>
          <View style={styles.half}>
            <Field label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" />
          </View>
          <View style={styles.half}>
            <Field label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="number-pad" />
          </View>
        </View>
        <Button label="Add meal" onPress={onAdd} loading={busy} icon="plus" />
      </Card>

      {/* Entries */}
      <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
        Today&apos;s meals
      </AppText>
      {(day?.entries ?? []).length === 0 ? (
        <EmptyState icon="coffee" title="No meals logged yet" />
      ) : (
        <View style={{ gap: 10 }}>
          {(day?.entries ?? []).map((e) => (
            <Card key={e.id} style={styles.entry}>
              <View style={[styles.entryIcon, { backgroundColor: colors.calorie + "22" }]}>
                <Feather name={MEAL_ICON[e.mealType] ?? "coffee"} size={16} color={colors.calorie} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="600" size={15}>
                  {e.name}
                </AppText>
                <AppText muted size={12}>
                  {MEAL_LABEL[e.mealType]} · {e.proteinG}P {e.carbsG}C {e.fatG}F
                </AppText>
              </View>
              <AppText weight="700" size={14}>
                {e.calories}
              </AppText>
              <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                <Feather name="trash-2" size={17} color={colors.mutedForeground} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
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
  planCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: { gap: 18 },
  calRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  macros: { flexDirection: "row", justifyContent: "space-between" },
  macro: { alignItems: "center", gap: 4, flex: 1 },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
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
