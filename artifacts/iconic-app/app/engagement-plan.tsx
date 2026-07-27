import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyEngagementQueryKey,
  useGetMyEngagement,
  getGetMyEngagementPlanQueryKey,
  useGetMyEngagementPlan,
} from "@workspace/api-client-react";
import { useRouter, Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

const SCORE_COLORS = {
  green: "#22C55E",
  yellow: "#F5C842",
  red: "#EF4444",
};

export default function EngagementPlanScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const engagementQuery = useGetMyEngagement({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyEngagementQueryKey(),
    },
  });

  const planQuery = useGetMyEngagementPlan({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyEngagementPlanQueryKey(),
    },
  });

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const isLoading = engagementQuery.isLoading || planQuery.isLoading;
  const isError = engagementQuery.isError || planQuery.isError;
  const engagement = engagementQuery.data;
  const plan = planQuery.data;

  if (isLoading) {
    return (
      <Screen>
        <ModalHeader title="My 45-day plan" />
        <LoadingView />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ModalHeader title="My 45-day plan" />
        <ErrorView onRetry={() => { engagementQuery.refetch(); planQuery.refetch(); }} />
      </Screen>
    );
  }

  if (!engagement || !engagement.active) {
    return (
      <Screen>
        <ModalHeader title="My 45-day plan" />
        <EmptyState
          icon="calendar"
          title="Plan locked"
          message="Your 45-day plan unlocks after your kick-starter trial."
        />
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Button label="View Trainers" onPress={() => router.push("/trainers")} />
        </View>
      </Screen>
    );
  }

  const badgeColor =
    engagement.scoreBand === "green"
      ? SCORE_COLORS.green
      : engagement.scoreBand === "yellow"
      ? SCORE_COLORS.yellow
      : engagement.scoreBand === "red"
      ? SCORE_COLORS.red
      : colors.border;

  const progress = Math.min(
    100,
    Math.round((engagement.dayNumber / engagement.totalDays) * 100)
  );

  const currentDisplayDay = selectedDay !== null ? selectedDay : engagement.dayNumber;
  const displayDayData = plan?.days?.find((d: any) => d.day === currentDisplayDay);

  const renderSection = (title: string, items: any[] | undefined) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={{ marginTop: 16 }}>
        <AppText weight="700" size={14} style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }} color={colors.mutedForeground}>
          {title}
        </AppText>
        {items.map((item, idx) => (
          <View key={idx} style={{ flexDirection: "row", marginBottom: 6 }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.mutedForeground, marginTop: 8, marginRight: 8 }} />
            <AppText size={15} style={{ flex: 1 }}>{typeof item === 'string' ? item : JSON.stringify(item)}</AppText>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen
      refreshing={engagementQuery.isRefetching || planQuery.isRefetching}
      onRefresh={() => {
        engagementQuery.refetch();
        planQuery.refetch();
      }}
    >
      <ModalHeader title="My 45-day plan" />

      <View style={{ gap: 16, paddingBottom: 32 }}>
        {/* Header section */}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <View>
              <View style={[styles.levelChip, { backgroundColor: colors.primary + "1A" }]}>
                <AppText size={12} weight="700" color={colors.primary} style={{ textTransform: "capitalize" }}>
                  {engagement.level} Level
                </AppText>
              </View>
              <AppText weight="700" size={20} style={{ marginTop: 12 }}>
                Day {engagement.dayNumber} of {engagement.totalDays}
              </AppText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={[styles.scoreBadge, { backgroundColor: badgeColor + "1A", borderColor: badgeColor }]}>
                <AppText size={16} weight="700" style={{ color: badgeColor }}>
                  {engagement.score}
                </AppText>
              </View>
              <AppText size={11} color={colors.mutedForeground} style={{ marginTop: 4 }}>
                Engagement score
              </AppText>
            </View>
          </View>

          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View style={[styles.fill, { width: `${progress}%`, backgroundColor: "#C7F000" }]} />
          </View>
        </Card>

        {/* Dietician Row */}
        {engagement.dieticianName && (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + "1A" }]}>
                <Feather name="coffee" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={16}>
                  Dietician: {engagement.dieticianName}
                </AppText>
                <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 2 }}>
                  Diet planning, meal timing and hydration follow-ups are included in your program.
                </AppText>
              </View>
            </View>
          </Card>
        )}

        {/* PT Offer CTA */}
        {engagement.showPtOffer && (
          <Card style={{ borderColor: "#C7F000", borderWidth: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: "#C7F000" + "33" }]}>
                <Feather name="zap" size={20} color="#8A9900" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={16}>
                  Train with a personal trainer
                </AppText>
                <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 2, marginBottom: 12 }}>
                  See results 2-3x faster with expert guidance.
                </AppText>
                <Button label="View Trainers" onPress={() => router.push("/trainers")} size="md" />
              </View>
            </View>
          </Card>
        )}

        {/* Workout Card (Today or Selected Day) */}
        {displayDayData ? (
          <Animated.View entering={FadeIn}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <AppText weight="700" size={18}>
                    Day {displayDayData.day}: {displayDayData.title}
                  </AppText>
                  {displayDayData.focus && (
                    <AppText size={14} color={colors.mutedForeground} style={{ marginTop: 4 }}>
                      Focus: {displayDayData.focus}
                    </AppText>
                  )}
                </View>
                {displayDayData.day === engagement.dayNumber && (
                  <View style={[styles.todayTag, { backgroundColor: "#C7F000" + "33" }]}>
                    <AppText size={11} weight="700" style={{ color: "#8A9900" }}>TODAY</AppText>
                  </View>
                )}
              </View>

              {displayDayData.restDay ? (
                <View style={{ marginTop: 24, alignItems: "center", paddingVertical: 16 }}>
                  <Feather name="battery-charging" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
                  <AppText weight="700" size={16}>Rest & Recover</AppText>
                  <AppText size={14} color={colors.mutedForeground} style={{ textAlign: "center", marginTop: 4 }}>
                    Give your muscles time to rebuild.
                  </AppText>
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  {renderSection("Warm-up", displayDayData.warmup)}
                  {renderSection("Workout", displayDayData.workout)}
                  {renderSection("Cardio", displayDayData.cardio)}
                  {renderSection("Core", displayDayData.core)}
                  {renderSection("Stretching", displayDayData.stretching)}
                </View>
              )}
            </Card>
          </Animated.View>
        ) : null}

        {/* Full plan browser */}
        {plan?.days && (
          <View style={{ marginTop: 16 }}>
            <AppText weight="700" size={18} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              Your Full Plan
            </AppText>
            {Array.from({ length: Math.ceil(plan.days.length / 7) }).map((_, weekIndex) => {
              const weekDays = plan.days.slice(weekIndex * 7, (weekIndex + 1) * 7);
              if (!weekDays.length) return null;
              return (
                <View key={weekIndex} style={{ marginBottom: 24 }}>
                  <AppText weight="700" size={14} color={colors.mutedForeground} style={{ paddingHorizontal: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Week {weekIndex + 1}
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                    {weekDays.map((d: any) => {
                      const isSelected = currentDisplayDay === d.day;
                      const isToday = engagement.dayNumber === d.day;
                      const isPast = d.day < engagement.dayNumber;

                      let bg = colors.card;
                      let border = colors.border;
                      if (isSelected) {
                        border = colors.primary;
                      }
                      if (isToday) {
                        bg = "#C7F000" + "22";
                        border = "#C7F000";
                      }

                      return (
                        <Pressable
                          key={d.day}
                          onPress={() => setSelectedDay(d.day)}
                          style={[
                            styles.dayButton,
                            {
                              backgroundColor: bg,
                              borderColor: border,
                              opacity: isPast && !isSelected ? 0.6 : 1,
                            },
                          ]}
                        >
                          <AppText size={12} color={colors.mutedForeground} style={{ marginBottom: 4 }}>
                            Day {d.day}
                          </AppText>
                          <AppText weight="700" size={14} numberOfLines={1}>
                            {d.restDay ? "Rest" : d.focus || "Workout"}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  levelChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 8,
    borderRadius: 4,
    marginTop: 20,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  todayTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayButton: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
});
