import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { EXERCISE_FRAMES } from "@/lib/exerciseMedia";
import { workoutStats, type Workout } from "@/lib/workouts";
import { type Exercise } from "@/lib/exercises";

type Step = { exercise: Exercise; setNumber: number };

export function WorkoutPlayer({
  workout,
  exercises,
  onClose,
}: {
  workout: Workout;
  exercises: Exercise[];
  onClose: () => void;
}) {
  const colors = useColors();

  // Flatten every exercise × set into an ordered list of steps.
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [];
    for (const exercise of exercises) {
      for (let s = 1; s <= exercise.sets; s++) {
        out.push({ exercise, setNumber: s });
      }
    }
    return out;
  }, [exercises]);

  const [index, setIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against double-advance (e.g. "Skip rest" tapped on a tick boundary).
  const advancingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  // A fresh work phase re-arms the advance guard.
  useEffect(() => {
    advancingRef.current = false;
  }, [index]);

  const step = steps[index];
  const nextStep = steps[index + 1];

  const advance = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    clearTimer();
    setResting(false);
    if (index + 1 >= steps.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [clearTimer, index, steps.length]);

  const startRest = useCallback(
    (seconds: number) => {
      setResting(true);
      setRestLeft(seconds);
      clearTimer();
      timerRef.current = setInterval(() => {
        setRestLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    },
    [clearTimer],
  );

  // When the rest countdown reaches zero, move on exactly once.
  useEffect(() => {
    if (resting && restLeft === 0) {
      advance();
    }
  }, [resting, restLeft, advance]);

  const completeSet = useCallback(() => {
    if (!step) return;
    if (index + 1 >= steps.length) {
      setDone(true);
      return;
    }
    const rest = parseInt(step.exercise.rest, 10) || 60;
    startRest(rest);
  }, [index, startRest, step, steps.length]);

  const skipRest = useCallback(() => advance(), [advance]);

  if (done) {
    const stats = workoutStats(exercises);
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={44} color={colors.primaryForeground} />
          </View>
          <AppText weight="700" size={26} style={{ marginTop: 20 }}>
            Workout complete!
          </AppText>
          <AppText muted size={14} style={{ marginTop: 6, textAlign: "center" }}>
            Great work finishing {workout.name}. Recovery is where the gains happen.
          </AppText>

          <Card style={styles.doneStats} tone="elevated">
            <DoneStat value={`${stats.totalSets}`} label="Sets done" />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <DoneStat value={`~${stats.estCalories}`} label="Calories" />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <DoneStat value={`${stats.exercises}`} label="Exercises" />
          </Card>

          <Pressable
            onPress={onClose}
            style={[styles.primaryBtn, { overflow: "hidden" }]}
          >
            <LinearGradient
              colors={colors.primaryGradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppText weight="700" size={16} color="#FFFFFF">
              Done
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!step) return null;

  const completedSets = index;
  const totalSets = steps.length;
  const progress = totalSets > 0 ? completedSets / totalSets : 0;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <AppText weight="600" size={13} muted>
          Set {completedSets + 1} of {totalSets}
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.elevated }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>

      <View style={styles.body}>
        {!resting && EXERCISE_FRAMES[step.exercise.slug] ? (
          <PlayerDemo slug={step.exercise.slug} />
        ) : (
          <View
            style={[
              styles.bigIcon,
              { backgroundColor: colors.accent, borderColor: colors.border },
            ]}
          >
            <Feather
              name={resting ? "clock" : step.exercise.icon}
              size={52}
              color={colors.primary}
            />
          </View>
        )}

        {resting && nextStep ? (
          <>
            <AppText weight="600" size={15} muted style={{ marginTop: 28 }}>
              Rest
            </AppText>
            <AppText weight="700" size={64} color={colors.primary}>
              {restLeft}
            </AppText>
            <AppText muted size={14} style={{ textAlign: "center" }}>
              Next: {nextStep.exercise.name} · set {nextStep.setNumber} of{" "}
              {nextStep.exercise.sets}
            </AppText>
            <Pressable
              onPress={skipRest}
              style={[styles.ghostBtn, { borderColor: colors.border }]}
            >
              <AppText weight="700" size={15} color={colors.foreground}>
                Skip rest
              </AppText>
            </Pressable>
          </>
        ) : (
          <>
            <AppText weight="700" size={26} style={{ marginTop: 28, textAlign: "center" }}>
              {step.exercise.name}
            </AppText>
            <AppText muted size={14} style={{ marginTop: 4 }}>
              {step.exercise.muscle}
            </AppText>

            <View style={styles.setRow}>
              <SetStat value={`${step.setNumber}/${step.exercise.sets}`} label="Set" />
              <View style={[styles.vline, { backgroundColor: colors.border }]} />
              <SetStat value={step.exercise.reps} label="Reps" />
              <View style={[styles.vline, { backgroundColor: colors.border }]} />
              <SetStat value={step.exercise.rest} label="Rest" />
            </View>

            <Pressable
              onPress={completeSet}
              style={[styles.primaryBtn, { overflow: "hidden" }]}
            >
              <LinearGradient
                colors={colors.primaryGradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Feather name="check" size={20} color="#FFFFFF" />
              <AppText weight="700" size={16} color="#FFFFFF">
                {index + 1 >= steps.length ? "Finish workout" : "Complete set"}
              </AppText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/** Two-frame exercise demo (start/end position) flipped like a GIF. */
function PlayerDemo({ slug }: { slug: string }) {
  const colors = useColors();
  const frames = EXERCISE_FRAMES[slug];
  const [frame, setFrame] = useState(0);

  // Restart from the first frame whenever the exercise changes.
  useEffect(() => {
    setFrame(0);
    if (!frames) return;
    const t = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 900);
    return () => clearInterval(t);
  }, [frames]);

  if (!frames) return null;
  return (
    <View style={[styles.demoWrap, { borderColor: colors.border }]}>
      <Image source={frames[frame]} style={styles.demoImg} resizeMode="contain" />
      <View style={[styles.demoBadge, { backgroundColor: colors.primary }]}>
        <Feather name="play" size={10} color={colors.primaryForeground} />
        <AppText weight="700" size={10} color={colors.primaryForeground}>
          DEMO
        </AppText>
      </View>
    </View>
  );
}

function SetStat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <AppText weight="700" size={20}>
        {value}
      </AppText>
      <AppText muted size={12} style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

function DoneStat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <AppText weight="700" size={20} color={colors.primary}>
        {value}
      </AppText>
      <AppText muted size={12} style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  closeBtn: { width: 24 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigIcon: {
    width: 132,
    height: 132,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  demoWrap: {
    width: 220,
    height: 176,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  demoImg: { width: "92%", height: "92%" },
  demoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 32,
    marginBottom: 8,
  },
  vline: { width: StyleSheet.hairlineWidth, height: 36 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 18,
    alignSelf: "stretch",
    marginTop: 36,
  },
  ghostBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 36,
  },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  doneIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  doneStats: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 32,
    paddingVertical: 18,
  },
});
