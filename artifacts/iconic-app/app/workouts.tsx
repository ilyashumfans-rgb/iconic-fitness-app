import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetTrackingSummaryQueryKey,
  useAddWorkout,
  useDeleteWorkout,
  useGetWorkoutDay,
  type WorkoutInputType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
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
import { istToday } from "@/lib/dates";
import { WORKOUT_LABEL, workoutIcon } from "@/lib/icons";

const WORKOUT_TYPES: WorkoutInputType[] = [
  "run",
  "walk",
  "strength",
  "cycling",
  "yoga",
  "hiit",
  "swim",
  "sports",
  "other",
];

export default function WorkoutsScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const dayQuery = useGetWorkoutDay({ date: istToday() });
  const addWorkout = useAddWorkout();
  const deleteWorkout = useDeleteWorkout();

  const [type, setType] = useState<WorkoutInputType>("run");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [steps, setSteps] = useState("");
  const [busy, setBusy] = useState(false);

  const day = dayQuery.data;

  const refresh = async () => {
    await dayQuery.refetch();
    await queryClient.invalidateQueries({
      queryKey: getGetTrackingSummaryQueryKey(),
    });
  };

  const onAdd = async () => {
    if (!duration) {
      Alert.alert("Add details", "Enter at least a duration.");
      return;
    }
    setBusy(true);
    try {
      await addWorkout.mutateAsync({
        data: {
          type,
          durationMin: Number(duration) || 0,
          calories: Number(calories) || 0,
          steps: Number(steps) || 0,
        },
      });
      setDuration("");
      setCalories("");
      setSteps("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await deleteWorkout.mutateAsync({ id });
    await refresh();
  };

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title="Workouts" />

      {/* Summary */}
      <View style={styles.statGrid}>
        <Stat icon="zap" tint={colors.primary} value={`${day?.totalCalories ?? 0}`} label="kcal burned" />
        <Stat icon="clock" tint={colors.water} value={`${day?.totalMinutes ?? 0}`} label="active min" />
        <Stat icon="navigation" tint={colors.calorie} value={`${day?.totalSteps ?? 0}`} label={`of ${day?.stepGoal ?? 0} steps`} />
        <Stat icon="repeat" tint={colors.protein} value={`${day?.count ?? 0}`} label="sessions" />
      </View>

      {/* Add form */}
      <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
        Log a workout
      </AppText>
      <Card style={{ gap: 14 }}>
        <ChipRow>
          {WORKOUT_TYPES.map((t) => (
            <Chip key={t} label={WORKOUT_LABEL[t]} active={t === type} onPress={() => setType(t)} />
          ))}
        </ChipRow>
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field label="Duration (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </View>
          <View style={styles.half}>
            <Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
          </View>
        </View>
        <Field label="Steps (optional)" value={steps} onChangeText={setSteps} keyboardType="number-pad" />
        <Button label="Add workout" onPress={onAdd} loading={busy} icon="plus" />
      </Card>

      {/* Entries */}
      <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
        Today&apos;s sessions
      </AppText>
      {(day?.entries ?? []).length === 0 ? (
        <EmptyState icon="activity" title="No workouts logged yet" />
      ) : (
        <View style={{ gap: 10 }}>
          {(day?.entries ?? []).map((e) => (
            <Card key={e.id} style={styles.entry}>
              <View style={[styles.entryIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name={workoutIcon(e.type)} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="600" size={15}>
                  {WORKOUT_LABEL[e.type] ?? e.type}
                </AppText>
                <AppText muted size={12}>
                  {e.durationMin} min{e.steps ? ` · ${e.steps} steps` : ""}
                </AppText>
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
    </Screen>
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
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47.5%", gap: 8 },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
