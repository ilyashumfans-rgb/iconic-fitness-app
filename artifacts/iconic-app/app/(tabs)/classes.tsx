import { Feather } from "@expo/vector-icons";
import {
  getListMyBookingsQueryKey,
  useCreateBooking,
  useCreateCheckin,
  useListClasses,
  useListMyBookings,
  type Booking,
  type ClassSession,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import {
  Chip,
  ChipRow,
  EmptyState,
  LoadingView,
  Segmented,
} from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { formatClock, formatDateLabel } from "@/lib/dates";

const CATEGORIES = ["All", "HIIT", "Yoga", "Strength", "Cardio", "Pilates"];

export default function ClassesScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [category, setCategory] = useState("All");
  const queryClient = useQueryClient();

  const classesQuery = useListClasses(
    category === "All" ? {} : { category: category.toLowerCase() },
  );
  const bookingsQuery = useListMyBookings({ status: "upcoming" });
  const createBooking = useCreateBooking();
  const createCheckin = useCreateCheckin();
  const [busyId, setBusyId] = useState<number | null>(null);

  const bookedClassIds = useMemo(
    () => new Set((bookingsQuery.data ?? []).map((b) => b.classId)),
    [bookingsQuery.data],
  );

  const onBook = useCallback(
    async (session: ClassSession) => {
      setBusyId(session.id);
      try {
        await createBooking.mutateAsync({ data: { classId: session.id } });
        await queryClient.invalidateQueries({
          queryKey: getListMyBookingsQueryKey(),
        });
        Alert.alert("Booked!", `You're in for ${session.title}.`);
      } catch {
        Alert.alert("Could not book", "This class may be full. Try another.");
      } finally {
        setBusyId(null);
      }
    },
    [createBooking, queryClient],
  );

  const onCheckIn = useCallback(
    async (booking: Booking) => {
      setBusyId(booking.id);
      try {
        await createCheckin.mutateAsync({
          data: { gymId: booking.gymId, method: "manual" },
        });
        Alert.alert("Checked in", `Welcome to ${booking.gymName}!`);
      } catch {
        Alert.alert("Check-in failed", "Please try again.");
      } finally {
        setBusyId(null);
      }
    },
    [createCheckin],
  );

  return (
    <Screen
      refreshing={classesQuery.isRefetching || bookingsQuery.isRefetching}
      onRefresh={() => {
        void classesQuery.refetch();
        void bookingsQuery.refetch();
      }}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      <AppText weight="700" size={28} style={{ marginBottom: 16 }}>
        Classes
      </AppText>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "discover", label: "Discover" },
          { value: "mine", label: "My bookings" },
        ]}
      />

      {tab === "discover" ? (
        <View style={{ marginTop: 18 }}>
          <ChipRow>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={c}
                active={c === category}
                onPress={() => setCategory(c)}
              />
            ))}
          </ChipRow>

          {classesQuery.isLoading ? (
            <LoadingView />
          ) : (classesQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No classes found"
              message="Try a different category or check back soon."
            />
          ) : (
            <View style={{ gap: 12, marginTop: 8 }}>
              {(classesQuery.data ?? []).map((s) => {
                const full = s.booked >= s.capacity;
                const booked = bookedClassIds.has(s.id);
                return (
                  <Card key={s.id} style={styles.classCard}>
                    <View style={styles.classTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.metaRow}>
                          <View
                            style={[
                              styles.intensity,
                              { backgroundColor: intensityColor(s.intensity, colors) + "22" },
                            ]}
                          >
                            <AppText
                              weight="700"
                              size={10}
                              color={intensityColor(s.intensity, colors)}
                            >
                              {s.intensity.toUpperCase()}
                            </AppText>
                          </View>
                          <AppText size={12} muted>
                            {s.category}
                          </AppText>
                        </View>
                        <AppText weight="700" size={17} style={{ marginTop: 6 }}>
                          {s.title}
                        </AppText>
                        <AppText muted size={13}>
                          {s.gymName} · {s.trainerName}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.classMeta}>
                      <MetaPill icon="clock" text={formatClock(s.startsAt)} />
                      <MetaPill icon="calendar" text={formatDateLabel(s.startsAt)} />
                      <MetaPill
                        icon="users"
                        text={`${s.booked}/${s.capacity}`}
                      />
                    </View>

                    <Button
                      label={booked ? "Booked" : full ? "Class full" : "Book class"}
                      onPress={() => onBook(s)}
                      disabled={booked || full}
                      loading={busyId === s.id}
                      variant={booked ? "secondary" : "primary"}
                    />
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 18 }}>
          {bookingsQuery.isLoading ? (
            <LoadingView />
          ) : (bookingsQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon="bookmark"
              title="No upcoming bookings"
              message="Book a class from the Discover tab to see it here."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {(bookingsQuery.data ?? []).map((b) => (
                <Card key={b.id} style={styles.classCard}>
                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.intensity,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <AppText weight="700" size={10} color={colors.primary}>
                        {b.status.toUpperCase()}
                      </AppText>
                    </View>
                    <AppText size={12} muted>
                      {formatDateLabel(b.startsAt)}
                    </AppText>
                  </View>
                  <AppText weight="700" size={17} style={{ marginTop: 6 }}>
                    {b.classTitle}
                  </AppText>
                  <AppText muted size={13}>
                    {b.gymName} · {formatClock(b.startsAt)}
                  </AppText>
                  <View style={{ marginTop: 14 }}>
                    <Button
                      label="Check in"
                      icon="check-circle"
                      onPress={() => onCheckIn(b)}
                      loading={busyId === b.id}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

function MetaPill({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.metaPill}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <AppText size={12} muted>
        {text}
      </AppText>
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

const styles = StyleSheet.create({
  classCard: { gap: 14 },
  classTop: { flexDirection: "row", alignItems: "flex-start" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  intensity: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classMeta: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 5 },
});
