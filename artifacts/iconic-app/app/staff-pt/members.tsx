import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { MemberAvatar } from "@/components/MemberAvatar";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import {
  ptDashboardApi,
  useStaffNotificationPolling,
  type NewMembership,
  type PtMembership,
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

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function waLink(mobile: string): string {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return `https://wa.me/91${digits}`;
}

export default function StaffPtMembersScreen() {
  return (
    <ThemeContext.Provider value={FORCE_DARK}>
      <Content />
    </ThemeContext.Provider>
  );
}

type Tab = "active" | "expired";

function Content() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useStaffNotificationPolling(true);

  const [tab, setTab] = useState<Tab>("active");
  const [rows, setRows] = useState<PtMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [renewFor, setRenewFor] = useState<PtMembership | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await ptDashboardApi.members();
      setRows(data.rows);
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

  const markAttendance = useCallback(
    async (m: PtMembership) => {
      setBusyId(m.id);
      try {
        await ptDashboardApi.markAttendance(m.id);
        notify("Marked present", `${m.memberName} — session recorded for today.`);
      } catch (e) {
        notify("Could not mark", e instanceof Error ? e.message : "");
      } finally {
        setBusyId(null);
        void load();
      }
    },
    [load],
  );

  const setRenewal = useCallback(
    async (m: PtMembership, renewalStatus: "pending" | "renewed" | "lost") => {
      setBusyId(m.id);
      try {
        await ptDashboardApi.patchMember(m.id, { renewalStatus });
      } catch (e) {
        notify("Could not update", e instanceof Error ? e.message : "");
      } finally {
        setBusyId(null);
        void load();
      }
    },
    [load],
  );

  const shown = rows.filter((r) => r.status === tab);

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
              My PT Members
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setShowAdd((v) => !v)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name={showAdd ? "x" : "plus"} size={16} color="#000" />
            <AppText weight="700" size={13} color="#000">
              {showAdd ? "Close" : "Add member"}
            </AppText>
          </Pressable>
        </View>

        {showAdd ? (
          <MembershipForm
            title="New PT membership"
            onSubmit={async (body) => {
              await ptDashboardApi.createMember(body as NewMembership);
              setShowAdd(false);
              notify("Member added", "PT membership created.");
              void load();
            }}
          />
        ) : null}

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["active", "expired"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.chip,
                {
                  backgroundColor: tab === t ? colors.primary : colors.card,
                  borderColor: tab === t ? colors.primary : colors.border,
                },
              ]}
            >
              <AppText
                size={13}
                weight="700"
                color={tab === t ? "#000" : colors.mutedForeground}
              >
                {t === "active" ? "Active" : "Expired"} (
                {rows.filter((r) => r.status === t).length})
              </AppText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : shown.length === 0 ? (
          <AppText size={13} color={colors.mutedForeground}>
            No {tab} PT members yet.
          </AppText>
        ) : (
          shown.map((m) => (
            <View
              key={m.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <MemberAvatar name={m.memberName} avatarUrl={m.avatarUrl} size={38} />
                  <AppText weight="700" size={16}>
                    {m.memberName}
                  </AppText>
                </View>
                <AppText
                  size={11}
                  weight="700"
                  color={
                    m.status === "active"
                      ? m.daysLeft <= 7
                        ? "#f5b840"
                        : colors.primary
                      : "#ff6b6b"
                  }
                >
                  {m.status === "active"
                    ? m.daysLeft <= 7
                      ? `${m.daysLeft} DAYS LEFT`
                      : "ACTIVE"
                    : "EXPIRED"}
                </AppText>
              </View>
              <AppText size={13} color={colors.mutedForeground}>
                {m.mobile ? `${m.mobile} · ` : ""}
                {m.gymName || "No branch"}
                {m.membershipId ? ` · ID ${m.membershipId}` : ""}
              </AppText>
              <AppText size={13} color={colors.mutedForeground}>
                {m.packageName || `${m.originalSessions} sessions`} ·{" "}
                {inr(m.amountPaidInr)}
                {m.paymentStatus === "pending" ? " (payment pending)" : ""}
              </AppText>
              <AppText size={13} color={colors.mutedForeground}>
                {m.startDate} → {m.endDate} · day {m.daysCompleted}/
                {m.durationDays}
              </AppText>
              <AppText size={13}>
                Sessions left (auto):{" "}
                <AppText weight="700" color={colors.primary}>
                  {m.sessionsAvailable}
                </AppText>
                {"   "}Delivered:{" "}
                <AppText weight="700">{m.sessionsDelivered}</AppText>
                {m.lastSessionDate ? (
                  <AppText size={12} color={colors.mutedForeground}>
                    {"  "}(last {m.lastSessionDate})
                  </AppText>
                ) : null}
              </AppText>

              {/* Actions */}
              <View style={styles.actionsRow}>
                {m.status === "active" ? (
                  <SmallBtn
                    label={m.todayAttendance ? "Present ✓" : "Mark attendance"}
                    disabled={m.todayAttendance || busyId === m.id}
                    solid={!m.todayAttendance}
                    color={colors.primary}
                    onPress={() => markAttendance(m)}
                  />
                ) : null}
                {m.mobile ? (
                  <>
                    <SmallBtn
                      label="Call"
                      color={colors.primary}
                      onPress={() => void Linking.openURL(`tel:${m.mobile}`)}
                    />
                    <SmallBtn
                      label="WhatsApp"
                      color={colors.primary}
                      onPress={() => void Linking.openURL(waLink(m.mobile))}
                    />
                  </>
                ) : null}
                <SmallBtn
                  label="Renew"
                  color={colors.primary}
                  onPress={() => setRenewFor(renewFor?.id === m.id ? null : m)}
                />
              </View>

              {/* Renewal status */}
              <View style={styles.actionsRow}>
                <AppText size={12} color={colors.mutedForeground}>
                  Renewal:
                </AppText>
                {(["pending", "renewed", "lost"] as const).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setRenewal(m, s)}
                    disabled={busyId === m.id}
                    style={[
                      styles.statusChip,
                      {
                        borderColor:
                          m.renewalStatus === s ? colors.primary : colors.border,
                        backgroundColor:
                          m.renewalStatus === s ? "rgba(11,230,7,0.12)" : "transparent",
                      },
                    ]}
                  >
                    <AppText
                      size={11}
                      weight="700"
                      color={m.renewalStatus === s ? colors.primary : colors.mutedForeground}
                    >
                      {s.toUpperCase()}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {renewFor?.id === m.id ? (
                <MembershipForm
                  title={`Renew ${m.memberName}`}
                  initial={{
                    packageName: m.packageName,
                    durationDays: m.durationDays,
                    originalSessions: m.originalSessions,
                    amountPaidInr: m.amountPaidInr,
                  }}
                  hideIdentity
                  onSubmit={async (body) => {
                    await ptDashboardApi.renew(
                      m.id,
                      body as Omit<NewMembership, "memberName">,
                    );
                    setRenewFor(null);
                    notify("Renewed", `${m.memberName}'s PT was renewed.`);
                    void load();
                  }}
                />
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function SmallBtn({
  label,
  onPress,
  color,
  disabled,
  solid,
}: {
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
  solid?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.smallBtn,
        {
          backgroundColor: solid ? color : "transparent",
          borderColor: color,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppText weight="700" size={12} color={solid ? "#000" : color}>
        {label}
      </AppText>
    </Pressable>
  );
}

function MembershipForm({
  title,
  initial,
  hideIdentity,
  onSubmit,
}: {
  title: string;
  initial?: Partial<NewMembership>;
  hideIdentity?: boolean;
  onSubmit: (body: Partial<NewMembership>) => Promise<void>;
}) {
  const colors = useColors();
  const [memberName, setMemberName] = useState("");
  const [mobile, setMobile] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [packageName, setPackageName] = useState(initial?.packageName ?? "");
  const [durationDays, setDurationDays] = useState(
    String(initial?.durationDays ?? 30),
  );
  const [sessions, setSessions] = useState(String(initial?.originalSessions ?? 12));
  const [amount, setAmount] = useState(
    initial?.amountPaidInr ? String(initial.amountPaidInr) : "",
  );
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  const inputStyle = [
    styles.input,
    { backgroundColor: "#fff", color: "#000", borderColor: colors.border },
  ];

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({
        ...(hideIdentity ? {} : { memberName, mobile, membershipId }),
        packageName,
        durationDays: Number(durationDays),
        originalSessions: Number(sessions),
        amountPaidInr: Number(amount) || 0,
        paymentStatus: pending ? "pending" : "paid",
      });
    } catch (e) {
      notify("Could not save", e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <AppText weight="700" size={15}>
        {title}
      </AppText>
      {!hideIdentity ? (
        <>
          <TextInput
            style={inputStyle}
            placeholder="Member name"
            placeholderTextColor="#777"
            value={memberName}
            onChangeText={setMemberName}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[...inputStyle, { flex: 1 }]}
              placeholder="Mobile"
              placeholderTextColor="#777"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
            />
            <TextInput
              style={[...inputStyle, { flex: 1 }]}
              placeholder="Membership ID"
              placeholderTextColor="#777"
              value={membershipId}
              onChangeText={setMembershipId}
            />
          </View>
        </>
      ) : null}
      <TextInput
        style={inputStyle}
        placeholder="Package name (e.g. PT 1 Month)"
        placeholderTextColor="#777"
        value={packageName}
        onChangeText={setPackageName}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[...inputStyle, { flex: 1 }]}
          placeholder="Days (30/90/180)"
          placeholderTextColor="#777"
          keyboardType="numeric"
          value={durationDays}
          onChangeText={setDurationDays}
        />
        <TextInput
          style={[...inputStyle, { flex: 1 }]}
          placeholder="Sessions (12/36/72)"
          placeholderTextColor="#777"
          keyboardType="numeric"
          value={sessions}
          onChangeText={setSessions}
        />
      </View>
      <TextInput
        style={inputStyle}
        placeholder="Amount paid (₹)"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <Pressable
        onPress={() => setPending((v) => !v)}
        style={styles.actionsRow}
      >
        <Feather
          name={pending ? "check-square" : "square"}
          size={18}
          color={colors.primary}
        />
        <AppText size={13} color={colors.mutedForeground}>
          Payment still pending
        </AppText>
      </Pressable>
      <Pressable
        onPress={submit}
        disabled={busy}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: pressed || busy ? 0.7 : 1 },
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <AppText weight="700" size={14} color="#000">
            Save
          </AppText>
        )}
      </Pressable>
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  smallBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
