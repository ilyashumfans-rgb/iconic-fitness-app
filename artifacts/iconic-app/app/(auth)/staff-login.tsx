import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import {
  saveStaffProfile,
  staffFetch,
  type StaffProfile,
} from "@/lib/staffSession";

const FORCE_DARK = {
  mode: "dark" as const,
  scheme: "dark" as const,
  setMode: () => {},
  toggle: () => {},
};

export default function StaffLoginScreen() {
  return (
    <ThemeContext.Provider value={FORCE_DARK}>
      <StaffLoginContent />
    </ThemeContext.Provider>
  );
}

function StaffLoginContent() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onLogin = useCallback(async () => {
    setError(null);
    const address = email.trim();
    if (!address.includes("@") || !password) {
      setError("Enter your staff email and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await staffFetch("/staff/login", {
        method: "POST",
        body: JSON.stringify({ email: address, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Invalid credentials");
        return;
      }
      const profile = (await res.json()) as StaffProfile;
      await saveStaffProfile(profile);
      router.replace("/staff-home");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }, [email, password, router]);

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

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 44) + 8,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(auth)/welcome");
            }}
            hitSlop={12}
            style={styles.back}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>

          <Image
            source={require("@/assets/images/auth-full-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.form}>
            <AppText
              size={12}
              weight="700"
              color={colors.primary}
              style={styles.eyebrow}
            >
              STUDIO LOGIN
            </AppText>
            <AppText size={14} color={colors.mutedForeground}>
              For trainers, MCs and the studio team. Sign in with the staff
              account credentials given to you.
            </AppText>

            <Field
              label="Staff email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@studio.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              autoCapitalize="none"
              secureTextEntry
            />

            {error ? (
              <AppText size={13} color={colors.destructive}>
                {error}
              </AppText>
            ) : null}

            <Button
              label="Log in to studio"
              onPress={onLogin}
              loading={busy}
              size="lg"
            />

            <Pressable
              onPress={() => router.replace("/(auth)/sign-in")}
              hitSlop={8}
              style={styles.switch}
            >
              <AppText weight="600" size={14} color={colors.mutedForeground}>
                Not staff? Membership login
              </AppText>
              <Feather
                name="arrow-right"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10,12,8,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 190,
    height: 190,
    alignSelf: "center",
  },
  eyebrow: { letterSpacing: 4, marginBottom: 2 },
  form: { gap: 16, marginTop: "auto", paddingTop: 24, paddingBottom: 12 },
  switch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
});
