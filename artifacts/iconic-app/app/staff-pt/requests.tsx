import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import {
  staffPtApi,
  useStaffNotificationPolling,
  type PtProgram,
  type PtRequest,
} from "@/lib/staffPt";

const FORCE_DARK = {
  mode: "dark" as const,
  scheme: "dark" as const,
  setMode: () => {},
  toggle: () => {},
};

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function StaffPtRequestsScreen() {
  return (
    <ThemeContext.Provider value={FORCE_DARK}>
      <Content />
    </ThemeContext.Provider>
  );
}

function Content() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useStaffNotificationPolling(true);

  const [pending, setPending] = useState<PtRequest[]>([]);
  const [mine, setMine] = useState<(PtRequest & { program: PtProgram })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await staffPtApi.requests();
      setPending(data.pending);
      setMine(data.mine);
    } catch (e) {
      notify("Could not load requests", e instanceof Error ? e.message : "");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAccept = useCallback(
    async (r: PtRequest) => {
      const key = `${r.refType}:${r.refId}`;
      setBusyKey(key);
      try {
        await staffPtApi.accept(r.refType, r.refId);
        notify("Request accepted", `${r.memberName} is now your member.`);
      } catch (e) {
        notify("Could not accept", e instanceof Error ? e.message : "");
      } finally {
        setBusyKey(null);
        void load();
      }
    },
    [load],
  );

  const onStart = useCallback(
    async (programId: number) => {
      setBusyKey(`start:${programId}`);
      try {
        await staffPtApi.start(programId);
        notify(
          "Training started",
          "The member's 2 free kick-starter sessions are now unlocked.",
        );
      } catch (e) {
        notify("Could not start", e instanceof Error ? e.message : "");
      } finally {
        setBusyKey(null);
        void load();
      }
    },
    [load],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 44) + 8,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          paddingHorizontal: 20,
          gap: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <AppText weight="700" size={18}>
            PT Requests
          </AppText>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <AppText size={12} weight="700" color={colors.primary} style={styles.eyebrow}>
              NEW REQUESTS
            </AppText>
            {pending.length === 0 ? (
              <AppText size={13} color={colors.mutedForeground}>
                No open requests right now. You'll get a notification when a
                member asks for a PT session.
              </AppText>
            ) : (
              pending.map((r) => (
                <View
                  key={`${r.refType}:${r.refId}`}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <RequestInfo r={r} muted={colors.mutedForeground} primary={colors.primary} />
                  <Pressable
                    onPress={() => onAccept(r)}
                    disabled={busyKey !== null}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: colors.primary, opacity: pressed || busyKey ? 0.7 : 1 },
                    ]}
                  >
                    {busyKey === `${r.refType}:${r.refId}` ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <AppText weight="700" size={14} color="#000">
                        Accept request
                      </AppText>
                    )}
                  </Pressable>
                </View>
              ))
            )}

            <AppText size={12} weight="700" color={colors.primary} style={[styles.eyebrow, { marginTop: 10 }]}>
              ACCEPTED BY ME
            </AppText>
            {mine.length === 0 ? (
              <AppText size={13} color={colors.mutedForeground}>
                Requests you accept show up here.
              </AppText>
            ) : (
              mine.map((r) => (
                <Pressable
                  key={`${r.refType}:${r.refId}`}
                  onPress={() => router.push(`/staff-pt/program/${r.program.id}`)}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <RequestInfo r={r} muted={colors.mutedForeground} primary={colors.primary} />
                  <View style={styles.rowBetween}>
                    <AppText size={12} weight="700" color={statusColor(r.program.status, colors.primary)}>
                      {r.program.status.toUpperCase()}
                    </AppText>
                    {r.program.status === "accepted" ? (
                      <Pressable
                        onPress={() => onStart(r.program.id)}
                        disabled={busyKey !== null}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          { backgroundColor: colors.primary, opacity: pressed || busyKey ? 0.7 : 1 },
                        ]}
                      >
                        {busyKey === `start:${r.program.id}` ? (
                          <ActivityIndicator color="#000" size="small" />
                        ) : (
                          <AppText weight="700" size={14} color="#000">
                            Start training
                          </AppText>
                        )}
                      </Pressable>
                    ) : (
                      <AppText size={12} color={colors.mutedForeground}>
                        Tap to manage
                      </AppText>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function statusColor(status: string, primary: string): string {
  if (status === "completed") return "#8f8f8f";
  if (status === "ongoing") return primary;
  return "#f5b840";
}

function RequestInfo({
  r,
  muted,
  primary,
}: {
  r: PtRequest;
  muted: string;
  primary: string;
}) {
  return (
    <View style={{ gap: 3 }}>
      <View style={styles.rowBetween}>
        <AppText weight="700" size={16}>
          {r.memberName || "Member"}
        </AppText>
        {r.paid ? (
          <AppText size={11} weight="700" color={primary}>
            PAID
          </AppText>
        ) : (
          <AppText size={11} weight="700" color={muted}>
            ENQUIRY
          </AppText>
        )}
      </View>
      <AppText size={13} color={muted}>
        {r.mobile ? `${r.mobile} · ` : ""}
        {r.gymName || "Any branch"}
      </AppText>
      <AppText size={13} color={muted}>
        {r.packageName}
        {r.trainerName ? ` · asked for ${r.trainerName}` : ""}
        {r.preferredDate ? ` · ${r.preferredDate}` : ""}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  eyebrow: { letterSpacing: 2 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
