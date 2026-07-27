import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { ThemeContext } from "@/hooks/useTheme";

// Permanently dark, cinematic brand screen — matches the sign-in screen.
const FORCE_DARK = {
  mode: "dark" as const,
  scheme: "dark" as const,
  setMode: () => {},
  toggle: () => {},
};

export default function WelcomeScreen() {
  return (
    <ThemeContext.Provider value={FORCE_DARK}>
      <WelcomeContent />
    </ThemeContext.Provider>
  );
}

function WelcomeContent() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { enterGuest } = useGuest();

  const scrim = colors.background;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ImageBackground
        source={require("@/assets/images/auth-hero.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            "rgba(10,12,8,0.35)",
            "rgba(10,12,8,0.10)",
            "rgba(10,12,8,0.70)",
            scrim,
            scrim,
          ]}
          locations={[0, 0.22, 0.5, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 44) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        <Image
          source={require("@/assets/images/auth-full-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.bottom}>
          <AppText
            size={12}
            weight="700"
            color={colors.primary}
            style={styles.eyebrow}
          >
            HOW WOULD YOU LIKE TO CONTINUE?
          </AppText>

          {/* Membership login */}
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={styles.optionIconDark}>
              <Feather name="user" size={22} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <AppText weight="700" size={17} color="#0A0C08">
                Membership Login
              </AppText>
              <AppText size={13} color="rgba(10,12,8,0.7)">
                Members & guests — plans, classes, tracking
              </AppText>
            </View>
            <Feather name="arrow-right" size={20} color="#0A0C08" />
          </Pressable>

          {/* Studio login */}
          <Pressable
            onPress={() => router.push("/staff-login")}
            style={({ pressed }) => [
              styles.option,
              styles.optionOutline,
              {
                borderColor: colors.primary,
                backgroundColor: "rgba(10,12,8,0.55)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.optionIconLime,
                { backgroundColor: "rgba(11,230,7,0.12)" },
              ]}
            >
              <Feather name="briefcase" size={22} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <AppText weight="700" size={17} color={colors.foreground}>
                Studio Login
              </AppText>
              <AppText size={13} color={colors.mutedForeground}>
                Trainers, MCs & studio team
              </AppText>
            </View>
            <Feather name="arrow-right" size={20} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={() => {
              enterGuest();
              router.replace("/(tabs)");
            }}
            hitSlop={8}
            style={styles.skip}
          >
            <AppText weight="600" size={14} color={colors.mutedForeground}>
              Continue without login
            </AppText>
            <Feather
              name="arrow-right"
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  logo: {
    width: 230,
    height: 230,
    alignSelf: "center",
  },
  bottom: { marginTop: "auto", gap: 14 },
  eyebrow: { letterSpacing: 3, marginBottom: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionOutline: {
    borderWidth: 1.5,
  },
  optionIconDark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0A0C08",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconLime: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1, gap: 2 },
  skip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
});
