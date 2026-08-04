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
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import {
  assessmentsApi,
  useStaffNotificationPolling,
  type AssessmentRow,
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

function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  const hn = Number(h);
  const hour12 = hn % 12 === 0 ? 12 : hn % 12;
  return `${hour12}:${m} ${hn >= 12 ? "PM" : "AM"}`;
}

export default function StaffAssessmentsScreen() {
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

  const [upcoming, setUpcoming] = useState<AssessmentRow[]>([]);
  const [recent, setRecent] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Inline record form (one open at a time)
  const [openId, setOpenId] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await assessmentsApi.roster();
      setUpcoming(data.upcoming);
      setRecent(data.recent);
    } catch (e) {
      notify("Could not load assessments", e instanceof Error ? e.message : "");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const record = async (row: AssessmentRow) => {
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) {
      notify("Missing values", "Enter a valid height (cm) and weight (kg).");
      return;
    }
    setSaving(true);
    try {
      await assessmentsApi.record(row.id, { heightCm: h, weightKg: w, note });
      setOpenId(null);
      setHeightCm("");
      setWeightKg("");
      setNote("");
      notify("Recorded", `Results saved for ${row.memberName}.`);
      await load();
    } catch (e) {
      notify("Could not save", e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (row: AssessmentRow, done: boolean) => (
    <View
      key={row.id}
      style={[styles.card, { backgroundColor: colors.card, borderColor: row.isToday && !done ? colors.primary : colors.border }]}
    >
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <MemberAvatar name={row.memberName} avatarUrl={row.avatarUrl} size={38} />
          <AppText weight="700" size={16}>
            {row.memberName || "Member"}
          </AppText>
        </View>
        {row.isToday && !done ? (
          <View style={[styles.badge, { backgroundColor: "rgba(11,230,7,0.12)" }]}>
            <AppText weight="700" size={11} color={colors.primary}>
              TODAY
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText size={13} color={colors.mutedForeground}>
        {row.memberPhone}
        {row.gymName ? ` · ${row.gymName}` : ""}
      </AppText>
      <AppText size={13} color={colors.mutedForeground}>
        {row.slotDate} · {fmtTime(row.slotTime)}
        {done && row.bmi?.bmi != null ? ` · BMI ${row.bmi.bmi}` : ""}
        {done && row.recordedBy ? ` · by ${row.recordedBy}` : ""}
      </AppText>

      {!done &&
        (openId === row.id ? (
          <View style={{ gap: 8, marginTop: 6 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: "#fff", color: "#000", borderColor: colors.border }]}
                placeholder="Height (cm)"
                placeholderTextColor="#777"
                keyboardType="numeric"
                value={heightCm}
                onChangeText={setHeightCm}
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: "#fff", color: "#000", borderColor: colors.border }]}
                placeholder="Weight (kg)"
                placeholderTextColor="#777"
                keyboardType="numeric"
                value={weightKg}
                onChangeText={setWeightKg}
              />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: "#fff", color: "#000", borderColor: colors.border }]}
              placeholder="Measurements / notes (optional)"
              placeholderTextColor="#777"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => record(row)}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { flex: 1, backgroundColor: colors.primary, opacity: pressed || saving ? 0.7 : 1 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <AppText weight="700" size={14} color="#000">
                    Save results
                  </AppText>
                )}
              </Pressable>
              <Pressable
                onPress={() => setOpenId(null)}
                style={[styles.saveBtn, { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 }]}
              >
                <AppText weight="700" size={14} color={colors.mutedForeground}>
                  Close
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setOpenId(row.id);
              setHeightCm("");
              setWeightKg("");
              setNote("");
            }}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1, marginTop: 4 },
            ]}
          >
            <AppText weight="700" size={14} color="#000">
              Record results
            </AppText>
          </Pressable>
        ))}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
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
            Fitness Assessments
          </AppText>
        </Pressable>

        <AppText size={13} color={colors.mutedForeground}>
          Early-morning empty-stomach assessments (BMI + measurements). Saving
          results creates a BMI record the member can see in the app.
        </AppText>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <AppText weight="700" size={16} style={{ marginTop: 8 }}>
              Upcoming
            </AppText>
            {upcoming.length === 0 ? (
              <AppText size={13} color={colors.mutedForeground}>
                No upcoming assessments booked.
              </AppText>
            ) : (
              upcoming.map((r) => renderRow(r, false))
            )}

            {recent.length > 0 && (
              <>
                <AppText weight="700" size={16} style={{ marginTop: 16 }}>
                  Completed
                </AppText>
                {recent.map((r) => renderRow(r, true))}
              </>
            )}
          </>
        )}
      </KeyboardAwareScrollViewCompat>
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
  },
});
