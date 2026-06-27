import { Feather } from "@expo/vector-icons";
import {
  useGetProgress,
  useGetTrackingSummary,
  type ProgressDay,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { HexProgress } from "@/components/HexProgress";
import { Screen } from "@/components/Screen";
import { LoadingView, Segmented } from "@/components/ui-bits";
import { WeeklyBars } from "@/components/WeeklyBars";
import { useColors } from "@/hooks/useColors";
import { istToday } from "@/lib/dates";

type Metric = "caloriesIn" | "steps" | "activeMinutes";

const METRICS: Record<
  Metric,
  { label: string; color: keyof ReturnType<typeof useColors>; suffix?: string }
> = {
  caloriesIn: { label: "Calories", color: "calorie" },
  steps: { label: "Steps", color: "steps" },
  activeMinutes: { label: "Active min", color: "water", suffix: "m" },
};

export default function ProgressScreen() {
  const colors = useColors();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("caloriesIn");
  const progressQuery = useGetProgress({ days: 7 });
  const summaryQuery = useGetTrackingSummary({ date: istToday() });

  const report = progressQuery.data;
  const days = report?.days ?? [];
  const cfg = METRICS[metric];

  const summary = summaryQuery.data;
  const weeklyDone = summary?.weeklyWorkouts ?? 0;
  const weeklyGoal = Math.max(1, summary?.weeklyGoal ?? 5);
  const weeklyPct = Math.min(1, weeklyDone / weeklyGoal);
  const weeklyToGo = Math.max(0, weeklyGoal - weeklyDone);

  return (
    <Screen
      refreshing={progressQuery.isRefetching}
      onRefresh={() => {
        void progressQuery.refetch();
        void summaryQuery.refetch();
      }}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      <AppText weight="700" size={28} style={{ marginBottom: 16 }}>
        Progress
      </AppText>

      {progressQuery.isLoading && !report ? (
        <LoadingView />
      ) : (
        <>
          {/* Body & measurements entry */}
          <Pressable
            onPress={() => router.push("/body")}
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
            <View
              style={[styles.bodyLinkIcon, { backgroundColor: colors.primary + "22" }]}
            >
              <Feather name="trending-up" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={15}>
                Body & Weight
              </AppText>
              <AppText muted size={12}>
                Track weight, BMI and measurements
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          {/* Meal plans entry */}
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
            <View
              style={[styles.bodyLinkIcon, { backgroundColor: colors.primary + "22" }]}
            >
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

          {/* Habit tracker entry */}
          <Pressable
            onPress={() => router.push("/habits")}
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
            <View
              style={[styles.bodyLinkIcon, { backgroundColor: colors.primary + "22" }]}
            >
              <Feather name="check-circle" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={15}>
                Habit Tracker
              </AppText>
              <AppText muted size={12}>
                Build daily habits and keep your streak
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          {/* AI Coach entry */}
          <Pressable
            onPress={() => router.push("/coach")}
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
            <View
              style={[styles.bodyLinkIcon, { backgroundColor: colors.primary + "22" }]}
            >
              <Feather name="message-circle" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={15}>
                AI Coach
              </AppText>
              <AppText muted size={12}>
                Personalized advice from your own data
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          {/* Challenges entry */}
          <Pressable
            onPress={() => router.push("/challenges")}
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
            <View
              style={[styles.bodyLinkIcon, { backgroundColor: colors.primary + "22" }]}
            >
              <Feather name="award" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={15}>
                Challenges
              </AppText>
              <AppText muted size={12}>
                Join challenges and climb the leaderboard
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          {/* Weekly target hero */}
          <Card style={styles.hero}>
            <View style={styles.heroHead}>
              <AppText weight="700" size={17}>
                Weekly Target
              </AppText>
              <View style={styles.heroPill}>
                <Feather name="target" size={12} color={colors.primary} />
                <AppText size={12} weight="600" color={colors.primary}>
                  {weeklyDone}/{weeklyGoal} sessions
                </AppText>
              </View>
            </View>
            <View style={styles.heroBody}>
              <HexProgress
                progress={weeklyPct}
                centerMain={`${Math.round(weeklyPct * 100)}%`}
                centerBottom={
                  weeklyToGo === 0 ? "Goal smashed" : `${weeklyToGo} to go`
                }
              />
            </View>
            <AppText muted size={13} style={{ textAlign: "center" }}>
              {weeklyToGo === 0
                ? "You hit your weekly workout goal. Incredible work."
                : `${weeklyToGo} more workout${weeklyToGo === 1 ? "" : "s"} to hit your weekly goal.`}
            </AppText>
          </Card>

          {/* Highlight cards */}
          <View style={styles.grid}>
            <Highlight
              icon="zap"
              tint={colors.primary}
              value={`${report?.streakDays ?? 0}`}
              label="day streak"
            />
            <Highlight
              icon="repeat"
              tint={colors.water}
              value={`${report?.totalWorkouts ?? 0}`}
              label="workouts (7d)"
            />
            <Highlight
              icon="navigation"
              tint={colors.calorie}
              value={`${Math.round((report?.totalSteps ?? 0) / 1000)}k`}
              label="steps (7d)"
            />
            <Highlight
              icon="pie-chart"
              tint={colors.protein}
              value={`${report?.avgCaloriesIn ?? 0}`}
              label="avg kcal/day"
            />
          </View>

          {/* Trend chart */}
          <Card style={{ marginTop: 8 }}>
            <View style={styles.chartHead}>
              <AppText weight="700" size={17}>
                7-day trend
              </AppText>
            </View>
            <View style={{ marginBottom: 16 }}>
              <Segmented
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "caloriesIn", label: "Calories" },
                  { value: "steps", label: "Steps" },
                  { value: "activeMinutes", label: "Active" },
                ]}
              />
            </View>
            <WeeklyBars
              data={days.map((d: ProgressDay) => ({
                label: d.label,
                value: d[metric],
              }))}
              color={colors[cfg.color] as string}
              suffix={cfg.suffix}
            />
          </Card>

          {/* Daily breakdown */}
          <AppText weight="700" size={18} style={{ marginTop: 28, marginBottom: 14 }}>
            Daily breakdown
          </AppText>
          <View style={{ gap: 10 }}>
            {[...days].reverse().map((d: ProgressDay) => (
              <Card key={d.date} style={styles.dayRow}>
                <View style={styles.dayBadge}>
                  <AppText weight="700" size={13} color={colors.primary}>
                    {d.label}
                  </AppText>
                </View>
                <DayStat icon="droplet" text={`${(d.waterMl / 1000).toFixed(1)}L`} />
                <DayStat icon="coffee" text={`${d.caloriesIn}`} />
                <DayStat icon="navigation" text={`${d.steps}`} />
                <DayStat icon="activity" text={`${d.workouts}`} />
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function Highlight({
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
    <Card style={styles.highlight}>
      <View style={[styles.hlIcon, { backgroundColor: tint + "22" }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <AppText weight="700" size={24}>
        {value}
      </AppText>
      <AppText muted size={12}>
        {label}
      </AppText>
    </Card>
  );
}

function DayStat({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.dayStat}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <AppText size={12}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 14, marginBottom: 16, paddingVertical: 22 },
  heroHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBody: { alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  highlight: { width: "47.5%", gap: 6 },
  hlIcon: {
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
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bodyLinkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chartHead: { marginBottom: 14 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  dayBadge: { flex: 1 },
  dayStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 58,
  },
});
