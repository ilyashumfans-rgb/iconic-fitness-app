import { useSignIn, useSSO } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
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
import { useGuest } from "@/hooks/useGuest";
import { openExternal, websiteUrl } from "@/lib/links";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { enterGuest, exitGuest } = useGuest();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const onSignIn = useCallback(async () => {
    setError(null);
    try {
      const { error: signInError } = await signIn.password({
        identifier: email.trim(),
        password,
      });
      if (signInError) {
        setError(clerkError(signInError));
        return;
      }
      if (signIn.status === "complete") {
        exitGuest();
        await signIn.finalize({ navigate: () => router.replace("/(tabs)") });
      } else {
        setError("Additional verification is required to sign in.");
      }
    } catch (err: unknown) {
      setError(clerkError(err));
    }
  }, [signIn, email, password, router, exitGuest]);

  const onGoogle = useCallback(async () => {
    if (googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        exitGuest();
        await setActive({
          session: createdSessionId,
          navigate: () => router.replace("/(tabs)"),
        });
      }
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, startSSOFlow, router, exitGuest]);

  const onContinueWithoutLogin = useCallback(() => {
    enterGuest();
    router.replace("/(tabs)");
  }, [enterGuest, router]);

  const scrim = colors.background;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Cinematic hero background */}
      <ImageBackground
        source={require("@/assets/images/auth-hero.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            "rgba(10,12,8,0.55)",
            "rgba(10,12,8,0.15)",
            "rgba(10,12,8,0.65)",
            scrim,
            scrim,
          ]}
          locations={[0, 0.28, 0.55, 0.82, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* Lime ambient accent */}
      <View pointerEvents="none" style={styles.ambientWrap}>
        <View style={[styles.ambient, { backgroundColor: colors.primary }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 44) + 20,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Brand logo */}
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/images/iconic-full-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* pushes the auth block to the bottom, letting the photo breathe */}
          <View style={styles.spacer} />

          {/* Headline */}
          <View style={styles.headingBlock}>
            <AppText
              size={12}
              weight="700"
              color={colors.primary}
              style={styles.eyebrow}
            >
              WELCOME BACK
            </AppText>
            <AppText size={34} weight="700" color="#FFFFFF" style={styles.headline}>
              Your iconic{"\n"}era starts here.
            </AppText>
          </View>

          {/* Auth form */}
          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
            />

            {error ? (
              <AppText size={13} color={colors.destructive}>
                {error}
              </AppText>
            ) : null}

            <Button
              label="Log in"
              onPress={onSignIn}
              loading={fetchStatus === "fetching"}
              size="lg"
            />

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <AppText size={11} weight="600" muted style={styles.dividerText}>
                OR CONTINUE WITH
              </AppText>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <Button
              label="Continue with Google"
              onPress={onGoogle}
              variant="secondary"
              icon="chrome"
              loading={googleLoading}
              size="lg"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <AppText muted size={14}>
              New here?{" "}
            </AppText>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable hitSlop={8}>
                <AppText weight="700" size={14} color={colors.primary}>
                  Create account
                </AppText>
              </Pressable>
            </Link>
          </View>

          <Pressable
            onPress={onContinueWithoutLogin}
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

          <Pressable
            onPress={() => void openExternal(websiteUrl)}
            hitSlop={8}
            style={styles.legal}
          >
            <AppText size={11} weight="600" color={colors.mutedForeground}>
              PRIVACY POLICY  ·  TERMS OF SERVICE
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function clerkError(err: unknown): string {
  const e = err as {
    errors?: { longMessage?: string; message?: string }[];
    message?: string;
  };
  return (
    e?.errors?.[0]?.longMessage ??
    e?.errors?.[0]?.message ??
    e?.message ??
    "Unable to sign in. Check your details."
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  ambientWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    pointerEvents: "none",
  },
  ambient: {
    position: "absolute",
    top: -160,
    width: 460,
    height: 460,
    borderRadius: 230,
    opacity: 0.1,
  },
  brandRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "62%", maxWidth: 240, aspectRatio: 1 },
  spacer: { flex: 1, minHeight: 160 },
  headingBlock: { marginBottom: 22 },
  eyebrow: { letterSpacing: 3, marginBottom: 10 },
  headline: { lineHeight: 38 },
  form: { gap: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerText: { letterSpacing: 1.5 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
    alignItems: "center",
  },
  skip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  legal: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingVertical: 8,
  },
});
