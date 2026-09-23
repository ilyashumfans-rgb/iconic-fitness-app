import { useAuth, useClerk, useSignIn, useSignUp, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useCompleteWhatsappOtp } from "@workspace/api-client-react";
import { Redirect, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { setPendingWhatsappSignup, usePendingWhatsappSignup } from "@/lib/pendingWhatsappSignup";
import { maskMobile } from "@/lib/whatsappOtp";

function message(error: unknown) {
  const e = error as { data?: { error?: string }; errors?: { longMessage?: string; message?: string }[]; message?: string };
  return e?.data?.error ?? e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Could not complete account setup. Please try again.";
}

/**
 * Stays mounted across Clerk activation: the authenticated link is an explicit,
 * retryable step, not a navigation side effect or a best-effort background job.
 */
export default function WhatsappSetupScreen() {
  const pending = usePendingWhatsappSignup();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();
  const { exitGuest } = useGuest();
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bearer = useRef<string | null>(null);
  const complete = useCompleteWhatsappOtp({
    mutation: { gcTime: 0 },
    request: { get headers(): Record<string, string> { return bearer.current ? { Authorization: `Bearer ${bearer.current}` } : {}; } },
  });
  const [stage, setStage] = useState<"details" | "verify" | "existing" | "existing-code">(
    pending?.requiresAccountSignIn ? "existing" : "details",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [emailResendAt, setEmailResendAt] = useState(0);

  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try { await action(); } catch (err) { setError(message(err)); }
    finally { locked.current = false; setBusy(false); }
  }

  async function create() {
    if (name.trim().length < 2) throw new Error("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Enter a valid email address.");
    if (password.length < 8) throw new Error("Choose a password with at least 8 characters.");
    const result = await signUp.password({ emailAddress: email.trim(), password });
    if (result.error) throw result.error;
    const updated = await signUp.update({ firstName: name.trim() });
    if (updated.error) throw updated.error;
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) throw sent.error;
    setPassword("");
    setEmailResendAt(Date.now() + 60_000);
    setStage("verify");
  }

  async function verifyEmail() {
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit email verification code.");
    const checked = await signUp.verifications.verifyEmailCode({ code });
    if (checked.error) throw checked.error;
    if (signUp.status !== "complete") throw new Error("Your account needs additional details. Please check your email and try again.");
    const activated = await signUp.finalize({ navigate: () => {} });
    if (activated.error) throw activated.error;
    setCode("");
  }

  async function existingLogin() {
    const result = await signIn.password({ identifier: email.trim(), password });
    if (result.error) throw result.error;
    if (signIn.status !== "complete") throw new Error("Additional account verification is required. Please use the usual login and then verify WhatsApp again.");
    const activated = await signIn.finalize({ navigate: () => {} });
    if (activated.error) throw activated.error;
    setPassword("");
  }

  async function sendExistingEmailCode() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Enter your registered email address.");
    if (Date.now() < emailResendAt) throw new Error("Please wait 60 seconds before requesting another email code.");
    const sent = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
    if (sent.error) throw sent.error;
    setEmailResendAt(Date.now() + 60_000);
    setPassword("");
    setCode("");
    setStage("existing-code");
  }

  async function verifyExistingEmailCode() {
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit email verification code.");
    const checked = await signIn.emailCode.verifyCode({ code });
    if (checked.error) throw checked.error;
    if (signIn.status !== "complete") throw new Error("Additional account verification is required. Please use your usual sign-in method.");
    const activated = await signIn.finalize({ navigate: () => {} });
    if (activated.error) throw activated.error;
    setCode("");
  }

  async function link() {
    if (!pending) return;
    // Explicit bearer avoids racing the root auth bridge's session re-render.
    bearer.current = await getToken({ skipCache: true });
    if (!bearer.current) throw new Error("Your session is not ready. Please try again.");
    try {
      await complete.mutateAsync({ data: { continuationToken: pending.continuationToken } });
    } finally {
      bearer.current = null;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    exitGuest();
    setPendingWhatsappSignup(null);
    // The server-owned FitnessSetupGate decides whether this account still
    // needs onboarding. Linking a phone must not force an existing member
    // through a fresh setup, even when the OTP began as a "new phone" flow.
    router.replace("/(tabs)");
  }

  async function cancel() {
    if (isSignedIn) await signOut();
    else {
      await signUp.reset();
      await signIn.reset();
    }
    bearer.current = null;
    setPendingWhatsappSignup(null);
    router.replace("/(auth)/welcome");
  }

  if (!isLoaded) return null;
  if (!pending) return <Redirect href={isSignedIn ? "/(tabs)" : "/(auth)/welcome"} />;

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppText muted size={12}>{pending.requiresAccountSignIn ? "ONE-TIME ACCOUNT CONFIRMATION" : "ONE-TIME ACCOUNT SETUP"}</AppText>
      <AppText weight="700" size={27}>{isSignedIn ? "Confirm your registered mobile" : stage === "verify" || stage === "existing-code" ? "Verify your email" : stage === "existing" ? "Use your existing account" : "Let’s get to know you"}</AppText>
      <AppText muted>WhatsApp verified: {maskMobile(pending.mobile)}</AppText>
      <AppText muted size={14}>
        {isSignedIn
          ? "Confirm that you want to register this verified mobile to the account you just signed in to. A different registered mobile cannot be overwritten."
          : pending.requiresAccountSignIn
            ? "Your mobile matches existing account records. Sign in to the member account you want to use, then confirm this number. Your accounts and fitness history will not be merged. Future OTP logins will use the confirmed account."
            : "Your first account needs an email and password for secure recovery. After this one-time setup, use WhatsApp codes to log in."}
      </AppText>
      <View style={styles.form}>
        {isSignedIn ? (
          <>
            <AppText size={14}>Account: {user?.primaryEmailAddress?.emailAddress ?? "Your signed-in account"}</AppText>
            <Button label="Confirm mobile & continue" disabled={busy} loading={busy} onPress={() => void run(link)} />
            <Button label="Use a different account" variant="ghost" disabled={busy} onPress={() => void run(async () => {
              await signOut();
              setPassword("");
              setCode("");
              setStage("existing");
            })} />
          </>
        ) : stage === "verify" || stage === "existing-code" ? (
          <>
            <Field label="Email verification code" accessibilityLabel="6-digit email verification code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} editable={!busy} />
            <Button label="Verify email" disabled={busy} loading={busy} onPress={() => void run(stage === "existing-code" ? verifyExistingEmailCode : verifyEmail)} />
            <Button label="Resend email code" variant="ghost" disabled={busy} onPress={() => void run(async () => {
              if (stage === "existing-code") { await sendExistingEmailCode(); return; }
              if (Date.now() < emailResendAt) throw new Error("Please wait 60 seconds before requesting another email code.");
              const sent = await signUp.verifications.sendEmailCode();
              if (sent.error) throw sent.error;
              setEmailResendAt(Date.now() + 60_000);
            })} />
            {stage === "existing-code" ? <Button label="Use another email or password" variant="ghost" disabled={busy} onPress={() => void run(async () => {
              await signIn.reset();
              setCode("");
              setStage("existing");
            })} /> : null}
          </>
        ) : (
          <>
            {stage === "details" ? <Field label="Full name" accessibilityLabel="Full name" value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" editable={!busy} /> : null}
            <Field label="Email" accessibilityLabel="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" editable={!busy} />
            <Field label="Password" accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
            <Button label={stage === "existing" ? "Sign in to existing account" : "Create account & send email code"} disabled={busy} loading={busy} onPress={() => void run(stage === "existing" ? existingLogin : create)} />
            {stage === "existing" ? <Button label="Email me a login code instead" variant="ghost" disabled={busy} onPress={() => void run(sendExistingEmailCode)} /> : null}
            {!pending.requiresAccountSignIn ? <Button label={stage === "existing" ? "Create a new account instead" : "Already have an email account? Sign in"} variant="ghost" disabled={busy} onPress={() => void run(async () => {
              await signUp.reset();
              await signIn.reset();
              setStage(stage === "existing" ? "details" : "existing");
            })} /> : null}
          </>
        )}
        {error ? <AppText accessibilityRole="alert" accessibilityLiveRegion="polite" color={colors.destructive}>{error}</AppText> : null}
        <AppText muted size={12}>If your verification expires, cancel and request a new WhatsApp code. Your account is kept; choose “Already have an email account?” next time.</AppText>
        <Button label={isSignedIn ? "Cancel & sign out" : "Cancel setup"} variant="ghost" disabled={busy} onPress={() => void run(cancel)} />
        <View nativeID="clerk-captcha" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: 16, paddingTop: 24 }, form: { gap: 14 } });