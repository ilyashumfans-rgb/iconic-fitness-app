import { useAuth, useClerk } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { getGetMeQueryKey, useGetMe, useGetMyReferralInfo, getGetMyReferralInfoQueryKey } from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Chip, ChipRow } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useAuthClientReset } from "@/hooks/useAuthClientReset";
import { useGuest } from "@/hooks/useGuest";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { resolveImageUrl } from "@/lib/images";

type MoreLink = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  action?: () => void;
  rightElement?: React.ReactNode;
  hideGuest?: boolean;
  highlighted?: boolean;
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

function ListRow({ item }: { item: MoreLink }) {
  const colors = useColors();

  if (item.highlighted && item.action) {
    return (
      <View style={{ marginTop: 16, marginBottom: 8 }}>
        <Button label={item.title} icon={item.icon} onPress={item.action} />
      </View>
    );
  }
  
  const content = (
    <>
      <View style={{ width: 28, alignItems: "center" }}>
        <Feather name={item.icon} size={20} color={colors.foreground} />
      </View>
      <View style={styles.listRowBody}>
        <AppText weight="500" size={16} color={colors.foreground}>
          {item.title}
        </AppText>
      </View>
      {item.rightElement ? (
        item.rightElement
      ) : (
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      )}
    </>
  );

  if (!item.action) {
    return (
      <View style={[styles.listRow, { borderBottomColor: colors.border }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={item.action}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.listRow,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.secondary },
      ]}
    >
      {content}
    </Pressable>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useClerk();
  const resetAuthClient = useAuthClientReset();
  const { isLoaded, isSignedIn } = useAuth();
  const { isGuest, exitGuest } = useGuest();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const queryClient = useQueryClient();

  const infoQuery = useGetMyReferralInfo({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyReferralInfoQueryKey(),
    },
  });
  const pointsAvailable = infoQuery.data?.balanceInr ?? 0;

  const isMember = !!isSignedIn && !isGuest;
  const meQuery = useGetMe({
    query: { enabled: isMember, queryKey: getGetMeQueryKey() },
  });

  const doSignOut = async () => {
    try {
      await signOut();
    } finally {
      exitGuest();
      queryClient.clear();
      resetAuthClient();
      router.replace("/(auth)/welcome");
    }
  };

  const onLogIn = () => {
    exitGuest();
    router.replace("/(auth)/welcome");
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

  const profileName = isMember ? (meQuery.data?.name || "Iconic Member") : "Guest User";
  const avatarUrl = isMember ? resolveImageUrl(meQuery.data?.avatarUrl) : null;
  const initials = profileName.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  const coreLinks: MoreLink[] = [
    { title: "My fitness journey", icon: "activity", action: () => router.push("/fitness-journey"), hideGuest: true },
    { title: "Connect watch", icon: "watch", action: () => router.push("/connect-watch") },
    { title: "Attendance", icon: "calendar", action: () => router.push("/attendance") },
    { title: "Scan gym QR", icon: "maximize", action: () => router.push("/check-in") },
    { title: "My Membership", icon: "award", action: () => router.push("/my-membership"), hideGuest: true },
    { title: "My Invoices", icon: "file-text", action: () => router.push("/invoices"), hideGuest: true },
    { title: "My Bookings", icon: "calendar", action: () => router.push("/classes?tab=mine") },
    { title: "My Progress", icon: "bar-chart-2", action: () => router.push("/progress") },
    { title: "45-Day Plan", icon: "calendar", action: () => router.push("/engagement-plan"), hideGuest: true },
    { title: "My Workout Plans", icon: "activity", action: () => router.push("/train") },
    { title: "Workouts", icon: "edit-3", action: () => router.push("/workouts") },
    { title: "My Nutrition", icon: "heart", action: () => router.push("/diet") },
    { title: "Notifications", icon: "bell", action: () => router.push("/notifications") },
    { title: "Help & Support", icon: "help-circle", action: () => router.push("/faq") },
    { title: "Staff Login", icon: "users", action: () => router.push("/staff-login") },
    isGuest
      ? { title: "Sign In / Create Account", icon: "log-in", action: onLogIn, highlighted: true }
      : { title: "Log Out", icon: "log-out", action: onSignOut },
  ];

  const extraLinks: MoreLink[] = [
    { title: "Branches", icon: "map-pin", action: () => router.push("/(tabs)/sports"), hideGuest: true },
    { title: "Orders & Tracking", icon: "package", action: () => router.push("/orders"), hideGuest: true },
    { 
      title: "Refer & Earn", 
      icon: "share-2", 
      action: () => router.push("/refer"),
      hideGuest: true,
      rightElement: (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText weight="600" size={14} color={colors.primary}>
            {infoQuery.isSuccess ? pointsAvailable.toLocaleString("en-IN") + " pts" : ""}
          </AppText>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </View>
      )
    },
    { title: "Complaint", icon: "alert-circle", action: () => router.push("/complaint"), hideGuest: true },
    { title: "Terms & Conditions", icon: "file-text", action: () => router.push("/terms") },
    { title: "Privacy Policy", icon: "shield", action: () => void openExternalURL("https://iconicfitnessindia.com/privacy") },
  ];

  const visibleCoreLinks = coreLinks.filter(l => !(l.hideGuest && isGuest));
  const visibleExtraLinks = extraLinks.filter(l => !(l.hideGuest && isGuest));

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }} padded={false}>
      {/* Top Header */}
      <View style={{
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <AppText weight="700" size={28} color={colors.foreground}>
          Profile
        </AppText>
        <Pressable
          onPress={() => router.push("/profile")}
          accessibilityLabel="Settings"
          accessibilityRole="button"
          style={({ pressed }) => [
            { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
            pressed && { backgroundColor: colors.secondary }
          ]}
        >
          <Feather name="settings" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Profile Info */}
      <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
        <View
          style={[
            {
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: colors.muted,
              alignItems: "center", justifyContent: "center",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            },
          ]}
        >
          {avatarUrl ? (
            <ExpoImage source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} contentFit="cover" />
          ) : isGuest ? (
            <Feather name="user" size={32} color={colors.mutedForeground} />
          ) : (
            <AppText weight="700" size={28} color={colors.primary}>
              {initials}
            </AppText>
          )}
        </View>

        <View style={{ marginLeft: 16, flex: 1 }}>
          <AppText weight="700" size={20} color={colors.foreground} style={{ marginBottom: 4 }}>
            {profileName}
          </AppText>
          {isMember && (
            <>
              <AppText size={15} color={colors.mutedForeground} style={{ marginBottom: 2 }}>
                Iconic Member
              </AppText>
              <AppText size={14} color={colors.mutedForeground}>
                Stronger Every Day
              </AppText>
            </>
          )}
        </View>
      </View>

      {/* Core Links */}
      {isMember && infoQuery.isSuccess ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Wallet, ${pointsAvailable.toLocaleString("en-IN")} points. Open store`}
          onPress={() => router.push("/(tabs)/store")}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            marginHorizontal: 20,
            marginBottom: 20,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            borderWidth: 1,
            borderRadius: 24,
            paddingLeft: 5,
            paddingRight: 12,
            backgroundColor: colors.card,
            borderColor: colors.primary + "55",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "22" }}>
            <Feather name="gift" size={16} color={colors.primary} />
          </View>
          <AppText weight="700" size={11} color={colors.mutedForeground}>WALLET</AppText>
          <AppText weight="700" size={14} color={colors.primary}>
            {pointsAvailable.toLocaleString("en-IN")} pts
          </AppText>
        </Pressable>
      ) : null}
      <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
        {visibleCoreLinks.map((link) => (
          <ListRow key={link.title} item={link} />
        ))}
      </View>

      {/* Extra Features & Settings */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <AppText weight="600" size={14} color={colors.mutedForeground} style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          More
        </AppText>
        {visibleExtraLinks.map((link) => (
          <ListRow key={link.title} item={link} />
        ))}
        
        {/* Theme Setting Row inline */}
        <View style={[styles.listRow, { borderBottomColor: colors.border, paddingVertical: 16, flexDirection: "column", alignItems: "flex-start", gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 28, alignItems: "center" }}>
              <Feather name="moon" size={20} color={colors.foreground} />
            </View>
            <View style={styles.listRowBody}>
              <AppText weight="500" size={16} color={colors.foreground}>
                Theme
              </AppText>
            </View>
          </View>
          <View style={{ paddingLeft: 40 }}>
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
        </View>
      </View>
      
      <AppText muted size={13} style={{ textAlign: "center", marginVertical: 24 }}>
        Version 1.0.0
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  listRowBody: {
    flex: 1,
    paddingHorizontal: 12,
  },
});

