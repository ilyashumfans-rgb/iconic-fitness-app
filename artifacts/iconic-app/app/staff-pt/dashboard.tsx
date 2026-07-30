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
import { MemberAvatar } from "@/components/MemberAvatar";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import {
  ptDashboardApi,
  staffPtApi,
  useStaffNotificationPolling,
  type PtProgram,
  type PtSummary,
} from "@/lib/staffPt";

const FORCE_DARK = {
  mode: "dark" as const,
  scheme: "dark" as const,
  setMode: () => {},
  toggle: () => {},
};

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

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
  const [month, setMonth] = useState<string>(months[0]?.value ?? "");
  const [data, setData] = useState<PtSummary | null>(null);
  const [programs, setPrograms] = useState<PtProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [summary, dash] = await Promise.all([
        ptDashboardApi.summary(m || undefined),
        staffPtApi.dashboard(m || undefined),
      ]);
      setData(summary);
      setPrograms(dash.programs);
    } catch {
      // keep last data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  const s = data?.summary;
  const t = data?.target;

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
        <View style={styles.rowBetween}>
          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
            <AppText weight="700" size={18}>
              PT Dashboard
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => router.push("/staff-pt/members")}
            style={[styles.membersBtn, { borderColor: colors.primary }]}
          >
            <Feather name="users" size={14} color={colors.primary} />
            <AppText weight="700" size={12} color={colors.primary}>
              My Members
            </AppText>
          </Pressable>
        </View>

        {/* Month filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {months.map((m) => {
              const active = month === m.value;
              return (
                <Pressable
                  key={m.value}
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

        {loading && !data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : s && t ? (
          <>
            {/* Alerts */}
            {(data?.alerts ?? []).length > 0 ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: "rgba(245,184,64,0.08)", borderColor: "#f5b840" },
                ]}
              >
                {(data?.alerts ?? []).slice(0, 6).map((a, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Feather
                      name={
                        a.kind === "incentive"
                          ? "award"
                          : a.kind === "payment"
                            ? "credit-card"
                            : a.kind === "target"
                              ? "target"
                              : "clock"
                      }
                      size={14}
                      color="#f5b840"
                    />
                    <AppText size={13} style={{ flex: 1 }}>
                      {a.message}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Summary grid */}
            <View style={styles.grid}>
              <Stat label="Active PT members" value={String(s.activeMembers)} colors={colors} accent />
              <Stat label="Expired members" value={String(s.expiredMembers)} colors={colors} />
              <Stat label="Revenue this month" value={inr(s.revenueMonthInr)} colors={colors} accent />
              <Stat label="Today's revenue" value={inr(s.revenueTodayInr)} colors={colors} />
              <Stat label="Today's PT sessions" value={String(s.todaysSessions)} colors={colors} />
              <Stat label="Pending renewals (7d)" value={String(s.pendingRenewals)} colors={colors} />
              <Stat label="Pending payments" value={inr(s.pendingPaymentsInr)} colors={colors} />
              <Stat label="Lost revenue" value={inr(s.lostRevenueInr)} colors={colors} />
              <Stat label="Yearly revenue" value={inr(s.revenueYearInr)} colors={colors} />
            </View>

            {/* Target & incentive */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <AppText weight="700" size={15}>
                  Monthly target
                </AppText>
                <AppText weight="700" size={15} color={colors.primary}>
                  {t.achievementPct}%
                </AppText>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: t.achievementPct >= 100 ? colors.primary : t.achievementPct >= 50 ? colors.primary : "#f5b840",
                      width: `${Math.min(100, t.achievementPct)}%`,
                    },
                  ]}
                />
              </View>
              <AppText size={13} color={colors.mutedForeground}>
                Sales {inr(t.salesInr)} of {inr(t.targetInr)} target
                {t.remainingTargetInr > 0 ? ` · ${inr(t.remainingTargetInr)} to go` : " · Target achieved! 🎉"}
              </AppText>
              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <View>
                  <AppText size={12} color={colors.mutedForeground}>
                    Incentive ({t.incentivePct}%)
                  </AppText>
                  <AppText weight="700" size={20} color={colors.primary}>
                    {inr(t.netIncentiveInr)}
                  </AppText>
                  {t.adjustmentsInr !== 0 ? (
                    <AppText size={11} color={colors.mutedForeground}>
                      {inr(t.grossIncentiveInr)} gross {t.adjustmentsInr > 0 ? "+" : ""}
                      {inr(t.adjustmentsInr)} adjustment
                    </AppText>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        t.approvalStatus === "approved"
                          ? "rgba(11,230,7,0.12)"
                          : "rgba(245,184,64,0.12)",
                    },
                  ]}
                >
                  <AppText
                    size={11}
                    weight="700"
                    color={t.approvalStatus === "approved" ? colors.primary : "#f5b840"}
                  >
                    {t.approvalStatus === "approved" ? "APPROVED" : "PENDING APPROVAL"}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Renewal radar */}
            {s.sevenDayExpiry.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <AppText weight="700" size={15}>
                  Expiring within 7 days
                </AppText>
                {s.sevenDayExpiry.map((r) => (
                  <View key={r.id} style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <AppText size={14} weight="600">
                        {r.memberName}
                      </AppText>
                      <AppText size={12} color={colors.mutedForeground}>
                        {r.daysLeft === 0 ? "Expires TODAY" : `${r.daysLeft} days left`} · {inr(r.amountPaidInr)}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => router.push("/staff-pt/members")}
                      style={[styles.membersBtn, { borderColor: colors.primary }]}
                    >
                      <AppText weight="700" size={12} color={colors.primary}>
                        Renew
                      </AppText>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Free kick-starter programs */}
            <AppText size={12} weight="700" color={colors.primary} style={styles.eyebrow}>
              FREE KICK-STARTER PROGRAMS
            </AppText>
            {programs.length === 0 ? (
              <AppText size={13} color={colors.mutedForeground}>
                No free-session programs this month.
              </AppText>
            ) : (
              programs.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/staff-pt/program/${p.id}`)}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                      <MemberAvatar name={p.memberName} avatarUrl={p.avatarUrl} size={36} />
                      <AppText weight="700" size={15}>
                        {p.memberName || "Member"}
                      </AppText>
                    </View>
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
                  <AppText size={12} color={colors.mutedForeground}>
                    Free sessions: {p.session1DoneAt ? "1 ✓" : "1 –"}{"  "}
                    {p.session2DoneAt ? "2 ✓" : "2 –"}
                  </AppText>
                </Pressable>
              ))
            )}
          </>
        ) : (
          <AppText size={13} color={colors.mutedForeground}>
            Could not load the dashboard. Pull to retry.
          </AppText>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: { card: string; border: string; primary: string; mutedForeground: string; foreground: string };
  accent?: boolean;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AppText weight="700" size={18} color={accent ? colors.primary : colors.foreground}>
        {value}
      </AppText>
      <AppText size={11} color={colors.mutedForeground}>
        {label}
      </AppText>
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
  membersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stat: {
    flexBasis: "30%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eyebrow: { letterSpacing: 2, marginTop: 6 },
});
