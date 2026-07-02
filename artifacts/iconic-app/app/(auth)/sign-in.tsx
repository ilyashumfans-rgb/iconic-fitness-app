import { useSignIn, useSSO } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
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

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Ambient brand glow behind the hero */}
      <View style={styles.ambientWrap}>
        <View
          style={[styles.ambient, { backgroundColor: colors.primary }]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Brand lockup */}
        <View style={styles.hero}>
          <View
            style={[styles.cardGlow, { backgroundColor: colors.primary }]}
          />
          <Image
            source={require("@/assets/images/iconic-lockup-clean.png")}
            style={styles.lockup}
            resizeMode="contain"
          />
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
  content: { paddingHorizontal: 24 },
  ambientWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    pointerEvents: "none",
  },
  ambient: {
    position: "absolute",
    top: -140,
    width: 460,
    height: 460,
    borderRadius: 230,
    opacity: 0.16,
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  cardGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.22,
  },
  lockup: { width: "78%", maxWidth: 300, aspectRatio: 1 },
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
