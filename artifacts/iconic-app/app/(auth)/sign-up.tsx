import { useSignUp, useSSO } from "@clerk/expo";
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
import { MemberMobileVerify } from "@/components/MemberMobileVerify";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { exitGuest } = useGuest();

  const [stage, setStage] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const onCreate = useCallback(async () => {
    setError(null);
    try {
      const { error: signUpError } = await signUp.password({
        emailAddress: email.trim(),
        password,
      });
      if (signUpError) {
        setError(clerkError(signUpError));
        return;
      }
      await signUp.verifications.sendEmailCode();
      setStage("verify");
    } catch (err: unknown) {
      setError(clerkError(err));
    }
  }, [signUp, email, password]);

  const onVerify = useCallback(async () => {
    setError(null);
    try {
      await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (signUp.status === "complete") {
        if (name.trim()) {
          try {
            await signUp.update({ firstName: name.trim() });
          } catch {
            // Name is optional; ignore if the instance rejects it.
          }
        }
        exitGuest();
        await signUp.finalize({ navigate: () => router.replace("/(tabs)") });
      } else {
        setError("Invalid code. Please try again.");
      }
    } catch (err: unknown) {
      setError(clerkError(err));
    }
  }, [signUp, code, name, router]);

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
  }, [googleLoading, startSSOFlow, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="cover"
        />

        {stage === "form" ? (
          <>
            <AppText weight="700" size={32} style={{ marginTop: 24 }}>
              Join Iconic
            </AppText>
            <AppText muted size={15} style={{ marginBottom: 28 }}>
              Start tracking, training and winning.
            </AppText>

            <View style={styles.form}>
              {/* Gym members can pre-verify their registered mobile so their
                  YoActiv plan connects the moment the account is created. */}
              <MemberMobileVerify />

              <Field
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
              />
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
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete="password-new"
              />

              {error ? (
                <AppText size={13} color={colors.destructive}>
                  {error}
                </AppText>
              ) : null}

              <Button
                label="Create account"
                onPress={onCreate}
                loading={fetchStatus === "fetching"}
                size="lg"
              />

              <View style={styles.divider}>
                <View
                  style={[styles.line, { backgroundColor: colors.border }]}
                />
                <AppText size={12} muted>
                  OR
                </AppText>
                <View
                  style={[styles.line, { backgroundColor: colors.border }]}
                />
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

            <View style={styles.footer}>
              <AppText muted size={14}>
                Already a member?{" "}
              </AppText>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable hitSlop={8}>
                  <AppText weight="700" size={14} color={colors.primary}>
                    Log in
                  </AppText>
                </Pressable>
              </Link>
            </View>
          </>
        ) : (
          <>
            <AppText weight="700" size={32} style={{ marginTop: 24 }}>
              Check your email
            </AppText>
            <AppText muted size={15} style={{ marginBottom: 28 }}>
              We sent a 6-digit code to {email}.
            </AppText>

            <View style={styles.form}>
              <Field
                label="Verification code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />

              {error ? (
                <AppText size={13} color={colors.destructive}>
                  {error}
                </AppText>
              ) : null}

              <Button
                label="Verify & continue"
                onPress={onVerify}
                loading={fetchStatus === "fetching"}
                size="lg"
              />
              <Pressable
                onPress={() => signUp.verifications.sendEmailCode()}
                hitSlop={8}
              >
                <AppText muted size={13} style={{ textAlign: "center" }}>
                  Resend code
                </AppText>
              </Pressable>
            </View>
          </>
        )}

        {/* Required for Clerk bot sign-up protection */}
        <View nativeID="clerk-captcha" />
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
    "Something went wrong. Please try again."
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: "hidden",
  },
  form: { gap: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
    alignItems: "center",
  },
});
