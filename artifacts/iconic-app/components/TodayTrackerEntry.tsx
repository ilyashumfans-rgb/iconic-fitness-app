import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { healthMetrics, healthStorageKey, useHealthDay } from "@/lib/manualHealth";

/** Manual daily readings are device-local and isolated by account. */
export function TodayTrackerEntry({
  metric, label, icon, value, owner,
  onMetricPress,
  quickAction,
}: {
  metric: string; label: string; icon: keyof typeof Feather.glyphMap;
  value: string; owner: string;
  /** Open the existing destination for a server-backed metric instead of the
   * device-local manual reading editor (for example, the hydration log). */
  onMetricPress?: () => void;
  /** A compact action rendered below the metric (used by the +250 ml water
   * action). It is intentionally separate from the metric press target. */
  quickAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
}) {
  const colors = useColors();
  const config = healthMetrics[metric];
  const day = useHealthDay();
  const storageKey = healthStorageKey(owner, day, metric);
  const [saved, setSaved] = useState<{ key: string; value: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reading = saved?.key === storageKey ? saved.value : null;
  useEffect(() => {
    let cancelled = false;
    setSaved(null);
    setOpen(false);
    AsyncStorage.getItem(storageKey).then(raw => {
      const n = raw === null ? NaN : Number(raw);
      if (!cancelled && Number.isFinite(n) && n >= 0 && n <= config.max &&
        (!config.integer || Number.isInteger(n))) setSaved({ key: storageKey, value: n });
    }).catch(() => {
      if (!cancelled) setError("Could not load your saved reading.");
    });
    return () => { cancelled = true; };
  }, [storageKey, config.max, config.integer]);
  const save = async () => {
    const n = Number(input.trim().replace(",", "."));
    if (!input.trim() || !Number.isFinite(n) || n < 0 || n > config.max ||
      (config.integer && !Number.isInteger(n))) {
      setError(`Enter ${config.integer ? "a whole number" : "a number"} from 0 to ${config.max} ${config.unit}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await AsyncStorage.setItem(storageKey, String(n));
      setSaved({ key: storageKey, value: n });
      setOpen(false);
    } catch {
      setError("Could not save. Please try again.");
    } finally { setBusy(false); }
  };
  const display = reading === null ? value : metric === "water"
    ? `${Number((reading / 1000).toFixed(2))} L`
    : `${reading.toLocaleString()}${metric === "steps" ? "" : ` ${config.unit}`}`;
  const openEntry = () => {
    if (onMetricPress) {
      onMetricPress();
      return;
    }
    setInput(reading === null ? "" : String(reading));
    setError("");
    setOpen(true);
  };
  return (
    <View style={[styles.container, { borderRightColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${display}`}
        onPress={openEntry}
        style={({ pressed }) => [styles.metricPressable, { opacity: pressed ? 0.62 : 1 }]}
      >
        <View style={styles.labelRow}>
          <AppText
            size={10}
            weight="700"
            color={colors.mutedForeground}
            style={styles.label}
          >
            {label.toUpperCase()}
          </AppText>
          <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
        </View>
        {!quickAction ? (
          <AppText size={16} weight="700" numberOfLines={1}>
            {display}
          </AppText>
        ) : null}
      </Pressable>
      {quickAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={quickAction.label}
          disabled={quickAction.disabled}
          onPress={quickAction.onPress}
          style={({ pressed }) => [
            styles.quickAction,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: quickAction.disabled || pressed ? 0.58 : 1,
            },
          ]}
        >
          <Feather name="plus" size={13} color={colors.foreground} />
          <AppText size={13} weight="700">
            {quickAction.label.replace(/^\+/, "")}
          </AppText>
        </Pressable>
      ) : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => !busy && setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#00000080", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 22, gap: 16 }}>
            <AppText size={20} weight="700">Add {label.toLowerCase()}</AppText>
            <AppText size={13} muted>Enter today’s {metric === "steps" || metric === "water" ? "total" : "reading"} in {config.unit}. Saved by date on this device for your Health Report. Editing replaces today’s reading.</AppText>
            <TextInput accessibilityLabel={`${label} in ${config.unit}`} value={input} onChangeText={setInput}
              keyboardType={config.integer ? "number-pad" : "decimal-pad"} autoFocus
              placeholder={config.unit} placeholderTextColor={colors.mutedForeground}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.foreground, fontSize: 18 }} />
            {error ? <AppText size={12} color={colors.foreground}>{error}</AppText> : null}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable disabled={busy} onPress={() => setOpen(false)} style={{ flex: 1, padding: 14, alignItems: "center" }}>
                <AppText weight="700">Cancel</AppText>
              </Pressable>
              <Pressable disabled={busy} onPress={() => void save()} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: "center" }}>
                <AppText weight="700" color="#071407">{busy ? "Saving…" : "Save"}</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 92,
    minHeight: 62,
    paddingHorizontal: 11,
    justifyContent: "center",
    gap: 7,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  metricPressable: {
    minHeight: 26,
    justifyContent: "center",
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  label: {
    letterSpacing: 1.1,
  },
  quickAction: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minHeight: 25,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});