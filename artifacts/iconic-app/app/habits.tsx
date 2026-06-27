import { Feather } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useHabits } from "@/hooks/useHabits";
import { istDateNDaysAgo, istToday, istWeekdayShort } from "@/lib/dates";
import {
  HABITS,
  bestStreak,
  dayCount,
  habitStreak,
  isDone,
} from "@/lib/habits";

export default function HabitsScreen() {
  const colors = useColors();
  const { data, loading, toggle } = useHabits();

  const today = istToday();
  // Recompute the visible week per render keyed by today, so the grid rolls
  // forward correctly if the app stays open across an IST day boundary.
  const week = useMemo(
    () => [6, 5, 4, 3, 2, 1, 0].map((n) => istDateNDaysAgo(n)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today],
  );
  const doneToday = dayCount(data, today);
  const longest = bestStreak(data);

  return (
    <Screen edges={["top"]} contentContainerStyle={{ paddingTop: 8 }}>
      <ModalHeader title="Habits" />

      {loading ? (
        <LoadingView />
      ) : (
        <>
          {/* Summary */}
          <Card style={styles.summary} tone="elevated">
            <View style={styles.summaryItem}>
              <AppText weight="700" size={28} color={colors.primary}>
                {doneToday}
                <AppText muted size={16}>
                  {`/${HABITS.length}`}
                </AppText>
              </AppText>
              <AppText muted size={12}>
                Done today
              </AppText>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <View style={styles.streakRow}>
                <Feather name="zap" size={20} color={colors.primary} />
                <AppText weight="700" size={28}>
                  {longest}
                </AppText>
              </View>
              <AppText muted size={12}>
                Best streak (days)
              </AppText>
            </View>
          </Card>

          {/* Habit list */}
          <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
            Today&apos;s habits
          </AppText>
          <View style={{ gap: 12 }}>
            {HABITS.map((h) => {
              const done = isDone(data, h.key, today);
              const streak = habitStreak(data, h.key);
              return (
                <Pressable
                  key={h.key}
                  onPress={() => toggle(h.key)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <Card style={styles.habit}>
                    <View
                      style={[
                        styles.habitIcon,
                        {
                          backgroundColor: done
                            ? colors.primary
                            : colors.primary + "22",
                        },
                      ]}
                    >
                      <Feather
                        name={h.icon}
                        size={20}
                        color={done ? colors.primaryForeground : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText weight="700" size={15}>
                        {h.label}
                      </AppText>
                      <AppText muted size={12}>
                        {streak > 0 ? `${streak} day streak` : h.hint}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.check,
                        {
                          backgroundColor: done ? colors.primary : "transparent",
                          borderColor: done ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {done ? (
                        <Feather
                          name="check"
                          size={16}
                          color={colors.primaryForeground}
                        />
                      ) : null}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          {/* Weekly grid */}
          <AppText weight="700" size={18} style={{ marginTop: 24, marginBottom: 12 }}>
            This week
          </AppText>
          <Card style={{ gap: 14 }}>
            <View style={styles.weekHead}>
              <View style={styles.weekLabelCol} />
              {week.map((d) => (
                <View key={d} style={styles.weekDayCol}>
                  <AppText muted size={11}>
                    {istWeekdayShort(d)}
                  </AppText>
                </View>
              ))}
            </View>
            {HABITS.map((h) => (
              <View key={h.key} style={styles.weekRow}>
                <View style={styles.weekLabelCol}>
                  <AppText size={12} numberOfLines={1}>
                    {h.label}
                  </AppText>
                </View>
                {week.map((d) => {
                  const cellDone = isDone(data, h.key, d);
                  return (
                    <View key={d} style={styles.weekDayCol}>
                      <View
                        style={[
                          styles.cell,
                          {
                            backgroundColor: cellDone
                              ? colors.primary
                              : colors.elevated,
                            borderColor: colors.border,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: { width: StyleSheet.hairlineWidth, height: 44 },
  habit: { flexDirection: "row", alignItems: "center", gap: 12 },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  weekHead: { flexDirection: "row", alignItems: "center" },
  weekRow: { flexDirection: "row", alignItems: "center" },
  weekLabelCol: { width: 78 },
  weekDayCol: { flex: 1, alignItems: "center" },
  cell: { width: 18, height: 18, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth },
});
