import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetTrackingSummaryQueryKey,
  useGetGoals,
  useGetMe,
  useUpdateGoals,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Chip, ChipRow, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import {
  cancelDailyReminder,
  getReminderHour,
  scheduleDailyReminder,
} from "@/lib/notifications";

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
  { mode: "system", label: "System" },
];

const REMINDER_HOURS = [6, 7, 8, 12, 18, 19, 20];

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isGuest, exitGuest } = useGuest();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const queryClient = useQueryClient();

  const meQuery = useGetMe();
  const goalsQuery = useGetGoals();
  const updateGoals = useUpdateGoals();

  const [water, setWater] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [steps, setSteps] = useState("");
  const [weekly, setWeekly] = useState("");
  const [saving, setSaving] = useState(false);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderHour, setReminderHour] = useState(7);

  useEffect(() => {
    const g = goalsQuery.data;
    if (g) {
      setWater(String(g.waterGoalMl));
      setCalories(String(g.calorieGoal));
      setProtein(String(g.proteinGoalG));
      setSteps(String(g.stepGoal));
      setWeekly(String(g.weeklyGoal));
    }
  }, [goalsQuery.data]);

  useEffect(() => {
    void getReminderHour().then((h) => {
      if (h != null) {
        setReminderOn(true);
        setReminderHour(h);
      }
    });
  }, []);

  const onSaveGoals = async () => {
    setSaving(true);
    try {
      await updateGoals.mutateAsync({
        data: {
          waterGoalMl: Number(water) || 0,
          calorieGoal: Number(calories) || 0,
          proteinGoalG: Number(protein) || 0,
          stepGoal: Number(steps) || 0,
          weeklyGoal: Number(weekly) || 0,
        },
      });
      await queryClient.invalidateQueries({
        queryKey: getGetTrackingSummaryQueryKey(),
      });
      await goalsQuery.refetch();
      Alert.alert("Saved", "Your goals have been updated.");
    } catch {
      Alert.alert("Error", "Could not save your goals.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleReminder = async (value: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("Not available", "Reminders work on the mobile app.");
      return;
    }
    if (value) {
      const ok = await scheduleDailyReminder(reminderHour);
      if (!ok) {
        Alert.alert(
          "Permission needed",
          "Enable notifications in your device settings to get reminders.",
        );
        return;
      }
      setReminderOn(true);
    } else {
      await cancelDailyReminder();
      setReminderOn(false);
    }
  };

  const onPickHour = async (h: number) => {
    setReminderHour(h);
    if (reminderOn && Platform.OS !== "web") {
      await scheduleDailyReminder(h);
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
      { text: "Log out", style: "destructive", onPress: () => void doSignOut() },
    ]);
  };

  const me = meQuery.data;
  const name = user?.fullName ?? me?.name ?? "Athlete";
  const email =
    user?.primaryEmailAddress?.emailAddress ?? me?.email ?? "";

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }}>
      {/* Profile header */}
      <View style={styles.profileHead}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <AppText weight="700" size={28} color={colors.primaryForeground}>
            {name.charAt(0).toUpperCase()}
          </AppText>
        </View>
        <AppText weight="700" size={22} style={{ marginTop: 12 }}>
          {name}
        </AppText>
        {email ? (
          <AppText muted size={14}>
            {email}
          </AppText>
        ) : null}
      </View>

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

      {/* Goals */}
      <SectionHeader title="Daily goals" />
      <Card style={{ gap: 14 }}>
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field
              label="Water (ml)"
              value={water}
              onChangeText={setWater}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.half}>
            <Field
              label="Calories (kcal)"
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={styles.half}>
            <Field
              label="Protein (g)"
              value={protein}
              onChangeText={setProtein}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.half}>
            <Field
              label="Steps"
              value={steps}
              onChangeText={setSteps}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Field
          label="Workouts per week"
          value={weekly}
          onChangeText={setWeekly}
          keyboardType="number-pad"
        />
        <Button label="Save goals" onPress={onSaveGoals} loading={saving} />
      </Card>

      {/* Reminders */}
      <SectionHeader title="Daily reminder" />
      <Card style={{ gap: 14 }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <AppText weight="600" size={15}>
              Workout reminder
            </AppText>
            <AppText muted size={13}>
              A nudge to log your day and keep the streak.
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
          <View>
            <AppText muted size={13} style={{ marginBottom: 10 }}>
              Remind me at
            </AppText>
            <ChipRow>
              {REMINDER_HOURS.map((h) => (
                <Chip
                  key={h}
                  label={formatHour(h)}
                  active={h === reminderHour}
                  onPress={() => onPickHour(h)}
                />
              ))}
            </ChipRow>
          </View>
        ) : null}
      </Card>

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

function formatHour(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

const styles = StyleSheet.create({
  profileHead: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  row2: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
