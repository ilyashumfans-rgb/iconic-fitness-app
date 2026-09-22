import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getGetTrackingSummaryQueryKey,
  getGetWorkoutDayQueryKey,
  getGetProgressQueryKey,
  useAddWorkout,
  useUpdateWorkout,
  useDeleteWorkout,
  useGetWorkoutDay,
  type WorkoutEntry,
  type WorkoutInputType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
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

export function WorkoutsTab({ onEdit }: { onEdit?: () => void }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded || !isSignedIn || !userId) {
    return <AppText muted>{isLoaded ? "Sign in to log and view workouts." : "Loading workouts…"}</AppText>;
  }
  return <WorkoutRecords key={userId} userId={userId} onEdit={onEdit} />;
}

function WorkoutRecords({ userId, onEdit }: { userId: string; onEdit?: () => void }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const date = istToday();
  const dayQuery = useGetWorkoutDay({ date }, {
    query: { queryKey: [...getGetWorkoutDayQueryKey({ date }), userId] },
  });
  const addWorkout = useAddWorkout();
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();

  const [type, setType] = useState<WorkoutInputType>("run");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [steps, setSteps] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const day = dayQuery.data;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetWorkoutDayQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTrackingSummaryQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() }),
    ]);
  };

  const reset = () => {
    setEditingId(null);
    setDuration("");
    setCalories("");
    setSteps("");
    setExerciseName("");
    setSets("");
    setReps("");
    setError("");
  };

  const edit = (entry: WorkoutEntry) => {
    setEditingId(entry.id);
    setType(entry.type);
    setDuration(String(entry.durationMin));
    setCalories(String(entry.calories));
    setSteps(String(entry.steps ?? 0));
    setExerciseName(entry.exerciseName ?? "");
    setSets(entry.sets == null ? "" : String(entry.sets));
    setReps(entry.reps == null ? "" : String(entry.reps));
    setError("");
    setConfirmDelete(null);
    onEdit?.();
  };

  const onAdd = async () => {
    if (busy) return;
    setError("");
    const whole = (value: string, min: number, max: number) =>
      /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value)) &&
      Number(value) >= min && Number(value) <= max;
    const hasDetails = type === "strength" || !!(exerciseName.trim() || sets.trim() || reps.trim());
    if (hasDetails && (!exerciseName.trim() || !whole(sets, 1, 100) || !whole(reps, 1, 1000))) {
      setError("Enter an exercise name, whole-number sets (1–100) and reps per set (1–1000).");
      return;
    }
    if (exerciseName.trim().length > 200) {
      setError("Exercise name must be 200 characters or fewer.");
      return;
    }
    if ([duration, calories, steps].some((value) => value.trim() && !whole(value, 0, 2147483647))) {
      setError("Duration, calories and steps must be non-negative whole numbers.");
      return;
    }
    if (!hasDetails && Number(duration) <= 0) {
      setError("Enter a positive duration, or an exercise with sets and reps.");
      return;
    }
    setBusy(true);
    try {
      const data = {
          type,
          durationMin: Number(duration),
          calories: Number(calories),
          steps: Number(steps),
          exerciseName: hasDetails ? exerciseName.trim() : null,
          sets: hasDetails ? Number(sets) : null,
          reps: hasDetails ? Number(reps) : null,
      };
      if (editingId !== null) {
        await updateWorkout.mutateAsync({ id: editingId, data });
      } else {
        await addWorkout.mutateAsync({ data });
      }
      reset();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save workout. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteWorkout.mutateAsync({ id });
      if (editingId === id) reset();
      setConfirmDelete(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete workout. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 16, paddingBottom: 24 }}>
      {dayQuery.isLoading ? <AppText muted>Loading workouts…</AppText> : null}
      {dayQuery.isError ? (
        <Card style={{ gap: 10 }}>
          <AppText>Unable to load workouts. {dayQuery.error instanceof Error ? dayQuery.error.message : "Please try again."}</AppText>
          <Button label="Retry" onPress={() => { void dayQuery.refetch(); }} />
        </Card>
      ) : null}
      {/* Summary */}
      <View style={styles.statGrid}>
        <Stat icon="zap" tint={colors.primary} value={`${day?.totalCalories ?? 0}`} label="kcal burned" />
        <Stat icon="clock" tint={colors.water} value={`${day?.totalMinutes ?? 0}`} label="active min" />
        <Stat icon="navigation" tint={colors.calorie} value={`${day?.totalSteps ?? 0}`} label={`of ${day?.stepGoal ?? 0} steps`} />
        <Stat icon="repeat" tint={colors.protein} value={`${day?.count ?? 0}`} label="sessions" />
      </View>

      {/* Add form */}
      <AppText weight="700" size={18} style={{ marginTop: 8, marginBottom: 0 }}>
        {editingId !== null ? "Edit workout" : "Log a workout"}
      </AppText>
      <Card style={{ gap: 14 }}>
        <ChipRow>
          {WORKOUT_TYPES.map((t) => (
            <Chip key={t} label={WORKOUT_LABEL[t]} active={t === type} onPress={() => { if (!busy) setType(t); }} />
          ))}
        </ChipRow>
        <Field label={`Exercise name${type === "strength" ? " (required)" : " (optional)"}`} value={exerciseName} onChangeText={setExerciseName} editable={!busy} maxLength={200} placeholder="e.g. Bench press" />
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field label="Sets (count)" value={sets} onChangeText={setSets} editable={!busy} keyboardType="number-pad" hint="1–100" />
          </View>
          <View style={styles.half}>
            <Field label="Reps per set" value={reps} onChangeText={setReps} editable={!busy} keyboardType="number-pad" hint="1–1000" />
          </View>
        </View>
        <AppText muted size={12}>Strength requires an exercise, sets and reps. Duration and calories may be 0.</AppText>
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field label="Duration (min)" value={duration} onChangeText={setDuration} editable={!busy} keyboardType="number-pad" />
          </View>
          <View style={styles.half}>
            <Field label="Calories" value={calories} onChangeText={setCalories} editable={!busy} keyboardType="number-pad" />
          </View>
        </View>
        <Field label="Steps (optional)" value={steps} onChangeText={setSteps} editable={!busy} keyboardType="number-pad" />
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        <Button label={editingId !== null ? "Save changes" : "Add workout"} onPress={onAdd} loading={busy} icon={editingId !== null ? "check" : "plus"} />
        {editingId !== null ? <Button label="Cancel edit" onPress={reset} disabled={busy} variant="secondary" /> : null}
      </Card>
      <Modal visible={confirmDelete !== null} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmDelete(null); }}>
        <View accessibilityViewIsModal style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
        <Card style={{ gap: 12 }}>
          <AppText weight="600">Delete this workout? This cannot be undone.</AppText>
          {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
          <Button label="Delete workout" onPress={() => { if (confirmDelete !== null) void remove(confirmDelete); }} loading={busy} icon="trash-2" variant="danger" />
          <Button label="Keep workout" onPress={() => setConfirmDelete(null)} disabled={busy} variant="secondary" />
        </Card>
        </View>
      </Modal>

      {/* Entries */}
      <AppText weight="700" size={18} style={{ marginTop: 8, marginBottom: 0 }}>
        Today&apos;s sessions
      </AppText>
      {dayQuery.isLoading || dayQuery.isError ? null : (day?.entries ?? []).length === 0 ? (
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
                  {e.exerciseName || WORKOUT_LABEL[e.type] || e.type}
                </AppText>
                {e.sets != null && e.reps != null ? <AppText weight="600" size={13}>{e.sets} × {e.reps} reps</AppText> : null}
                <AppText muted size={12}>
                  {e.durationMin} min{e.steps ? ` · ${e.steps} steps` : ""}
                </AppText>
              </View>
              <AppText weight="700" size={14}>
                {e.calories} kcal
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${e.exerciseName || WORKOUT_LABEL[e.type]}`} disabled={busy} onPress={() => edit(e)} hitSlop={8}>
                <Feather name="edit-2" size={17} color={colors.primary} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${e.exerciseName || WORKOUT_LABEL[e.type]}`} disabled={busy} onPress={() => { setError(""); setConfirmDelete(e.id); }} hitSlop={8}>
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
