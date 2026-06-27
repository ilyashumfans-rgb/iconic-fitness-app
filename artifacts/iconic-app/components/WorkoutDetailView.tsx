import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { type Exercise } from "@/lib/exercises";
import {
  WORKOUT_FOCUS_LABELS,
  workoutStats,
  type Workout,
} from "@/lib/workouts";

const LEVEL_TINT: Record<string, "success" | "warning" | "destructive"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "destructive",
};

export function WorkoutDetailView({
  workout,
  exercises,
  onStart,
  onBack,
  headerExtra,
}: {
  workout: Workout;
  exercises: Exercise[];
  onStart: () => void;
  onBack?: () => void;
  /** Optional content rendered above the exercise list (e.g. generator controls). */
  headerExtra?: React.ReactNode;
}) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stats = workoutStats(exercises);
  const tint = colors[LEVEL_TINT[workout.level]];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            onPress={() => (onBack ? onBack() : router.back())}
            style={[styles.backBtn, { backgroundColor: colors.background }]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.heroIconWrap}>
            <View style={[styles.heroIcon, { backgroundColor: colors.background }]}>
              <Feather name={workout.icon} size={38} color={colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <Badge label={WORKOUT_FOCUS_LABELS[workout.focus]} />
            <Badge label={workout.level} color={tint} />
          </View>
          <AppText weight="700" size={26} style={{ marginTop: 12 }}>
            {workout.name}
          </AppText>
          <AppText muted size={14} style={{ marginTop: 6, lineHeight: 21 }}>
            {workout.description}
          </AppText>

          {/* Stats */}
          <Card style={styles.statRow} tone="elevated">
            <Stat icon="layers" value={`${stats.exercises}`} label="Exercises" />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <Stat icon="repeat" value={`${stats.totalSets}`} label="Sets" />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <Stat icon="clock" value={`${stats.estMinutes}m`} label="Time" />
            <View style={[styles.vline, { backgroundColor: colors.border }]} />
            <Stat icon="zap" value={`~${stats.estCalories}`} label="Kcal" />
          </Card>

          {headerExtra}

          <AppText weight="700" size={18} style={{ marginTop: 28, marginBottom: 14 }}>
            The plan
          </AppText>

          {exercises.length === 0 ? (
            <Card>
              <AppText muted size={14}>
                No exercises match these options — try widening the focus or level.
              </AppText>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {exercises.map((ex, i) => (
                <Pressable
                  key={`${ex.slug}-${i}`}
                  onPress={() => router.push(`/exercise/${ex.slug}`)}
                >
                  <Card style={styles.exRow}>
                    <View style={[styles.exNum, { backgroundColor: colors.elevated }]}>
                      <AppText weight="700" size={14} color={colors.primary}>
                        {i + 1}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText weight="600" size={15}>
                        {ex.name}
                      </AppText>
                      <AppText muted size={12} style={{ marginTop: 2 }}>
                        {ex.sets} sets × {ex.reps} · {ex.rest} rest
                      </AppText>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky start button */}
      {exercises.length > 0 ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 14,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={onStart}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="play" size={20} color={colors.primaryForeground} />
            <AppText weight="700" size={16} color={colors.primaryForeground}>
              Start workout
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Badge({ label, color }: { label: string; color?: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.elevated, borderColor: colors.border },
      ]}
    >
      <AppText weight="700" size={12} color={color ?? colors.foreground}>
        {label}
      </AppText>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
}) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <AppText weight="700" size={16}>
        {value}
      </AppText>
      <AppText muted size={11}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, paddingHorizontal: 20, overflow: "hidden" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, marginTop: 18 },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 16,
  },
  vline: { width: StyleSheet.hairlineWidth, height: 40 },
  exRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  exNum: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 18,
  },
});
