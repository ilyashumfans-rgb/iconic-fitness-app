import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader, Segmented } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import {
  EXERCISE_CATEGORIES,
  EXERCISES,
  type Exercise,
} from "@/lib/exercises";
import {
  WORKOUT_FOCUS_LABELS,
  WORKOUT_TEMPLATES,
  workoutExercises,
  workoutStats,
  type Workout,
} from "@/lib/workouts";

const DIFFICULTY_TINT: Record<string, "success" | "warning" | "destructive"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "destructive",
};

type TrainTab = "library" | "workouts";

export default function TrainScreen() {
  const colors = useColors();
  const router = useRouter();
  const [tab, setTab] = useState<TrainTab>("library");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      const matchCat = !category || e.categoryId === category;
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.muscle.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [category, search]);

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }}>
      <View style={{ marginBottom: 18 }}>
        <AppText weight="700" size={28}>
          Train
        </AppText>
        <AppText muted size={14} style={{ marginTop: 2 }}>
          Browse exercises or start a ready-made workout.
        </AppText>
      </View>

      <Pressable
        onPress={() => router.push("/trainers")}
        style={{ marginBottom: 16 }}
      >
        <Card tone="elevated">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Feather
                name="users"
                size={22}
                color={colors.primaryForeground}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={16}>
                Personal Trainers
              </AppText>
              <AppText muted size={13} style={{ marginTop: 2 }}>
                Find a coach & book a 1-on-1 session
              </AppText>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </View>
        </Card>
      </Pressable>

      <View style={{ marginBottom: 20 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "library", label: "Library" },
            { value: "workouts", label: "Workouts" },
          ]}
        />
      </View>

      {tab === "workouts" ? (
        <WorkoutsTab />
      ) : (
        <LibraryTab
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          results={results}
          onOpen={(slug) => router.push(`/exercise/${slug}`)}
        />
      )}
    </Screen>
  );
}

function LibraryTab({
  search,
  setSearch,
  category,
  setCategory,
  results,
  onOpen,
}: {
  search: string;
  setSearch: (v: string) => void;
  category: string | null;
  setCategory: (v: string | null) => void;
  results: Exercise[];
  onOpen: (slug: string) => void;
}) {
  const colors = useColors();
  return (
    <>
      {/* Search */}
      <View
        style={[
          styles.search,
          { backgroundColor: colors.input, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises or muscles"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={{ marginBottom: 20 }}
      >
        <CategoryChip
          label="All"
          icon="grid"
          active={category === null}
          onPress={() => setCategory(null)}
        />
        {EXERCISE_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.label}
            icon={c.icon}
            active={category === c.id}
            onPress={() => setCategory(category === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      <SectionHeader title={`${results.length} exercises`} />

      {results.length === 0 ? (
        <Card>
          <AppText weight="700" size={15}>
            Nothing found
          </AppText>
          <AppText muted size={13} style={{ marginTop: 4 }}>
            Try a different search or category.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {results.map((ex) => (
            <ExerciseRow
              key={ex.slug}
              exercise={ex}
              onPress={() => onOpen(ex.slug)}
            />
          ))}
        </View>
      )}
    </>
  );
}

function WorkoutsTab() {
  const colors = useColors();
  const router = useRouter();
  return (
    <>
      {/* Generator CTA */}
      <Pressable onPress={() => router.push("/workout/generate")}>
        <Card style={styles.genCard} tone="elevated">
          <View style={[styles.genIcon, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={22} color={colors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={16}>
              Build my workout
            </AppText>
            <AppText muted size={13} style={{ marginTop: 2 }}>
              Generate a custom routine by focus, level & time.
            </AppText>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Card>
      </Pressable>

      <View style={{ height: 24 }} />
      <SectionHeader title="Ready-made workouts" />

      <View style={{ gap: 12 }}>
        {WORKOUT_TEMPLATES.map((w) => (
          <WorkoutRow
            key={w.id}
            workout={w}
            onPress={() => router.push(`/workout/${w.id}`)}
          />
        ))}
      </View>
    </>
  );
}

function WorkoutRow({ workout, onPress }: { workout: Workout; onPress: () => void }) {
  const colors = useColors();
  const stats = workoutStats(workoutExercises(workout));
  const tint = colors[DIFFICULTY_TINT[workout.level]];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={styles.exRow}>
        <View
          style={[
            styles.exIcon,
            { backgroundColor: colors.accent, borderColor: colors.border },
          ]}
        >
          <Feather name={workout.icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={15}>
            {workout.name}
          </AppText>
          <AppText muted size={12} style={{ marginTop: 2 }}>
            {WORKOUT_FOCUS_LABELS[workout.focus]} · {stats.exercises} exercises · {stats.estMinutes}m
          </AppText>
          <View style={styles.metaRow}>
            <View style={[styles.diffDot, { backgroundColor: tint }]} />
            <AppText size={12} color={tint} weight="600">
              {workout.level}
            </AppText>
            <AppText muted size={12}>
              · ~{stats.estCalories} kcal
            </AppText>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Card>
    </Pressable>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.elevated,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Feather
        name={icon}
        size={14}
        color={active ? colors.primaryForeground : colors.mutedForeground}
      />
      <AppText
        weight="600"
        size={13}
        color={active ? colors.primaryForeground : colors.foreground}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function ExerciseRow({
  exercise,
  onPress,
}: {
  exercise: Exercise;
  onPress: () => void;
}) {
  const colors = useColors();
  const tintKey = DIFFICULTY_TINT[exercise.difficulty];
  const tint = colors[tintKey];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={styles.exRow}>
        <View
          style={[
            styles.exIcon,
            { backgroundColor: colors.accent, borderColor: colors.border },
          ]}
        >
          <Feather name={exercise.icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={15}>
            {exercise.name}
          </AppText>
          <AppText muted size={12} style={{ marginTop: 2 }}>
            {exercise.muscle}
          </AppText>
          <View style={styles.metaRow}>
            <View style={[styles.diffDot, { backgroundColor: tint }]} />
            <AppText size={12} color={tint} weight="600">
              {exercise.difficulty}
            </AppText>
            <AppText muted size={12}>
              · {exercise.sets} × {exercise.reps}
            </AppText>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    height: "100%",
  },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  exIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  diffDot: { width: 7, height: 7, borderRadius: 4 },
  genCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  genIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
