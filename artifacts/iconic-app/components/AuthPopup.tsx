import { useSignIn, useSignUp } from "@clerk/expo";
import { customFetch } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { WhatsappOtpForm } from "@/components/WhatsappOtpForm";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useGuest } from "@/hooks/useGuest";
import { setPendingUsername } from "@/lib/pendingUsername";
import { useColors } from "@/hooks/useColors";
import { memberAuthDestination } from "@/lib/memberAuth";
import {
  createSignup,
  verifySignup,
} from "@/lib/authPopupSignup";

type Props = {
  onClose: () => void;
  /** Deep-link destination to restore after member auth completes. */
  returnTo?: string;
};

type LoginMode = "otp" | "password";
type PasswordStage = "login" | "resetEmail" | "resetVerify";
type SignupStage = "form" | "verify";

/**
 * The email entry point is kept as a modal so people can start on the branded
 * welcome screen and still reach every existing member auth path. The native
 * social and guest actions remain on that screen rather than being duplicated
 * here.
 */
export function AuthPopup({ onClose, returnTo }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { exitGuest } = useGuest();
  const memberDestination = memberAuthDestination(returnTo);
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const authCompletedRef = useRef(false);
  const signInRef = useRef(signIn);
  const signUpRef = useRef(signUp);
  signInRef.current = signIn;
  signUpRef.current = signUp;

  useEffect(() => {
    return () => {
      if (!authCompletedRef.current) {
        void signInRef.current.reset().catch(() => {});
        void signUpRef.current.reset().catch(() => {});
      }
    };
  }, []);

  const close = useCallback(() => {
    if (!authCompletedRef.current) {
      void signIn.reset().catch(() => {});
      void signUp.reset().catch(() => {});
    }
    onClose();
  }, [onClose, signIn, signUp]);

  const [view, setView] = useState<"login" | "signup">("login");
  const [whatsapp, setWhatsapp] = useState(true);
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<LoginMode>("otp");

  const [pwIdentifier, setPwIdentifier] = useState("");
  const [pwPassword, setPwPassword] = useState("");
  const [pwStage, setPwStage] = useState<PasswordStage>("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwInfo, setPwInfo] = useState<string | null>(null);

  const [signupStage, setSignupStage] = useState<SignupStage>("form");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupCode, setSignupCode] = useState("");

  const loading =
    whatsappBusy ||
    busy ||
    signInFetchStatus === "fetching" ||
    signUpFetchStatus === "fetching";

  const finalizeSignIn = useCallback(async () => {
    exitGuest();
    await signIn.finalize({
      navigate: () => {
        authCompletedRef.current = true;
        close();
        router.replace(memberDestination as never);
      },
    });
  }, [authCompletedRef, close, exitGuest, memberDestination, router, signIn]);

  const onSendOtp = useCallback(async () => {
    if (loading) return;
    setError(null);
    setOtpInfo(null);
    const address = email.trim();
    if (!address) {
      setError("Enter your email address to receive a login code.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address, such as name@example.com.");
      return;
    }
    setBusy(true);
    try {
      const { error: sendError } = await signIn.emailCode.sendCode({
        emailAddress: address,
      });
      if (sendError) {
        setError(clerkError(sendError));
        return;
      }
      setOtpSent(true);
      setOtpCode("");
      setOtpInfo(`We emailed a 6-digit code to ${address}.`);
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }, [email, loading, signIn]);

  const onVerifyOtp = useCallback(async () => {
    if (loading) return;
    setError(null);
    const code = otpCode.trim();
    if (code.length < 4) {
      setError("Enter the code from your email.");
      return;
    }
    setBusy(true);
    try {
      const { error: verifyError } = await signIn.emailCode.verifyCode({ code });
      if (verifyError) {
        setError(clerkError(verifyError));
        return;
      }
      if (signIn.status === "complete") {
        await finalizeSignIn();
      } else {
        setError("Additional verification is required to sign in.");
      }
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }, [finalizeSignIn, loading, otpCode, signIn]);

  const onChangeEmail = useCallback(async () => {
    if (loading) return;
    setError(null);
    setOtpInfo(null);
    setOtpSent(false);
    setOtpCode("");
    if (signIn.status !== null) {
      try {
        await signIn.reset();
      } catch {
        // An expired attempt should not prevent editing the email address.
      }
    }
  }, [loading, signIn]);

  const onPasswordLogin = useCallback(async () => {
    if (loading) return;
    setError(null);
    setPwInfo(null);
    const identifier = pwIdentifier.trim();
    if (identifier.length < 3) {
      setError("Enter your username, email, or mobile number.");
      return;
    }
    if (pwPassword.length < 1) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const result = await customFetch<{ ticket: string }>(
        "/api/auth/password-login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password: pwPassword }),
        },
      );
      if (signIn.status !== null) {
        try {
          await signIn.reset();
        } catch {
          // A stale attempt should not block a fresh ticket sign-in.
        }
      }
      const { error: ticketError } = await signIn.create({
        strategy: "ticket",
        ticket: result.ticket,
      });
      if (ticketError) {
        setError(clerkError(ticketError));
        return;
      }
      if (signIn.status === "complete") {
        await finalizeSignIn();
      } else {
        setError("Additional verification is required to sign in.");
      }
    } catch (err: unknown) {
      const apiMessage =
        (err as { data?: { error?: string } })?.data?.error ??
        (err as { body?: { error?: string } })?.body?.error;
      setError(apiMessage ?? clerkError(err));
    } finally {
      setBusy(false);
    }
  }, [finalizeSignIn, loading, pwIdentifier, pwPassword, signIn]);

  const onStartPasswordReset = useCallback(async () => {
    if (loading) return;
    setError(null);
    setPwInfo(null);
    const address = resetEmail.trim();
    if (!address.includes("@")) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setBusy(true);
    try {
      if (signIn.status !== null) {
        try {
          await signIn.reset();
        } catch {
          // A stale attempt should not block starting a fresh reset.
        }
      }
      const { error: createError } = await signIn.create({
        identifier: address,
      });
      if (!createError) {
        await signIn.resetPasswordEmailCode.sendCode();
      }
      setPwStage("resetVerify");
      setResetCode("");
      setNewPassword("");
      setPwInfo(
        "If an account exists for that email, we sent it a 6-digit reset code.",
      );
    } catch {
      // Keep reset responses generic so account existence is never disclosed.
      setPwStage("resetVerify");
      setResetCode("");
      setNewPassword("");
      setPwInfo(
        "If an account exists for that email, we sent it a 6-digit reset code.",
      );
    } finally {
      setBusy(false);
    }
  }, [loading, resetEmail, signIn]);

  const restartResetWithFreshCode = useCallback(async () => {
    const address = resetEmail.trim();
    if (!address.includes("@")) {
      setPwStage("resetEmail");
      setError("Enter your email again — the session expired.");
      return;
    }
    try {
      if (signIn.status !== null) {
        try {
          await signIn.reset();
        } catch {
          // A stale attempt should not block a fresh reset.
        }
      }
      const { error: createError } = await signIn.create({
        identifier: address,
      });
      if (!createError) {
        await signIn.resetPasswordEmailCode.sendCode();
      }
      setResetCode("");
      setPwInfo(
        "If an account exists for that email, we sent it a fresh reset code.",
      );
    } catch {
      setResetCode("");
      setPwInfo(
        "If an account exists for that email, we sent it a fresh reset code.",
      );
    }
  }, [resetEmail, signIn]);

  const onSubmitPasswordReset = useCallback(async () => {
    if (loading) return;
    setError(null);
    if (resetCode.trim().length < 4) {
      setError("Enter the code from your email.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (signIn.status === null) {
        await restartResetWithFreshCode();
        return;
      }
      const { error: verifyError } =
        await signIn.resetPasswordEmailCode.verifyCode({
          code: resetCode.trim(),
        });
      if (verifyError) {
        const message = clerkError(verifyError);
        if (/send a verification code/i.test(message)) {
          await restartResetWithFreshCode();
          return;
        }
        setError(message);
        return;
      }
      const { error: submitError } =
        await signIn.resetPasswordEmailCode.submitPassword({
          password: newPassword,
        });
      if (submitError) {
        setError(clerkError(submitError));
        return;
      }
      if (signIn.status === "complete") {
        await finalizeSignIn();
      } else {
        setError("Additional verification is required to sign in.");
      }
    } catch (err: unknown) {
      const message = clerkError(err);
      if (/send a verification code/i.test(message)) {
        await restartResetWithFreshCode();
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [
    finalizeSignIn,
    loading,
    newPassword,
    resetCode,
    restartResetWithFreshCode,
    signIn,
  ]);

  const switchLoginMode = useCallback(
    async (next: LoginMode) => {
      if (loading) return;
      setLoginMode(next);
      setError(null);
      setPwInfo(null);
      setOtpInfo(null);
      setOtpSent(false);
      setOtpCode("");
      setPwStage("login");
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
      if (signIn.status !== null) {
        try {
          await signIn.reset();
        } catch {
          // Ignore an expired attempt when switching login methods.
        }
      }
    },
    [loading, signIn],
  );

  const openSignup = useCallback(async () => {
    if (loading) return;
    setError(null);
    if (signIn.status !== null) {
      try {
        await signIn.reset();
      } catch {
        // Continue into sign-up even if the previous attempt has expired.
      }
    }
    setView("signup");
    setSignupStage("form");
  }, [loading, signIn]);

  const openLogin = useCallback(async () => {
    if (loading) return;
    setError(null);
    if (signUp.status !== null) {
      try {
        await signUp.reset();
      } catch {
        // Continue into login even if the previous attempt has expired.
      }
    }
    setView("login");
    setLoginMode("otp");
    setOtpSent(false);
    setOtpCode("");
  }, [loading, signUp]);

  const onCreateAccount = useCallback(async () => {
    if (loading) return;
    setError(null);
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z][a-z0-9._]{2,29}$/.test(normalizedUsername)) {
      setError(
        "Username must be 3–30 characters, start with a letter, and use only letters, numbers, dots, or underscores.",
      );
      return;
    }
    if (!signupEmail.trim().includes("@")) {
      setError("Enter your email address.");
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await createSignup(
        {
          username: normalizedUsername,
          emailAddress: signupEmail.trim(),
          password: signupPassword,
        },
        {
          checkUsernameAvailability: (candidate) =>
            customFetch<{ available: boolean }>(
              "/api/auth/username-availability",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: candidate }),
              },
            ),
          createPasswordSignup: (payload) => signUp.password(payload),
          sendEmailCode: () => signUp.verifications.sendEmailCode(),
          onError: (signupError) => {
            setError(
              typeof signupError === "string"
                ? signupError
                : clerkError(signupError),
            );
          },
          onVerificationReady: () => {
            setSignupStage("verify");
            setSignupCode("");
          },
        },
      );
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }, [
    loading,
    signUp,
    signupEmail,
    signupPassword,
    username,
  ]);

  const onVerifySignup = useCallback(async () => {
    if (loading) return;
    setError(null);
    if (signupCode.trim().length < 4) {
      setError("Enter the code from your email.");
      return;
    }
    setBusy(true);
    try {
      await verifySignup(
        {
          code: signupCode.trim(),
          username,
          name,
        },
        {
          verifyEmailCode: (payload) =>
            signUp.verifications.verifyEmailCode(payload),
          getStatus: () => signUp.status,
          getCreatedUserId: () => signUp.createdUserId,
          setPendingUsername,
          updateName: async (payload) => {
            await signUp.update(payload);
          },
          exitGuest,
          finalize: () => signUp.finalize(),
          onError: (signupError) => {
            setError(
              typeof signupError === "string"
                ? signupError
                : clerkError(signupError),
            );
          },
          onComplete: () => {
            authCompletedRef.current = true;
            close();
            router.replace(memberDestination as never);
          },
        },
      );
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }, [
    exitGuest,
    loading,
    name,
    close,
    memberDestination,
    router,
    signUp,
    signupCode,
    username,
  ]);

  const onResendSignup = useCallback(async () => {
    if (loading) return;
    setError(null);
    setBusy(true);
    try {
      await signUp.verifications.sendEmailCode();
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }, [loading, signUp]);

  const changeSignupEmail = useCallback(async () => {
    if (loading) return;
    setError(null);
    setSignupCode("");
    if (signUp.status !== null) {
      try {
        await signUp.reset();
      } catch {
        // The form can still be edited if the attempt already expired.
      }
    }
    setSignupStage("form");
  }, [loading, signUp]);

  const title = view === "signup" ? "Create your account" : "Welcome back";
  const subtitle =
    view === "signup"
      ? signupStage === "verify"
        ? `We sent a 6-digit code to ${signupEmail}.`
        : "Start tracking, training and winning."
      : loginMode === "otp" && otpSent
        ? `We sent a 6-digit code to ${email}.`
        : "Sign in to continue your fitness journey.";

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
          testID="auth-popup-backdrop"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText weight="700" size={25} color={colors.foreground}>
                {title}
              </AppText>
              <AppText size={13} color={colors.mutedForeground}>
                {subtitle}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sign in"
              testID="auth-popup-close"
              hitSlop={10}
              onPress={close}
              style={({ pressed }) => [
                styles.close,
                {
                  backgroundColor: colors.elevated,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Feather name="x" size={21} color={colors.foreground} />
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {whatsapp ? (
              <>
                <WhatsappOtpForm
                  onBusyChange={setWhatsappBusy}
                  onComplete={(isNewUser) => {
                    authCompletedRef.current = true;
                    close();
                    router.replace((isNewUser ? "/whatsapp-setup" : memberDestination) as never);
                  }}
                />
                <Pressable
                  onPress={() => {
                    setWhatsapp(false);
                    setView("login");
                    void switchLoginMode("password");
                  }}
                  disabled={loading}
                  hitSlop={8}
                  style={styles.linkButton}
                >
                  <AppText weight="600" size={13} color={colors.primary}>
                    Log in with username &amp; password
                  </AppText>
                </Pressable>
                <View style={styles.footer}>
                  <AppText size={14} color={colors.mutedForeground}>
                    New here?{" "}
                  </AppText>
                  <Pressable
                    onPress={() => {
                      setWhatsapp(false);
                      void openSignup();
                    }}
                    disabled={loading}
                    hitSlop={8}
                  >
                    <AppText weight="700" size={14} color={colors.primary}>
                      Create account
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : view === "login" ? (
              <LoginContent
                colors={colors}
                email={email}
                setEmail={setEmail}
                otpSent={otpSent}
                otpCode={otpCode}
                setOtpCode={setOtpCode}
                otpInfo={otpInfo}
                loginMode={loginMode}
                pwIdentifier={pwIdentifier}
                setPwIdentifier={setPwIdentifier}
                pwPassword={pwPassword}
                setPwPassword={setPwPassword}
                pwStage={pwStage}
                setPwStage={setPwStage}
                resetEmail={resetEmail}
                setResetEmail={setResetEmail}
                resetCode={resetCode}
                setResetCode={setResetCode}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                pwInfo={pwInfo}
                setPwInfo={setPwInfo}
                error={error}
                loading={loading}
                onSendOtp={onSendOtp}
                onVerifyOtp={onVerifyOtp}
                onChangeEmail={onChangeEmail}
                onPasswordLogin={onPasswordLogin}
                onStartPasswordReset={onStartPasswordReset}
                onSubmitPasswordReset={onSubmitPasswordReset}
                onResendReset={onStartPasswordReset}
                switchLoginMode={switchLoginMode}
                openSignup={openSignup}
                clearError={() => setError(null)}
              />
            ) : (
              <SignupContent
                colors={colors}
                signupStage={signupStage}
                name={name}
                setName={setName}
                username={username}
                setUsername={setUsername}
                signupEmail={signupEmail}
                setSignupEmail={setSignupEmail}
                signupPassword={signupPassword}
                setSignupPassword={setSignupPassword}
                signupCode={signupCode}
                setSignupCode={setSignupCode}
                error={error}
                loading={loading}
                onCreateAccount={onCreateAccount}
                onVerifySignup={onVerifySignup}
                onResendSignup={onResendSignup}
                onChangeEmail={changeSignupEmail}
                openLogin={openLogin}
              />
            )}
            <Button
              label={whatsapp ? "Use email or password instead" : "Login with OTP"}
              variant="ghost"
              disabled={loading}
              onPress={() => {
                setWhatsapp(!whatsapp);
                setError(null);
              }}
            />
            <View nativeID="clerk-captcha" />
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

type LoginContentProps = {
  colors: ReturnType<typeof useColors>;
  email: string;
  setEmail: (value: string) => void;
  otpSent: boolean;
  otpCode: string;
  setOtpCode: (value: string) => void;
  otpInfo: string | null;
  loginMode: LoginMode;
  pwIdentifier: string;
  setPwIdentifier: (value: string) => void;
  pwPassword: string;
  setPwPassword: (value: string) => void;
  pwStage: PasswordStage;
  setPwStage: (value: PasswordStage) => void;
  resetEmail: string;
  setResetEmail: (value: string) => void;
  resetCode: string;
  setResetCode: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  pwInfo: string | null;
  setPwInfo: (value: string | null) => void;
  error: string | null;
  loading: boolean;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onChangeEmail: () => void;
  onPasswordLogin: () => void;
  onStartPasswordReset: () => void;
  onSubmitPasswordReset: () => void;
  onResendReset: () => void;
  switchLoginMode: (next: LoginMode) => void;
  openSignup: () => void;
  clearError: () => void;
};

function LoginContent({
  colors,
  email,
  setEmail,
  otpSent,
  otpCode,
  setOtpCode,
  otpInfo,
  loginMode,
  pwIdentifier,
  setPwIdentifier,
  pwPassword,
  setPwPassword,
  pwStage,
  setPwStage,
  resetEmail,
  setResetEmail,
  resetCode,
  setResetCode,
  newPassword,
  setNewPassword,
  pwInfo,
  setPwInfo,
  error,
  loading,
  onSendOtp,
  onVerifyOtp,
  onChangeEmail,
  onPasswordLogin,
  onStartPasswordReset,
  onSubmitPasswordReset,
  onResendReset,
  switchLoginMode,
  openSignup,
  clearError,
}: LoginContentProps) {
  return (
    <View style={styles.form}>
      {loginMode === "otp" ? (
        <>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!otpSent && !loading}
          />
          {otpSent ? (
            <Field
              label="One-time code"
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="6-digit code"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={8}
              editable={!loading}
            />
          ) : null}
        </>
      ) : pwStage === "login" ? (
        <>
          <Field
            label="Username, email, or mobile"
            value={pwIdentifier}
            onChangeText={setPwIdentifier}
            placeholder="Your login identifier"
            autoCapitalize="none"
            editable={!loading}
          />
          <Field
            label="Password"
            value={pwPassword}
            onChangeText={setPwPassword}
            placeholder="Your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            editable={!loading}
          />
        </>
      ) : pwStage === "resetEmail" ? (
        <Field
          label="Your account email"
          value={resetEmail}
          onChangeText={setResetEmail}
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />
      ) : (
        <>
          <Field
            label="Email code"
            value={resetCode}
            onChangeText={setResetCode}
            placeholder="6-digit code from your email"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
            editable={!loading}
          />
          <Field
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!loading}
          />
        </>
      )}

      {(loginMode === "otp" ? otpInfo : pwInfo) && !error ? (
        <AppText size={13} color={colors.primary}>
          {loginMode === "otp" ? otpInfo : pwInfo}
        </AppText>
      ) : null}
      {error ? (
        <AppText size={13} color={colors.destructive}>
          {error}
        </AppText>
      ) : null}

      {loginMode === "otp" ? (
        !otpSent ? (
          <Button
            label="Continue with Email"
            onPress={onSendOtp}
            loading={loading}
            disabled={loading}
            size="lg"
          />
        ) : (
          <>
            <Button
              label="Verify code & log in"
              onPress={onVerifyOtp}
              loading={loading}
              disabled={loading}
              size="lg"
            />
            <Pressable
              onPress={onSendOtp}
              disabled={loading}
              hitSlop={8}
              style={styles.linkButton}
            >
              <AppText weight="600" size={13} color={colors.mutedForeground}>
                Didn&apos;t get it? Resend code
              </AppText>
            </Pressable>
            <Pressable
              onPress={onChangeEmail}
              disabled={loading}
              hitSlop={8}
              style={styles.linkButton}
            >
              <AppText weight="600" size={13} color={colors.mutedForeground}>
                Use a different email
              </AppText>
            </Pressable>
          </>
        )
      ) : pwStage === "login" ? (
        <>
          <Button
            label="Log in with password"
            onPress={onPasswordLogin}
            loading={loading}
            disabled={loading}
            size="lg"
          />
          <Pressable
            onPress={() => {
              clearError();
              setPwInfo(null);
              setPwStage("resetEmail");
            }}
            disabled={loading}
            hitSlop={8}
            style={styles.linkButton}
          >
            <AppText weight="600" size={13} color={colors.mutedForeground}>
              Forgot password? / Create a password
            </AppText>
          </Pressable>
        </>
      ) : pwStage === "resetEmail" ? (
        <>
          <Button
            label="Email me a reset code"
            onPress={onStartPasswordReset}
            loading={loading}
            disabled={loading}
            size="lg"
          />
          <Pressable
            onPress={() => {
              clearError();
              setPwInfo(null);
              setPwStage("login");
            }}
            disabled={loading}
            hitSlop={8}
            style={styles.linkButton}
          >
            <AppText weight="600" size={13} color={colors.mutedForeground}>
              Back to password login
            </AppText>
          </Pressable>
        </>
      ) : (
        <>
          <Button
            label="Set new password & log in"
            onPress={onSubmitPasswordReset}
            loading={loading}
            disabled={loading}
            size="lg"
          />
          <Pressable
            onPress={onResendReset}
            disabled={loading}
            hitSlop={8}
            style={styles.linkButton}
          >
            <AppText weight="600" size={13} color={colors.mutedForeground}>
              Didn&apos;t get it? Resend code
            </AppText>
          </Pressable>
        </>
      )}

      <Pressable
        onPress={() => void switchLoginMode(loginMode === "otp" ? "password" : "otp")}
        disabled={loading}
        hitSlop={8}
        style={styles.linkButton}
      >
        <AppText weight="600" size={13} color={colors.primary}>
          {loginMode === "otp"
            ? "Log in with username & password"
            : "Log in with email code instead"}
        </AppText>
      </Pressable>

      <View style={styles.footer}>
        <AppText size={14} color={colors.mutedForeground}>
          New here?{" "}
        </AppText>
        <Pressable onPress={() => void openSignup()} hitSlop={8}>
          <AppText weight="700" size={14} color={colors.primary}>
            Create account
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

type SignupContentProps = {
  colors: ReturnType<typeof useColors>;
  signupStage: SignupStage;
  name: string;
  setName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  signupEmail: string;
  setSignupEmail: (value: string) => void;
  signupPassword: string;
  setSignupPassword: (value: string) => void;
  signupCode: string;
  setSignupCode: (value: string) => void;
  error: string | null;
  loading: boolean;
  onCreateAccount: () => void;
  onVerifySignup: () => void;
  onResendSignup: () => void;
  onChangeEmail: () => void;
  openLogin: () => void;
};

function SignupContent({
  colors,
  signupStage,
  name,
  setName,
  username,
  setUsername,
  signupEmail,
  setSignupEmail,
  signupPassword,
  setSignupPassword,
  signupCode,
  setSignupCode,
  error,
  loading,
  onCreateAccount,
  onVerifySignup,
  onResendSignup,
  onChangeEmail,
  openLogin,
}: SignupContentProps) {
  return (
    <View style={styles.form}>
      {signupStage === "form" ? (
        <>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            editable={!loading}
          />
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. iconic.member"
            autoCapitalize="none"
            autoComplete="username-new"
            editable={!loading}
          />
          <Field
            label="Email"
            value={signupEmail}
            onChangeText={setSignupEmail}
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />
          <Field
            label="Password"
            value={signupPassword}
            onChangeText={setSignupPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="password-new"
            editable={!loading}
          />
          {error ? (
            <AppText size={13} color={colors.destructive}>
              {error}
            </AppText>
          ) : null}
          <Button
            label="Create account"
            onPress={onCreateAccount}
            loading={loading}
            disabled={loading}
            size="lg"
          />
        </>
      ) : (
        <>
          <Field
            label="Verification code"
            value={signupCode}
            onChangeText={setSignupCode}
            placeholder="6-digit code"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
            editable={!loading}
          />
          {error ? (
            <AppText size={13} color={colors.destructive}>
              {error}
            </AppText>
          ) : null}
          <Button
            label="Verify & continue"
            onPress={onVerifySignup}
            loading={loading}
            disabled={loading}
            size="lg"
          />
          <Pressable
            onPress={() => void onResendSignup()}
            disabled={loading}
            hitSlop={8}
            style={styles.linkButton}
          >
            <AppText size={13} weight="600" color={colors.mutedForeground}>
              Didn&apos;t get it? Resend code
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => void onChangeEmail()}
            disabled={loading}
            hitSlop={8}
            style={styles.linkButton}
          >
            <AppText size={13} weight="600" color={colors.mutedForeground}>
              Use a different email
            </AppText>
          </Pressable>
        </>
      )}

      <View style={styles.footer}>
        <AppText size={14} color={colors.mutedForeground}>
          Already a member?{" "}
        </AppText>
        <Pressable onPress={() => void openLogin()} hitSlop={8}>
          <AppText weight="700" size={14} color={colors.primary}>
            Log in
          </AppText>
        </Pressable>
      </View>
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
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.74)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 16,
    height: "90%",
    maxWidth: 520,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    width: "100%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 15,
  },
  headerCopy: { flex: 1, gap: 3, paddingRight: 16 },
  close: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingTop: 5 },
  form: { gap: 15 },
  linkButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 3,
  },
});