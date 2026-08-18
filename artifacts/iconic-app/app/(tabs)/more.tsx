import { useAuth, useClerk } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Chip, ChipRow, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { resolveImageUrl } from "@/lib/images";
import {
  ACTION_REMINDERS,
  areRemindersOn,
  cancelActionReminders,
  scheduleActionReminders,
} from "@/lib/notifications";

type MoreLink = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  action: () => void;
};

async function openExternalURL(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        "Cannot open link",
        "Your device is unable to open this link. Try visiting it in a browser.",
      );
    }
  } catch {
    Alert.alert("Error", "Failed to open the link. Please try again.");
  }
}

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

function ListGroup({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.listGroup,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

function ListRow({
  item,
  isLast,
}: {
  item: MoreLink;
  isLast?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={item.action}
      style={({ pressed }) => [
        styles.listRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        pressed && { backgroundColor: "rgba(255,255,255,0.03)" },
      ]}
    >
      <View style={[styles.listRowIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
        <Feather name={item.icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.listRowBody}>
        <AppText weight="600" size={15}>
          {item.title}
        </AppText>
        {item.subtitle ? (
          <AppText muted size={13} style={{ marginTop: 2 }}>
            {item.subtitle}
          </AppText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const { isGuest, exitGuest } = useGuest();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const queryClient = useQueryClient();

  const isMember = !!isSignedIn && !isGuest;
  const meQuery = useGetMe({
    query: { enabled: isMember, queryKey: getGetMeQueryKey() },
  });

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

  const tools: MoreLink[] = [
    { title: "Train", icon: "activity", action: () => router.push("/train") },
    { title: "Classes", icon: "calendar", action: () => router.push("/classes") },
    { title: "Progress", icon: "bar-chart-2", action: () => router.push("/progress") },
    ...(!isGuest ? [{ title: "Branches", icon: "map-pin", action: () => router.push("/(tabs)/sports") } as MoreLink] : []),
    ...(!isGuest ? [{ title: "Packages", icon: "gift", action: () => router.push("/(tabs)/packages") } as MoreLink] : []),
  ];

  const myInfoLinks: MoreLink[] = [
    { title: "Notifications", icon: "bell", action: () => router.push("/notifications") },
    ...(!isGuest ? [{ title: "Orders & Tracking", icon: "package", action: () => router.push("/orders") } as MoreLink] : []),
    ...(!isGuest ? [{ title: "Refer & Earn", icon: "share-2", action: () => router.push("/refer") } as MoreLink] : []),
  ];

  const supportLinks: MoreLink[] = [
    { title: "FAQs", icon: "help-circle", action: () => router.push("/faq") },
    ...(!isGuest ? [{ title: "Complaint", icon: "alert-circle", action: () => router.push("/complaint") } as MoreLink] : []),
  ];

  const legalLinks: MoreLink[] = [
    { title: "Terms & Conditions", icon: "file-text", action: () => router.push("/terms") },
    { title: "Privacy Policy", icon: "shield", action: () => void openExternalURL("https://iconicfitnessindia.com/privacy") },
  ];

  const profileName = isMember ? (meQuery.data?.name || "Iconic Member") : "Guest User";
  const avatarUrl = isMember ? resolveImageUrl(meQuery.data?.avatarUrl) : null;
  const initials = profileName.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.headerBar}>
        <AppText weight="700" size={24} style={{ letterSpacing: -0.5 }}>Me</AppText>
      </View>

      {/* Profile Card */}
      <Pressable 
        onPress={() => router.push("/profile")}
        style={({ pressed }) => [
          styles.profileCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && { opacity: 0.85 }
        ]}
      >
        {avatarUrl ? (
          <ExpoImage source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }]}>
            <AppText weight="700" size={20} color={colors.primary}>{initials}</AppText>
          </View>
        )}
        <View style={styles.profileMeta}>
          <AppText weight="700" size={20}>{profileName}</AppText>
          <AppText muted size={14} style={{ marginTop: 2 }}>View / Edit Profile</AppText>
        </View>
        <Feather name="chevron-right" size={24} color={colors.mutedForeground} />
      </Pressable>

      {/* Tools Grid */}
      <View style={{ marginTop: 24 }}>
        <SectionHeader title="Tools" />
        <View style={styles.toolsGrid}>
          {tools.map((tool) => (
            <Pressable 
              key={tool.title} 
              onPress={tool.action}
              style={({ pressed }) => [
                styles.toolItem,
                pressed && { opacity: 0.7 }
              ]}
            >
              <View style={[styles.toolIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name={tool.icon} size={22} color={colors.primary} />
              </View>
              <AppText size={12} weight="500" style={{ textAlign: "center", marginTop: 8 }}>{tool.title}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* My Information */}
      <View style={{ marginTop: 32 }}>
        <SectionHeader title="Your Information" />
        <ListGroup>
          {myInfoLinks.map((link, i) => (
            <ListRow key={link.title} item={link} isLast={i === myInfoLinks.length - 1} />
          ))}
        </ListGroup>
      </View>

      {/* App Settings (Reminders & Theme) */}
      <View style={{ marginTop: 32 }}>
        <SectionHeader title="App Settings" />
        <ListGroup>
          {/* Daily Reminders Toggle */}
          <View style={[styles.listRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <View style={[styles.listRowIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Feather name="clock" size={18} color={colors.primary} />
            </View>
            <View style={styles.listRowBody}>
              <AppText weight="600" size={15}>Daily action reminders</AppText>
              <AppText muted size={13} style={{ marginTop: 2 }}>Gentle nudges through the day</AppText>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={onToggleReminder}
              trackColor={{ true: colors.primary, false: colors.elevated }}
              thumbColor="#fff"
            />
          </View>
          {/* Active Reminders List */}
          {reminderOn ? (
            <View style={[styles.listRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 12 }]}>
              <View style={{ gap: 8, paddingLeft: 46, width: "100%" }}>
                {ACTION_REMINDERS.map((r) => (
                  <View key={r.key} style={{ flexDirection: "row", alignItems: "center" }}>
                    <AppText muted size={13} style={{ width: 66 }}>
                      {formatHour(r.hour, r.minute)}
                    </AppText>
                    <AppText size={13} muted>{r.title}</AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Theme */}
          <View style={styles.listRow}>
            <View style={[styles.listRowIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Feather name="moon" size={18} color={colors.primary} />
            </View>
            <View style={styles.listRowBody}>
              <AppText weight="600" size={15}>Theme</AppText>
              <AppText muted size={13} style={{ marginTop: 2 }}>Match your device or force dark mode</AppText>
            </View>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingLeft: 60 }}>
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
          </View>
        </ListGroup>
      </View>

      {/* Help & Support */}
      <View style={{ marginTop: 32 }}>
        <SectionHeader title="Help & Support" />
        <ListGroup>
          {supportLinks.map((link, i) => (
            <ListRow key={link.title} item={link} isLast={i === supportLinks.length - 1} />
          ))}
        </ListGroup>
      </View>

      {/* Legal */}
      <View style={{ marginTop: 32 }}>
        <SectionHeader title="Legal" />
        <ListGroup>
          {legalLinks.map((link, i) => (
            <ListRow key={link.title} item={link} isLast={i === legalLinks.length - 1} />
          ))}
        </ListGroup>
      </View>

      {/* Logout */}
      <View style={{ marginTop: 40, marginBottom: 20 }}>
        {isGuest ? (
          <Button label="Log in or create account" onPress={onLogIn} icon="log-in" />
        ) : (
          <Button label="Log out" onPress={onSignOut} variant="ghost" icon="log-out" />
        )}
        <AppText muted size={12} style={{ textAlign: "center", marginTop: 24 }}>
          Version 1.0.0
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileMeta: {
    flex: 1,
    paddingLeft: 16,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  toolItem: {
    width: "21%",
    alignItems: "center",
  },
  toolIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  listGroup: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowBody: {
    flex: 1,
    paddingHorizontal: 14,
  },
});
