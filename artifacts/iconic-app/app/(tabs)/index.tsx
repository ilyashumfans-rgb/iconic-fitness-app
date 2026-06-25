import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetTrackingSummaryQueryKey,
  getListMyBookingsQueryKey,
  useAddWater,
  useCreateBooking,
  useGetMe,
  useGetTrackingSummary,
  useListClasses,
  useListMyBookings,
  type ClassSession,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { LoadingView, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istToday, formatClock, formatDateLabel } from "@/lib/dates";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const summaryQuery = useGetTrackingSummary({ date: istToday() });
  const meQuery = useGetMe();
  const classesQuery = useListClasses({});
  const bookingsQuery = useListMyBookings({ status: "upcoming" });
  const addWater = useAddWater();
  const createBooking = useCreateBooking();
  const [quickLogging, setQuickLogging] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const bookedClassIds = useMemo(
    () => new Set((bookingsQuery.data ?? []).map((b) => b.classId)),
    [bookingsQuery.data],
  );

  const featured = useMemo(
    () => (classesQuery.data ?? []).slice(0, 6),
    [classesQuery.data],
  );

  const refetchAll = useCallback(() => {
    void summaryQuery.refetch();
    void meQuery.refetch();
    void classesQuery.refetch();
    void bookingsQuery.refetch();
  }, [summaryQuery, meQuery, classesQuery, bookingsQuery]);

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

  const onBook = useCallback(
    async (session: ClassSession) => {
      setBookingId(session.id);
      try {
        await createBooking.mutateAsync({ data: { classId: session.id } });
        await queryClient.invalidateQueries({
          queryKey: getListMyBookingsQueryKey(),
        });
        Alert.alert("Booked!", `You're in for ${session.title}.`);
      } catch {
        Alert.alert("Could not book", "This class may be full. Try another.");
      } finally {
        setBookingId(null);
      }
    },
    [createBooking, queryClient],
  );

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
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={[colors.primary + "26", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.heroGlow, { pointerEvents: "none" }]}
        />
        <Card style={styles.hero} tone="elevated">
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
      </View>

      {/* Book a class — gym activities */}
      <SectionHeader
        title="Book your next session"
        action="See all"
        onAction={() => router.push("/classes")}
      />
      {classesQuery.isLoading ? (
        <View style={{ height: 150, justifyContent: "center" }}>
          <LoadingView />
        </View>
      ) : featured.length === 0 ? (
        <Card style={{ marginBottom: 28 }}>
          <AppText weight="700" size={15}>
            No classes scheduled
          </AppText>
          <AppText muted size={13} style={{ marginTop: 4 }}>
            New sessions drop soon — pull to refresh.
          </AppText>
        </Card>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classRow}
          style={{ marginBottom: 28 }}
        >
          {featured.map((s) => (
            <ClassCard
              key={s.id}
              session={s}
              booked={bookedClassIds.has(s.id)}
              loading={bookingId === s.id}
              onBook={() => onBook(s)}
              onOpen={() => router.push("/classes")}
            />
          ))}
        </ScrollView>
      )}

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

function ClassCard({
  session,
  booked,
  loading,
  onBook,
  onOpen,
}: {
  session: ClassSession;
  booked: boolean;
  loading: boolean;
  onBook: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  const full = session.booked >= session.capacity;
  const tint = intensityColor(session.intensity, colors);

  return (
    <View
      style={[
        styles.classCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      {/* Tapping the card body opens the full Classes screen. The Book button
          below is a sibling (not nested) so its press can't double-fire. */}
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <LinearGradient
          colors={[tint + "33", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.classBanner}
        >
          <View style={[styles.intensity, { backgroundColor: tint + "33" }]}>
            <AppText weight="700" size={10} color={tint}>
              {session.intensity.toUpperCase()}
            </AppText>
          </View>
          <Feather name="activity" size={20} color={tint} />
        </LinearGradient>

        <View style={styles.classBody}>
          <AppText weight="700" size={16} numberOfLines={1}>
            {session.title}
          </AppText>
          <AppText muted size={12} numberOfLines={1} style={{ marginTop: 2 }}>
            {session.gymName}
          </AppText>

          <View style={styles.classMetaRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <AppText muted size={12}>
              {formatClock(session.startsAt)}
            </AppText>
            <AppText muted size={12}>
              ·
            </AppText>
            <AppText muted size={12}>
              {formatDateLabel(session.startsAt)}
            </AppText>
          </View>
        </View>
      </Pressable>

      <View style={styles.bookWrap}>
        <Pressable
          onPress={onBook}
          disabled={booked || full || loading}
          style={({ pressed }) => [
            styles.bookBtn,
            {
              backgroundColor: booked || full ? colors.elevated : colors.primary,
              borderRadius: colors.radius - 6,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            weight="700"
            size={13}
            color={booked || full ? colors.mutedForeground : colors.primaryForeground}
          >
            {loading ? "Booking…" : booked ? "Booked ✓" : full ? "Full" : "Book now"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function intensityColor(
  intensity: string,
  colors: ReturnType<typeof useColors>,
): string {
  if (intensity === "high") return colors.destructive;
  if (intensity === "medium") return colors.calorie;
  return colors.success;
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
  heroWrap: { marginBottom: 28 },
  heroGlow: {
    position: "absolute",
    top: -10,
    left: 20,
    right: 20,
    height: 120,
    borderRadius: 80,
  },
  hero: { alignItems: "center", gap: 22, paddingVertical: 24 },
  ringWrap: { alignItems: "center", justifyContent: "center" },
  legend: { alignSelf: "stretch", gap: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  classRow: { gap: 14, paddingRight: 8, paddingVertical: 2 },
  classCard: {
    width: 200,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  classBanner: {
    height: 70,
    paddingHorizontal: 14,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  intensity: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classBody: { paddingHorizontal: 14, paddingTop: 12 },
  classMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  bookWrap: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 },
  bookBtn: {
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
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
