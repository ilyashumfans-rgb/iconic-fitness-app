import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyAssessmentQueryKey,
  useGetMyAssessment,
  useBookAssessment,
  useCancelAssessment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, Redirect } from "expo-router";
import { useState } from "react";
import { Platform, Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CalendarPicker } from "@/components/DateTimePickers";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istToday } from "@/lib/dates";

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n${message}`)) onYes();
  } else {
    Alert.alert(title, message, [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel booking", style: "destructive", onPress: onYes },
    ]);
  }
}

function fmtTime(t: string): string {
  const [h] = t.split(":").map(Number);
  const hour12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour12}:${t.split(":")[1]} ${h! >= 12 ? "PM" : "AM"}`;
}

function fmtDate(d: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${d}T12:00:00Z`));
}

export default function AssessmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();

  const [date, setDate] = useState(istToday());
  const [time, setTime] = useState("07:00");
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState("");

  const query = useGetMyAssessment({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyAssessmentQueryKey(),
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetMyAssessmentQueryKey() });

  const bookMutation = useBookAssessment({
    mutation: {
      onSuccess: () => {
        setRescheduling(false);
        setError("");
        void invalidate();
      },
      onError: (e: unknown) =>
        setError(
          (e as { error?: string })?.error ??
            (e instanceof Error ? e.message : "Booking failed"),
        ),
    },
  });
  const cancelMutation = useCancelAssessment({
    mutation: { onSuccess: () => void invalidate() },
  });

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (query.isLoading) {
    return (
      <Screen>
        <ModalHeader title="Fitness assessment" />
        <LoadingView />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen>
        <ModalHeader title="Fitness assessment" />
        <ErrorView onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  const data = query.data;
  const booking = data.booking ?? null;
  const showPicker = data.eligible && (!booking || rescheduling);

  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      <ModalHeader title="Fitness assessment" />

      <View style={{ gap: 16, paddingBottom: 32 }}>
        {/* What it is */}
        <Card>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "1A" }]}>
              <Feather name="activity" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={16}>
                Empty-stomach assessment
              </AppText>
              <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 4 }}>
                An early-morning check of your BMI and body measurements — done
                before breakfast for accurate readings. No food after midnight;
                water is fine. Takes about 20 minutes.
              </AppText>
            </View>
          </View>
        </Card>

        {!data.eligible ? (
          <>
            <EmptyState
              icon="lock"
              title="Unlocks after trial acceptance"
              message="Book your kick-starter PT trial first — once a trainer accepts your request, you can schedule your assessment here."
            />
            <View style={{ paddingHorizontal: 16 }}>
              <Button label="View Trainers" onPress={() => router.push("/trainers")} />
            </View>
          </>
        ) : (
          <>
            {/* Current booking */}
            {booking && !rescheduling && (
              <Card style={{ borderColor: "#C7F000", borderWidth: 1 }}>
                <AppText weight="700" size={16}>
                  Your assessment is booked ✅
                </AppText>
                <AppText size={20} weight="700" style={{ marginTop: 8 }}>
                  {fmtDate(booking.slotDate)} · {fmtTime(booking.slotTime)}
                </AppText>
                {booking.gymName ? (
                  <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 4 }}>
                    {booking.gymName}
                  </AppText>
                ) : null}
                <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 8 }}>
                  We&apos;ll remind you the evening before. Remember: empty
                  stomach — no food after midnight.
                </AppText>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Reschedule"
                      variant="secondary"
                      size="md"
                      onPress={() => {
                        setDate(booking.slotDate);
                        setTime(booking.slotTime);
                        setRescheduling(true);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Cancel"
                      variant="secondary"
                      size="md"
                      onPress={() =>
                        confirm(
                          "Cancel assessment?",
                          "You can book a new slot any time.",
                          () => cancelMutation.mutate(),
                        )
                      }
                    />
                  </View>
                </View>
              </Card>
            )}

            {/* Last result */}
            {data.lastCompleted && !rescheduling && (
              <Card>
                <AppText weight="700" size={15}>
                  Last assessment: {fmtDate(data.lastCompleted.slotDate)}
                </AppText>
                <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 4 }}>
                  Your results were recorded — find them under Health → BMI
                  records.
                </AppText>
              </Card>
            )}

            {/* Slot picker */}
            {showPicker && (
              <>
                <Card>
                  <AppText weight="700" size={15} style={{ marginBottom: 10 }}>
                    Pick a date
                  </AppText>
                  <CalendarPicker value={date} onChange={setDate} />
                </Card>
                <Card>
                  <AppText weight="700" size={15} style={{ marginBottom: 10 }}>
                    Pick a morning slot
                  </AppText>
                  <View style={styles.slotRow}>
                    {(data.slotTimes ?? []).map((t) => {
                      const active = time === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setTime(t)}
                          style={[
                            styles.slotChip,
                            {
                              borderColor: active ? colors.primary : colors.border,
                              backgroundColor: active
                                ? colors.primary + "1A"
                                : "transparent",
                            },
                          ]}
                        >
                          <AppText
                            size={13}
                            weight="700"
                            color={active ? colors.primary : colors.mutedForeground}
                          >
                            {fmtTime(t)}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
                {error ? (
                  <AppText size={13} color="#EF4444" style={{ paddingHorizontal: 16 }}>
                    {error}
                  </AppText>
                ) : null}
                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                  <Button
                    label={
                      bookMutation.isPending
                        ? "Booking…"
                        : booking
                          ? "Confirm new slot"
                          : "Book assessment"
                    }
                    disabled={bookMutation.isPending}
                    onPress={() =>
                      bookMutation.mutate({ data: { slotDate: date, slotTime: time } })
                    }
                  />
                  {rescheduling && (
                    <Button
                      label="Back"
                      variant="secondary"
                      onPress={() => setRescheduling(false)}
                    />
                  )}
                </View>
              </>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
