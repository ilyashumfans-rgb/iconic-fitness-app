import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetTrackingSummaryQueryKey,
  useAddWater,
  useGetMe,
  useGetTrackingSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { LoadingView, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istToday } from "@/lib/dates";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const summaryQuery = useGetTrackingSummary({ date: istToday() });
  const meQuery = useGetMe();
  const addWater = useAddWater();
  const [quickLogging, setQuickLogging] = useState(false);

  const refetchAll = useCallback(() => {
    void summaryQuery.refetch();
    void meQuery.refetch();
  }, [summaryQuery, meQuery]);

  const onQuickWater = useCallback(async () => {
    if (quickLogging) return;
    setQuickLogging(true);
    try {
      await addWater.mutateAsync({ data: { amountMl: 250 } });
      await queryClient.invalidateQueries({
        queryKey: getGetTrackingSummaryQueryKey(),
      });
    } finally {
      setQuickLogging(false);
    }
  }, [quickLogging, addWater, queryClient]);

  const summary = summaryQuery.data;
  const firstName = user?.firstName ?? meQuery.data?.name?.split(" ")[0] ?? "";

  if (summaryQuery.isLoading && !summary) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  const calRatio = summary ? summary.caloriesIn / (summary.calorieGoal || 1) : 0;
  const waterRatio = summary ? summary.waterMl / (summary.waterGoalMl || 1) : 0;
  const stepRatio = summary ? summary.steps / (summary.stepGoal || 1) : 0;

  return (
    <Screen
      refreshing={summaryQuery.isRefetching}
      onRefresh={refetchAll}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText muted size={14}>
            {greeting()}
          </AppText>
          <AppText weight="700" size={26}>
            {firstName ? `${firstName} ` : "Athlete "}
          </AppText>
        </View>
        <View
          style={[
            styles.streakPill,
            { backgroundColor: colors.accent, borderColor: colors.border },
          ]}
        >
          <Feather name="zap" size={15} color={colors.primary} />
          <AppText weight="700" size={14} color={colors.primary}>
            {summary?.streakDays ?? 0}
          </AppText>
        </View>
      </View>

      {/* Hero rings */}
      <Card style={styles.hero}>
        <View style={styles.ringWrap}>
          <ProgressRing progress={calRatio} size={150} stroke={14} color={colors.calorie}>
            <ProgressRing
              progress={waterRatio}
              size={116}
              stroke={12}
              color={colors.water}
            >
              <ProgressRing
                progress={stepRatio}
                size={84}
                stroke={11}
                color={colors.steps}
              >
                <Feather name="activity" size={26} color={colors.foreground} />
              </ProgressRing>
            </ProgressRing>
          </ProgressRing>
        </View>

        <View style={styles.legend}>
          <LegendRow
            color={colors.calorie}
            label="Calories"
            value={`${summary?.caloriesIn ?? 0}`}
            goal={`${summary?.calorieGoal ?? 0} kcal`}
          />
          <LegendRow
            color={colors.water}
            label="Water"
            value={`${((summary?.waterMl ?? 0) / 1000).toFixed(1)}L`}
            goal={`${((summary?.waterGoalMl ?? 0) / 1000).toFixed(1)}L`}
          />
          <LegendRow
            color={colors.steps}
            label="Steps"
            value={`${summary?.steps ?? 0}`}
            goal={`${summary?.stepGoal ?? 0}`}
          />
        </View>
      </Card>

      {/* Quick log */}
      <SectionHeader title="Quick log" />
      <View style={styles.quickRow}>
        <QuickTile
          icon="droplet"
          label="+250ml"
          sub="Water"
          color={colors.water}
          onPress={onQuickWater}
          loading={quickLogging}
        />
        <QuickTile
          icon="coffee"
          label="Log meal"
          sub="Diet"
          color={colors.calorie}
          onPress={() => router.push("/diet")}
        />
        <QuickTile
          icon="activity"
          label="Workout"
          sub="Move"
          color={colors.primary}
          onPress={() => router.push("/workouts")}
        />
      </View>

      {/* Today stats */}
      <SectionHeader title="Today" />
      <View style={styles.statGrid}>
        <StatCard
          icon="zap"
          tint={colors.primary}
          value={`${summary?.caloriesOut ?? 0}`}
          label="kcal burned"
        />
        <StatCard
          icon="award"
          tint={colors.protein}
          value={`${summary?.proteinG ?? 0}g`}
          label={`of ${summary?.proteinGoalG ?? 0}g protein`}
        />
        <StatCard
          icon="repeat"
          tint={colors.water}
          value={`${summary?.workouts ?? 0}`}
          label="workouts today"
        />
        <StatCard
          icon="target"
          tint={colors.calorie}
          value={`${summary?.weeklyWorkouts ?? 0}/${summary?.weeklyGoal ?? 0}`}
          label="weekly goal"
        />
      </View>

      <Pressable onPress={() => router.push("/water")}>
        <Card style={styles.waterCta}>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={16}>
              Hydration log
            </AppText>
            <AppText muted size={13}>
              Track every glass, hit your daily target.
            </AppText>
          </View>
          <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
        </Card>
      </Pressable>
    </Screen>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function LegendRow({
  color,
  label,
  value,
  goal,
}: {
  color: string;
  label: string;
  value: string;
  goal: string;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText size={13} muted style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText weight="700" size={14}>
        {value}
      </AppText>
      <AppText size={12} muted>
        {" "}
        / {goal}
      </AppText>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  sub,
  color,
  onPress,
  loading,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.quickTile,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed || loading ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[styles.quickIcon, { backgroundColor: color + "22" }]}
      >
        <Feather name={icon} size={20} color={color} />
      </View>
      <AppText weight="700" size={14}>
        {label}
      </AppText>
      <AppText muted size={11}>
        {sub}
      </AppText>
    </Pressable>
  );
}

function StatCard({
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hero: { alignItems: "center", gap: 22, paddingVertical: 24 },
  ringWrap: { alignItems: "center", justifyContent: "center" },
  legend: { alignSelf: "stretch", gap: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  quickRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  quickTile: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: { width: "47.5%", gap: 8 },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  waterCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
