import { useClerk } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Chip, ChipRow, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import {
  ACTION_REMINDERS,
  areRemindersOn,
  cancelActionReminders,
  scheduleActionReminders,
} from "@/lib/notifications";

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
  { mode: "system", label: "System" },
];

function formatHour(h: number, m: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${display} ${period}`
    : `${display}:${String(m).padStart(2, "0")} ${period}`;
}

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useClerk();
  const { isGuest, exitGuest } = useGuest();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const queryClient = useQueryClient();

  const [reminderOn, setReminderOn] = useState(false);

  useEffect(() => {
    void areRemindersOn().then(setReminderOn);
  }, []);

  const onToggleReminder = async (value: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("Not available", "Reminders work on the mobile app.");
      return;
    }
    if (value) {
      const ok = await scheduleActionReminders();
      if (!ok) {
        Alert.alert(
          "Permission needed",
          "Enable notifications in your device settings to get reminders.",
        );
        return;
      }
      setReminderOn(true);
    } else {
      await cancelActionReminders();
      setReminderOn(false);
    }
  };

  const doSignOut = async () => {
    try {
      await signOut();
    } finally {
      exitGuest();
      queryClient.clear();
      router.replace("/(auth)/sign-in");
    }
  };

  const onLogIn = () => {
    exitGuest();
    router.replace("/(auth)/sign-in");
  };

  const onSignOut = () => {
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined"
          ? window.confirm("Are you sure you want to log out?")
          : true;
      if (ok) void doSignOut();
      return;
    }
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void doSignOut(),
      },
    ]);
  };

  return (
    <Screen>
      <SectionHeader title="More" />

      {/* Daily reminders */}
      <SectionHeader title="Daily reminders" />
      <Card style={{ gap: 14 }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <AppText weight="600" size={15}>
              Daily action reminders
            </AppText>
            <AppText muted size={13}>
              Gentle nudges through the day for water, meals, your workout,
              steps and sleep.
            </AppText>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={onToggleReminder}
            trackColor={{ true: colors.primary, false: colors.elevated }}
            thumbColor="#fff"
          />
        </View>
        {reminderOn ? (
          <View style={{ gap: 8 }}>
            {ACTION_REMINDERS.map((r) => (
              <View key={r.key} style={styles.reminderRow}>
                <AppText muted size={13} style={{ width: 76 }}>
                  {formatHour(r.hour, r.minute)}
                </AppText>
                <AppText size={13} style={{ flex: 1 }}>
                  {r.title}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {/* Appearance */}
      <SectionHeader title="Appearance" />
      <Card style={{ gap: 14 }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <AppText weight="600" size={15}>
              Theme
            </AppText>
            <AppText muted size={13}>
              Choose light, dark, or match your device.
            </AppText>
          </View>
        </View>
        <ChipRow>
          {THEME_OPTIONS.map((opt) => (
            <Chip
              key={opt.mode}
              label={opt.label}
              active={themeMode === opt.mode}
              onPress={() => setThemeMode(opt.mode)}
            />
          ))}
        </ChipRow>
      </Card>

      {/* Account */}
      <View style={{ marginTop: 28 }}>
        {isGuest ? (
          <Button
            label="Log in or create account"
            onPress={onLogIn}
            icon="log-in"
          />
        ) : (
          <Button
            label="Log out"
            onPress={onSignOut}
            variant="ghost"
            icon="log-out"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
