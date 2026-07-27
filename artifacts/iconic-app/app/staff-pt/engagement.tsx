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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import {
  assignEngagement,
  fetchEngagementOverview,
  useStaffNotificationPolling,
  type EngagementMember,
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

export default function StaffPtEngagementScreen() {
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

  const [rows, setRows] = useState<EngagementMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyPhone, setBusyPhone] = useState<string | null>(null);
  
  // Enrol form
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [enrolBusy, setEnrolBusy] = useState(false);
  const [enrolError, setEnrolError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchEngagementOverview();
      setRows(data);
    } catch (e) {
      notify("Could not load members", e instanceof Error ? e.message : "");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const doAssign = async (memberPhone: string, newLevel: "beginner" | "intermediate" | "advanced", isEnrol = false) => {
    if (isEnrol) setEnrolBusy(true);
    else setBusyPhone(memberPhone);
    setEnrolError("");
    try {
      await assignEngagement(memberPhone, newLevel);
      if (isEnrol) {
        setPhone("");
        setLevel("beginner");
        notify("Enrolled", "Member assigned to engagement program.");
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Assignment failed";
      if (isEnrol) {
        // Fallback for 404 if the server just returns a generic error
        if (msg === "Request failed" || msg.toLowerCase().includes("not found")) {
          setEnrolError("No app member found with that phone.");
        } else {
          setEnrolError(msg);
        }
      } else {
        notify("Could not change level", msg);
      }
    } finally {
      if (isEnrol) setEnrolBusy(false);
      else setBusyPhone(null);
    }
  };

  const needsFollowUp = rows.filter((r) => r.scoreBand === "red");
  const onTrack = rows.filter((r) => r.scoreBand !== "red");

  const renderCard = (m: EngagementMember) => {
    const badgeColor =
      m.scoreBand === "green"
        ? "#22C55E"
        : m.scoreBand === "yellow"
          ? "#F5C842"
          : "#EF4444";
          
    const badgeBg = `${badgeColor}1A`; // 10% opacity

    return (
      <View
        key={m.id}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.rowBetween}>
          <AppText weight="700" size={16}>
            {m.memberName}
          </AppText>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <AppText weight="700" size={11} color={badgeColor}>
              {m.score} / 100
            </AppText>
          </View>
        </View>
        
        <AppText size={13} color={colors.mutedForeground}>
          {m.memberPhone} · {m.gymName || "No branch"}
        </AppText>
        
        <AppText size={13} color={colors.mutedForeground}>
          Day {m.dayNumber} / {m.totalDays} · {m.status}
        </AppText>
        
        <View style={styles.actionsRow}>
          <AppText size={12} color={colors.mutedForeground}>
            Level:
          </AppText>
          {(["beginner", "intermediate", "advanced"] as const).map((l) => (
            <Pressable
              key={l}
              onPress={() => doAssign(m.memberPhone, l)}
              disabled={busyPhone === m.memberPhone || m.level === l}
              style={[
                styles.statusChip,
                {
                  borderColor: m.level === l ? colors.primary : colors.border,
                  backgroundColor: m.level === l ? "rgba(11,230,7,0.12)" : "transparent",
                  opacity: busyPhone === m.memberPhone ? 0.5 : 1,
                },
              ]}
            >
              <AppText
                size={11}
                weight="700"
                color={m.level === l ? colors.primary : colors.mutedForeground}
              >
                {l.toUpperCase()}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

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
        <View style={styles.rowBetween}>
          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
            <AppText weight="700" size={18}>
              Member Engagement
            </AppText>
          </Pressable>
        </View>
        
        {/* Enrol Form */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText weight="700" size={15}>
            Enrol member
          </AppText>
          
          {enrolError ? (
            <AppText size={13} color="#EF4444" style={{ marginBottom: 4 }}>
              {enrolError}
            </AppText>
          ) : null}
          
          <TextInput
            style={[styles.input, { backgroundColor: "#fff", color: "#000", borderColor: colors.border }]}
            placeholder="Phone number"
            placeholderTextColor="#777"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          
          <View style={styles.actionsRow}>
            {(["beginner", "intermediate", "advanced"] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLevel(l)}
                style={[
                  styles.statusChip,
                  {
                    borderColor: level === l ? colors.primary : colors.border,
                    backgroundColor: level === l ? "rgba(11,230,7,0.12)" : "transparent",
                  },
                ]}
              >
                <AppText
                  size={11}
                  weight="700"
                  color={level === l ? colors.primary : colors.mutedForeground}
                >
                  {l.toUpperCase()}
                </AppText>
              </Pressable>
            ))}
          </View>
          
          <Pressable
            onPress={() => doAssign(phone, level, true)}
            disabled={enrolBusy || !phone.trim()}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: pressed || enrolBusy || !phone.trim() ? 0.7 : 1 },
            ]}
          >
            {enrolBusy ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <AppText weight="700" size={14} color="#000">
                Enrol
              </AppText>
            )}
          </Pressable>
        </View>
        
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : rows.length === 0 ? (
          <AppText size={13} color={colors.mutedForeground}>
            No members enrolled in the engagement program yet.
          </AppText>
        ) : (
          <>
            {needsFollowUp.length > 0 && (
              <>
                <AppText weight="700" size={16} style={{ marginTop: 16 }}>
                  Needs follow-up
                </AppText>
                {needsFollowUp.map(renderCard)}
              </>
            )}
            
            {onTrack.length > 0 && (
              <>
                <AppText weight="700" size={16} style={{ marginTop: 16 }}>
                  On track
                </AppText>
                {onTrack.map(renderCard)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
