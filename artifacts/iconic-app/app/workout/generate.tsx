import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { WorkoutDetailView } from "@/components/WorkoutDetailView";
import { WorkoutPlayer } from "@/components/WorkoutPlayer";
import { useColors } from "@/hooks/useColors";
import { workoutExercises } from "@/lib/workouts";
import {
  generateWorkout,
  WORKOUT_FOCUS_LABELS,
  type WorkoutFocus,
  type WorkoutLevel,
} from "@/lib/workouts";

const FOCUS_OPTIONS: WorkoutFocus[] = [
  "fullbody",
  "upper",
  "lower",
  "push",
  "pull",
  "core",
  "cardio",
];
const LEVEL_OPTIONS: WorkoutLevel[] = ["Beginner", "Intermediate", "Advanced"];
const DURATION_OPTIONS = [15, 30, 45, 60];

export default function GenerateWorkoutScreen() {
  const colors = useColors();
  const router = useRouter();

  const [focus, setFocus] = useState<WorkoutFocus>("fullbody");
  const [level, setLevel] = useState<WorkoutLevel>("Beginner");
  const [duration, setDuration] = useState(30);
  const [seed, setSeed] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [running, setRunning] = useState(false);

  const workout = useMemo(
    () => generateWorkout({ focus, level, durationMin: duration }),
    // seed forces a fresh shuffle on "regenerate"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focus, level, duration, seed],
  );
  const exercises = workoutExercises(workout);

  if (running) {
    return (
      <WorkoutPlayer
        workout={workout}
        exercises={exercises}
        onClose={() => setRunning(false)}
      />
    );
  }

  if (generated) {
    return (
      <WorkoutDetailView
        workout={workout}
        exercises={exercises}
        onBack={() => setGenerated(false)}
        onStart={() => setRunning(true)}
        headerExtra={
          <Pressable
            onPress={() => setSeed((s) => s + 1)}
            style={[styles.regenBtn, { borderColor: colors.border }]}
          >
            <Feather name="refresh-cw" size={16} color={colors.primary} />
            <AppText weight="700" size={14} color={colors.primary}>
              Regenerate
            </AppText>
          </Pressable>
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <AppText weight="700" size={28}>
          Build my workout
        </AppText>
        <AppText muted size={14} style={{ marginTop: 4 }}>
          Pick your focus, level and time — we'll assemble the right moves from the library.
        </AppText>

        <Label text="Focus" />
        <View style={styles.wrap}>
          {FOCUS_OPTIONS.map((f) => (
            <Choice
              key={f}
              label={WORKOUT_FOCUS_LABELS[f]}
              active={focus === f}
              onPress={() => setFocus(f)}
            />
          ))}
        </View>

        <Label text="Level" />
        <View style={styles.wrap}>
          {LEVEL_OPTIONS.map((l) => (
            <Choice key={l} label={l} active={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>

        <Label text="Duration" />
        <View style={styles.wrap}>
          {DURATION_OPTIONS.map((d) => (
            <Choice
              key={d}
              label={`${d} min`}
              active={duration === d}
              onPress={() => setDuration(d)}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => {
            setSeed((s) => s + 1);
            setGenerated(true);
          }}
          style={[styles.cta, { overflow: "hidden" }]}
        >
          <LinearGradient
            colors={colors.primaryGradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Feather name="zap" size={20} color="#FFFFFF" />
          <AppText weight="700" size={16} color="#FFFFFF">
            Generate workout
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return (
    <AppText weight="700" size={15} style={{ marginTop: 26, marginBottom: 12 }}>
      {text}
    </AppText>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: active ? colors.primary : colors.elevated,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <AppText
        weight="600"
        size={14}
        color={active ? colors.primaryForeground : colors.foreground}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4 },
  body: { paddingHorizontal: 20, flex: 1 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choice: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 8 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 18,
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
});
