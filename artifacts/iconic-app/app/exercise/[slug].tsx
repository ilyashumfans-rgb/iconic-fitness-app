import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { WEB_NOTCH_TOP } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";
import {
  categoryLabel,
  getExercise,
  type Exercise,
} from "@/lib/exercises";

const DIFFICULTY_TINT: Record<string, "success" | "warning" | "destructive"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "destructive",
};

export default function ExerciseDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const rawInsets = useSafeAreaInsets();
  // On web there are no real insets — pad enough to clear the simulated notch.
  const topInset =
    rawInsets.top > 0
      ? rawInsets.top
      : Platform.OS === "web"
        ? WEB_NOTCH_TOP
        : 0;
  const insets = { ...rawInsets, top: topInset };
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const exercise = getExercise(String(slug));

  if (!exercise) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <AppText weight="700" size={16}>
          Exercise not found
        </AppText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <AppText color={colors.primary} weight="700">
            Go back
          </AppText>
        </Pressable>
      </View>
    );
  }

  const tint = colors[DIFFICULTY_TINT[exercise.difficulty]];
  const alternatives = exercise.alternatives
    .map((s) => getExercise(s))
    .filter((e): e is Exercise => Boolean(e));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
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
          <View style={styles.heroTopRow}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: colors.background }]}
              hitSlop={8}
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
            <View
              style={[styles.catPill, { backgroundColor: colors.background }]}
            >
              <AppText weight="700" size={12} color={colors.foreground}>
                {categoryLabel(exercise.categoryId)}
              </AppText>
            </View>
          </View>

          <View style={styles.heroIconWrap}>
            <View
              style={[styles.heroIcon, { backgroundColor: colors.background }]}
            >
              <Feather name={exercise.icon} size={40} color={colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <AppText weight="700" size={26}>
            {exercise.name}
          </AppText>
          <AppText muted size={14} style={{ marginTop: 6, lineHeight: 21 }}>
            {exercise.summary}
          </AppText>

          {/* Quick facts */}
          <View style={styles.factGrid}>
            <Fact icon="crosshair" label="Target" value={exercise.muscle} />
            <Fact icon="box" label="Equipment" value={exercise.equipment} />
          </View>
          <View style={styles.factGrid}>
            <Fact
              icon="bar-chart-2"
              label="Difficulty"
              value={exercise.difficulty}
              valueColor={tint}
            />
            <Fact
              icon="zap"
              label="Burn"
              value={`~${exercise.caloriesPerSet} kcal/set`}
            />
          </View>

          {/* Prescription */}
          <Card style={styles.rx} tone="elevated">
            <RxStat label="Sets" value={String(exercise.sets)} />
            <View style={[styles.rxDivider, { backgroundColor: colors.border }]} />
            <RxStat label="Reps" value={exercise.reps} />
            <View style={[styles.rxDivider, { backgroundColor: colors.border }]} />
            <RxStat label="Rest" value={exercise.rest} />
          </Card>

          {/* Instructions */}
          <Section title="How to do it" icon="list">
            {exercise.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View
                  style={[styles.stepNum, { backgroundColor: colors.primary }]}
                >
                  <AppText weight="700" size={12} color={colors.primaryForeground}>
                    {i + 1}
                  </AppText>
                </View>
                <AppText size={14} style={{ flex: 1, lineHeight: 21 }}>
                  {step}
                </AppText>
              </View>
            ))}
          </Section>

          {/* Common mistakes */}
          <Section title="Common mistakes" icon="alert-triangle">
            {exercise.mistakes.map((m, i) => (
              <View key={i} style={styles.bulletRow}>
                <Feather name="x" size={16} color={colors.destructive} />
                <AppText size={14} style={{ flex: 1, lineHeight: 21 }}>
                  {m}
                </AppText>
              </View>
            ))}
          </Section>

          {/* Alternatives */}
          {alternatives.length > 0 ? (
            <Section title="Alternatives" icon="repeat">
              <View style={{ gap: 10 }}>
                {alternatives.map((alt) => (
                  <Pressable
                    key={alt.slug}
                    onPress={() => router.push(`/exercise/${alt.slug}`)}
                  >
                    <Card style={styles.altRow}>
                      <View
                        style={[
                          styles.altIcon,
                          {
                            backgroundColor: colors.accent,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Feather name={alt.icon} size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText weight="600" size={14}>
                          {alt.name}
                        </AppText>
                        <AppText muted size={12}>
                          {alt.muscle}
                        </AppText>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </Card>
                  </Pressable>
                ))}
              </View>
            </Section>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Fact({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.fact,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={15} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <AppText muted size={11}>
          {label}
        </AppText>
        <AppText weight="600" size={13} color={valueColor}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function RxStat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <AppText weight="700" size={18} color={colors.primary}>
        {value}
      </AppText>
      <AppText muted size={12} style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 26 }}>
      <View style={styles.sectionHead}>
        <Feather name={icon} size={16} color={colors.primary} />
        <AppText weight="700" size={17}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { height: 230, paddingHorizontal: 20, overflow: "hidden" },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  catPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  heroIconWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, marginTop: 20 },
  factGrid: { flexDirection: "row", gap: 12, marginTop: 12 },
  fact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rx: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 18,
  },
  rxDivider: { width: StyleSheet.hairlineWidth, height: 34 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  stepRow: { flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "flex-start" },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  bulletRow: { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "flex-start" },
  altRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  altIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
