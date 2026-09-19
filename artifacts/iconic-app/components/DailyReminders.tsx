import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import {
  ACTION_REMINDERS,
  areRemindersOn,
  cancelActionReminders,
  scheduleActionReminders,
} from "@/lib/notifications";

function formatHour(h: number, m: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${display} ${period}`
    : `${display}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Account-scoped daily reminder preferences and the schedule delivered by the
 * native app. A missing preference remains the existing default: reminders on.
 */
export function DailyReminders({ accountId }: { accountId: string }) {
  const colors = useColors();
  const [reminderOn, setReminderOn] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(true);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReminderLoading(true);
    setReminderError(null);
    void areRemindersOn(accountId)
      .then((enabled) => {
        if (active) setReminderOn(enabled);
      })
      .catch(() => {
        if (active) {
          setReminderError("Could not load reminder preferences.");
        }
      })
      .finally(() => {
        if (active) setReminderLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accountId]);

  const onToggleReminder = async (value: boolean) => {
    if (reminderLoading || reminderBusy) return;
    setReminderBusy(true);
    setReminderError(null);
    try {
      if (value) {
        const ok = await scheduleActionReminders(accountId);
        if (!ok) {
          const message =
            "Enable notifications in your device settings to get reminders.";
          setReminderError(message);
          Alert.alert("Permission needed", message);
          return;
        }
        setReminderOn(true);
      } else {
        await cancelActionReminders(accountId);
        setReminderOn(false);
      }
    } catch {
      const message = "Could not update reminders. Please try again.";
      setReminderError(message);
      Alert.alert("Error", message);
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.listRow, { borderBottomColor: colors.border }]}>
        <View style={styles.icon}>
          <Feather name="droplet" size={20} color={colors.foreground} />
        </View>
        <View style={styles.listRowBody}>
          <AppText weight="500" size={16} color={colors.foreground}>
            Daily Reminders
          </AppText>
        </View>
        <Switch
          value={reminderOn}
          onValueChange={onToggleReminder}
          disabled={reminderLoading || reminderBusy}
          testID="daily-reminders-toggle"
          trackColor={{ true: colors.primary, false: colors.elevated }}
          thumbColor="#fff"
          accessibilityLabel="Toggle daily reminders"
        />
      </View>

      {reminderOn ? (
        <View
          style={[
            styles.schedule,
            {
              borderBottomColor: colors.border,
            },
          ]}
        >
          {ACTION_REMINDERS.map((r) => (
            <View key={r.key} style={styles.reminderRow}>
              <AppText muted size={13} style={styles.time}>
                {formatHour(r.hour, r.minute)}
              </AppText>
              <AppText size={13} muted>
                {r.title}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.explanatoryText}>
        <AppText muted size={12}>
          {Platform.OS === "web"
            ? "Preference saved here. Reminders are delivered by the mobile app only."
            : reminderBusy
              ? "Updating reminder schedule…"
              : reminderError ??
                "Delivered by this device when notifications are allowed."}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  icon: {
    width: 28,
    alignItems: "center",
  },
  listRowBody: {
    flex: 1,
    paddingHorizontal: 12,
  },
  schedule: {
    paddingLeft: 40,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  explanatoryText: {
    paddingLeft: 40,
    paddingTop: 8,
    paddingBottom: 4,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  time: {
    width: 66,
  },
});