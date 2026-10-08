import { useSignIn } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useRequestWhatsappOtp, useVerifyWhatsappOtp } from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import {
  maskMobile,
  normalizeIndianMobile,
  OtpAttempt,
  OtpAutoSubmit,
  secondsRemaining,
} from "@/lib/whatsappOtp";
import { setPendingWhatsappSignup } from "@/lib/pendingWhatsappSignup";

function errorText(error: unknown): string {
  const e = error as {
    data?: { error?: string }; body?: { error?: string };
    errors?: { longMessage?: string; message?: string }[]; message?: string;
  };
  return e?.data?.error ?? e?.body?.error ?? e?.errors?.[0]?.longMessage ??
    e?.errors?.[0]?.message ?? e?.message ?? "Unable to continue. Please try again.";
}

/** Shared by full-screen login and the welcome modal; never persists codes or tickets. */
export function WhatsappOtpForm({ onComplete, onBusyChange }: {
  onComplete: (isNewUser: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const colors = useColors();
  const { signIn } = useSignIn();
  const { exitGuest } = useGuest();
  const queryClient = useQueryClient();
  const attempt = useRef(new OtpAttempt()).current;
  const autoSubmit = useRef(new OtpAutoSubmit()).current;
  const requestOptions = { get signal() { return attempt.signal; } };
  const request = useRequestWhatsappOtp({ request: requestOptions, mutation: { gcTime: 0 } });
  const verify = useVerifyWhatsappOtp({ request: requestOptions, mutation: { gcTime: 0 } });
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{
    id: string; mobile: string; expiresAt: number; resendAt: number;
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const remaining = challenge ? secondsRemaining(challenge.expiresAt, now) : 0;
  const resendIn = challenge ? secondsRemaining(challenge.resendAt, now) : 0;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener("change", () => setNow(Date.now()));
    return () => {
      attempt.cancel();
      clearInterval(timer);
      subscription.remove();
    };
  }, [attempt]);

  function pending(value: boolean) {
    busyRef.current = value;
    setBusy(value);
    onBusyChange?.(value);
  }

  async function send() {
    if (busyRef.current || (challenge && Date.now() < challenge.resendAt)) return;
    const normalized = normalizeIndianMobile(mobile);
    if (!normalized) {
      setError("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
      return;
    }
    const current = attempt.begin();
    pending(true);
    setError(null);
    setCode("");
    // An older code must never be submitted while a replacement is requested.
    setChallenge(null);
    try {
      const result = await request.mutateAsync({ data: { mobile: normalized } });
      if (!current()) return;
      const receivedAt = Date.now();
      setNow(receivedAt);
      setChallenge({
        id: result.challengeId, mobile: normalized,
        expiresAt: receivedAt + result.expiresInSeconds * 1000,
        resendAt: receivedAt + result.resendAfterSeconds * 1000,
      });
    } catch (err) {
      if (current()) setError(errorText(err));
    } finally {
      if (current()) pending(false);
    }
  }

  async function submit(submittedCode = code) {
    if (busyRef.current || !challenge) return;
    if (Date.now() >= challenge.expiresAt) {
      setError("This code has expired. Request a new code.");
      return;
    }
    if (!/^\d{6}$/.test(submittedCode)) {
      setError("Enter the 6-digit code from WhatsApp.");
      return;
    }
    const current = attempt.begin();
    pending(true);
    setError(null);
    try {
      const result = await verify.mutateAsync({
        data: { challengeId: challenge.id, code: submittedCode },
      });
      if (!current()) return;
      setCode("");
      if (result.isNewUser) {
        setPendingWhatsappSignup({
          continuationToken: result.continuationToken,
          mobile: challenge.mobile,
          requiresAccountSignIn: result.requiresAccountSignIn,
        });
        onComplete(true);
        return;
      }
      if (!result.ticket) throw new Error("Unable to finish sign-in. Please request a new code.");
      if (signIn.status !== null) {
        await signIn.reset();
        if (!current()) return;
      }
      const { error: ticketError } = await signIn.create({ strategy: "ticket", ticket: result.ticket });
      if (!current()) return;
      if (ticketError) throw ticketError;
      if (signIn.status !== "complete") throw new Error("Additional verification is required. Please try another sign-in method.");
      await queryClient.cancelQueries();
      if (!current()) return;
      queryClient.clear();
      const { error: finalizeError } = await signIn.finalize({
        navigate: () => {
          if (!current()) return;
          exitGuest();
          onComplete(result.isNewUser);
        },
      });
      if (finalizeError) throw finalizeError;
    } catch (err) {
      if (current()) setError(errorText(err));
    } finally {
      if (current()) pending(false);
    }
  }

  function changeNumber() {
    attempt.cancel();
    pending(false);
    setChallenge(null);
    setCode("");
    setError(null);
  }

  function changeCode(value: string) {
    const nextCode = value.replace(/\D/g, "").slice(0, 6);
    setCode(nextCode);
    if (
      challenge &&
      Date.now() < challenge.expiresAt &&
      autoSubmit.claim(challenge.id, nextCode)
    ) {
      void submit(nextCode);
    }
  }

  return (
    <View style={styles.form}>
      {challenge ? (
        <>
          <AppText size={13}>Code sent on WhatsApp to <AppText size={13} weight="700">{maskMobile(challenge.mobile)}</AppText></AppText>
          <Field
            label="WhatsApp code" accessibilityLabel="6-digit WhatsApp verification code"
            value={code} onChangeText={changeCode}
            placeholder="6-digit code" keyboardType="number-pad" autoComplete="one-time-code"
            textContentType="oneTimeCode" maxLength={6} editable={!busy && remaining > 0}
            onSubmitEditing={() => void submit()}
          />
          <AppText muted size={12}>
            {remaining > 0 ? `Code expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Code expired. Request a new one."}
          </AppText>
          <Button size="md" label="Verify & continue" onPress={() => void submit()} loading={busy} disabled={busy || remaining === 0 || code.length !== 6} />
          <Button label={resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"} variant="secondary" size="sm" onPress={() => void send()} disabled={busy || resendIn > 0} />
          <Button label="Change number" variant="ghost" size="sm" onPress={changeNumber} disabled={busy} />
        </>
      ) : (
        <>
          <AppText weight="600" size={13} muted>WhatsApp mobile number</AppText>
          <View style={styles.phoneRow}>
            <View accessible accessibilityLabel="Country code India plus 91"
              style={[styles.prefix, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <AppText weight="700" size={14}>+91</AppText>
            </View>
            <View style={styles.phoneField}>
          <Field accessibilityLabel="WhatsApp mobile number, India plus 91"
            value={mobile} onChangeText={setMobile} placeholder="98765 43210"
            keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
            editable={!busy} maxLength={16} onSubmitEditing={() => void send()} />
            </View>
          </View>
          <AppText muted size={12}>10-digit Indian number. Code is valid for 10 minutes. Linked to several accounts? We’ll help you pick one.</AppText>
          <Button size="md" label="Send WhatsApp code" loading={busy} disabled={busy} onPress={() => void send()} />
        </>
      )}
      {error ? <AppText accessibilityRole="alert" accessibilityLiveRegion="polite" size={13} color={colors.destructive}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  phoneRow: { flexDirection: "row", gap: 8, marginTop: -4 },
  prefix: { alignItems: "center", borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 14 },
  phoneField: { flex: 1 },
});