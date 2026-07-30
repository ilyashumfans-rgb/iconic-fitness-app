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
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import {
  fetchLeads,
  LEAD_STATUSES,
  updateLead,
  type Lead,
  type LeadStatus,
} from "@/lib/staffLeads";

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

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#0BE607",
  contacted: "#4DA6FF",
  qualified: "#E8C56A",
  converted: "#0BE607",
  lost: "#FF6B6B",
};

export default function StaffLeadsScreen() {
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

  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Inline detail editor (one lead open at a time)
  const [openId, setOpenId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (status: LeadStatus | null) => {
    try {
      setLeads(await fetchLeads(status));
    } catch (e) {
      notify("Could not load leads", e instanceof Error ? e.message : "");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(filter);
  }, [filter, load]);

  const applyPatch = async (
    lead: Lead,
    patch: Partial<Pick<Lead, "status" | "notes">>,
  ) => {
    setSaving(true);
    try {
      const updated = await updateLead(lead.id, patch);
      setLeads((prev) =>
        prev
          .map((l) => (l.id === lead.id ? updated : l))
          // Keep a filtered view truthful: drop leads whose new status no
          // longer matches the active filter.
          .filter((l) => !filter || l.status === filter),
      );
      return true;
    } catch (e) {
      notify("Could not save", e instanceof Error ? e.message : "");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const renderLead = (lead: Lead) => {
    const open = openId === lead.id;
    const statusColor = STATUS_COLORS[lead.status] ?? colors.mutedForeground;
    const detailBits = [
      lead.planName && `Plan: ${lead.planName}`,
      lead.className && `Class: ${lead.className}`,
      lead.gymName,
      lead.preferredDate &&
        `Prefers ${lead.preferredDate}${lead.preferredTime ? ` ${lead.preferredTime}` : ""}`,
    ].filter(Boolean);
    return (
      <View
        key={lead.id}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: open ? colors.primary : colors.border },
        ]}
      >
        <Pressable
          onPress={() => {
            // Draft always re-seeds from the lead being opened so unsaved
            // text never bleeds between leads.
            setOpenId(open ? null : lead.id);
            setNotesDraft(open ? "" : lead.notes);
          }}
          style={{ gap: 6 }}
        >
          <View style={styles.rowBetween}>
            <AppText weight="700" size={16} style={{ flex: 1 }} numberOfLines={1}>
              {lead.name || "Lead"}
            </AppText>
            <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
              <AppText weight="700" size={11} color={statusColor}>
                {(STATUS_LABELS[lead.status] ?? lead.status).toUpperCase()}
              </AppText>
            </View>
          </View>
          <AppText size={13} color={colors.mutedForeground}>
            {lead.phone}
            {lead.city ? ` · ${lead.city}` : ""}
            {lead.createdAt ? ` · ${new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
          </AppText>
          {detailBits.length > 0 ? (
            <AppText size={13} color={colors.mutedForeground}>
              {detailBits.join(" · ")}
            </AppText>
          ) : null}
          {lead.message ? (
            <AppText size={13} color={colors.mutedForeground} numberOfLines={open ? undefined : 2}>
              “{lead.message}”
            </AppText>
          ) : null}
          {!open && lead.notes ? (
            <AppText size={12} color={colors.mutedForeground} numberOfLines={1}>
              📝 {lead.notes}
            </AppText>
          ) : null}
        </Pressable>

        {open ? (
          <View style={{ gap: 10, marginTop: 4 }}>
            {/* Quick call / WhatsApp */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() =>
                  void Linking.openURL(`tel:${lead.phone}`).catch(() =>
                    notify("Can't call from here", `Dial ${lead.phone} manually.`),
                  )
                }
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="phone" size={15} color="#000" />
                <AppText weight="700" size={13} color="#000">
                  Call
                </AppText>
              </Pressable>
              <Pressable
                onPress={() =>
                  void Linking.openURL(
                    `https://wa.me/91${lead.phone.replace(/\D/g, "").slice(-10)}`,
                  ).catch(() =>
                    notify("Can't open WhatsApp", `Message ${lead.phone} manually.`),
                  )
                }
                style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.border }]}
              >
                <Feather name="message-circle" size={15} color={colors.primary} />
                <AppText weight="700" size={13} color={colors.primary}>
                  WhatsApp
                </AppText>
              </Pressable>
            </View>

            {/* Status change */}
            <AppText weight="600" size={12} color={colors.mutedForeground}>
              Status
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LEAD_STATUSES.map((s) => (
                <Pressable
                  key={s}
                  disabled={saving}
                  onPress={() => void applyPatch(lead, { status: s })}
                  style={[
                    styles.statusChip,
                    {
                      borderColor: lead.status === s ? colors.primary : colors.border,
                      backgroundColor:
                        lead.status === s ? "rgba(11,230,7,0.12)" : "transparent",
                    },
                  ]}
                >
                  <AppText
                    weight="600"
                    size={12}
                    color={lead.status === s ? colors.primary : colors.mutedForeground}
                  >
                    {STATUS_LABELS[s]}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {/* Call notes */}
            <AppText weight="600" size={12} color={colors.mutedForeground}>
              Notes
            </AppText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: "#fff", color: "#000", borderColor: colors.border },
              ]}
              placeholder="Call notes — what did they say?"
              placeholderTextColor="#777"
              value={notesDraft}
              onChangeText={setNotesDraft}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                disabled={saving}
                onPress={async () => {
                  if (await applyPatch(lead, { notes: notesDraft })) {
                    notify("Saved", "Notes updated.");
                  }
                }}
                style={[
                  styles.actionBtn,
                  { flex: 1, backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <AppText weight="700" size={13} color="#000">
                    Save notes
                  </AppText>
                )}
              </Pressable>
              <Pressable
                onPress={() => setOpenId(null)}
                style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.border }]}
              >
                <AppText weight="700" size={13} color={colors.mutedForeground}>
                  Close
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : null}
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
              void load(filter);
            }}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <AppText weight="700" size={18}>
            Leads
          </AppText>
        </Pressable>

        <AppText size={13} color={colors.mutedForeground}>
          Tap a lead to call, change status, and write call notes.
        </AppText>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[null, ...LEAD_STATUSES].map((s) => (
              <Pressable
                key={s ?? "all"}
                onPress={() => setFilter(s)}
                style={[
                  styles.statusChip,
                  {
                    borderColor: filter === s ? colors.primary : colors.border,
                    backgroundColor:
                      filter === s ? "rgba(11,230,7,0.12)" : "transparent",
                  },
                ]}
              >
                <AppText
                  weight="600"
                  size={12}
                  color={filter === s ? colors.primary : colors.mutedForeground}
                >
                  {s ? STATUS_LABELS[s] : "All"}
                </AppText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : leads.length === 0 ? (
          <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 20 }}>
            No leads {filter ? `with status "${STATUS_LABELS[filter]}"` : "yet"}.
          </AppText>
        ) : (
          leads.map(renderLead)
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
    gap: 8,
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
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
});
