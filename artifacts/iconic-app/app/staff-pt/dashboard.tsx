import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
} from "@/lib/staffPt";

const FORCE_DARK = {
  mode: "dark" as const,
  scheme: "dark" as const,
  setMode: () => {},
  toggle: () => {},
};

/** Last 6 month options as { value: "YYYY-MM", label: "Jul 2026" }, IST. */
function monthOptions(): { value: string; label: string }[] {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    opts.push({ value, label });
  }
  return opts;
}

export default function StaffPtDashboardScreen() {
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

  const months = useMemo(monthOptions, []);
  const [month, setMonth] = useState<string>(""); // "" = all time
  const [counts, setCounts] = useState({ accepted: 0, ongoing: 0, completed: 0 });
  const [programs, setPrograms] = useState<PtProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const data = await staffPtApi.dashboard(m || undefined);
      setCounts(data.counts);
      setPrograms(data.programs);
    } catch {
      // keep last data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 44) + 8,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          paddingHorizontal: 20,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <AppText weight="700" size={18}>
            My PT Dashboard
          </AppText>
        </Pressable>

        {/* Month filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[{ value: "", label: "All time" }, ...months].map((m) => {
              const active = month === m.value;
              return (
                <Pressable
                  key={m.value || "all"}
                  onPress={() => setMonth(m.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    size={13}
                    weight="700"
                    color={active ? "#000" : colors.mutedForeground}
                  >
                    {m.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Counters */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard label="Ongoing" value={counts.ongoing + counts.accepted} color={colors.primary} bg={colors.card} border={colors.border} />
          <StatCard label="Completed" value={counts.completed} color={colors.foreground} bg={colors.card} border={colors.border} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : programs.length === 0 ? (
          <AppText size={13} color={colors.mutedForeground}>
            No programs {month ? "in this month" : "yet"}. Accept a request to
            get started.
          </AppText>
        ) : (
          programs.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/staff-pt/program/${p.id}`)}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.rowBetween}>
                <AppText weight="700" size={15}>
                  {p.memberName || "Member"}
                </AppText>
                <AppText
                  size={11}
                  weight="700"
                  color={
                    p.status === "ongoing"
                      ? colors.primary
                      : p.status === "completed"
                        ? colors.mutedForeground
                        : "#f5b840"
                  }
                >
                  {p.status.toUpperCase()}
                </AppText>
              </View>
              <AppText size={13} color={colors.mutedForeground}>
                {p.memberPhone ? `${p.memberPhone} · ` : ""}
                {p.gymName || "Any branch"}
              </AppText>
              <AppText size={12} color={colors.mutedForeground}>
                Free sessions: {p.session1DoneAt ? "1 ✓" : "1 –"}{"  "}
                {p.session2DoneAt ? "2 ✓" : "2 –"}
              </AppText>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
  border,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: bg, borderColor: border }]}>
      <AppText weight="700" size={26} color={color}>
        {value}
      </AppText>
      <AppText size={12} color="#9a9a9a">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 5,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
