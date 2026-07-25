import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyPtProgramQueryKey,
  useGetMyPtProgram,
  type PtSession,
} from "@workspace/api-client-react";
import { Redirect } from "expo-router";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istDateLabel } from "@/lib/dates";

/** "14:30" → "2:30 PM" */
function formatTime(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  const h = Number(hStr);
  if (!Number.isFinite(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

function statusColor(
  status: PtSession["status"],
  colors: { success: string; destructive: string; mutedForeground: string },
) {
  if (status === "completed") return colors.success;
  if (status === "cancelled") return colors.destructive;
  return colors.mutedForeground;
}

export default function PtDetailsScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();

  const query = useGetMyPtProgram({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyPtProgramQueryKey(),
    },
  });

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const program = query.data;

  return (
    <Screen>
      <ModalHeader title="PT Details" />
      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => query.refetch()} />
      ) : !program || !program.active ? (
        <EmptyState
          icon="user-check"
          title="No PT program yet"
          message="Once your trainer is assigned, your personal training details will appear here."
        />
      ) : (
        <View style={{ gap: 12 }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primary + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="user-check" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={17}>
                  {program.trainerName}
                </AppText>
                <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 2 }}>
                  Your personal trainer
                </AppText>
              </View>
            </View>
            <View style={{ marginTop: 12, gap: 6 }}>
              {program.gymName ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                  <AppText size={13} color={colors.mutedForeground}>
                    {program.gymName}
                  </AppText>
                </View>
              ) : null}
              {program.packageName ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="package" size={13} color={colors.mutedForeground} />
                  <AppText size={13} color={colors.mutedForeground}>
                    {program.packageName}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Card>

          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={15}>
                  Monthly sessions
                </AppText>
                <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 2 }}>
                  {program.totalSessions} sessions per month
                </AppText>
              </View>
              <AppText weight="700" size={22} color={colors.primary}>
                {program.completedCount}/{program.totalSessions}
              </AppText>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.border,
                marginTop: 12,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${Math.min(
                    100,
                    Math.round(
                      (program.completedCount /
                        Math.max(program.totalSessions, 1)) *
                        100,
                    ),
                  )}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 4,
                }}
              />
            </View>
            <AppText size={12} color={colors.mutedForeground} style={{ marginTop: 8 }}>
              {program.completedCount} completed ·{" "}
              {Math.max(program.totalSessions - program.completedCount, 0)}{" "}
              remaining this month
            </AppText>
          </Card>

          <Card>
            <AppText weight="700" size={15} style={{ marginBottom: 10 }}>
              Session timings
            </AppText>
            {program.sessions.length === 0 ? (
              <AppText size={13} color={colors.mutedForeground}>
                Your gym hasn't scheduled any sessions yet. Session timings will
                appear here once scheduled.
              </AppText>
            ) : (
              <View style={{ gap: 8 }}>
                {program.sessions.map((s) => (
                  <View
                    key={s.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Feather
                      name={
                        s.status === "completed"
                          ? "check-circle"
                          : s.status === "cancelled"
                            ? "x-circle"
                            : "clock"
                      }
                      size={16}
                      color={statusColor(s.status, colors)}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText weight="600" size={14}>
                        {istDateLabel(s.date)}
                      </AppText>
                      <AppText size={12} color={colors.mutedForeground}>
                        {formatTime(s.time)}
                      </AppText>
                    </View>
                    <AppText
                      size={12}
                      weight="700"
                      color={statusColor(s.status, colors)}
                      style={{ textTransform: "capitalize" }}
                    >
                      {s.status}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}
    </Screen>
  );
}
