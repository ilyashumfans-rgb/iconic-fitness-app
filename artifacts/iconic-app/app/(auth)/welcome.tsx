import { useSignIn, useSSO } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import * as AuthSession from "expo-auth-session";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { AuthPopup } from "@/components/AuthPopup";
import {
  SsoRequirementsPopup,
  type SsoRequirementValues,
} from "@/components/SsoRequirementsPopup";
import { useGuest } from "@/hooks/useGuest";
import { ThemeContext } from "@/hooks/useTheme";
import { memberAuthDestination } from "@/lib/memberAuth";
import { ssoRedirectOptions } from "@/lib/ssoRedirect";
import {
  ssoCompletionTransition,
} from "@/lib/ssoCompletion";

const LOGIN_LIME = "#85F12C";
const ART_W = 734;
const ART_H = 1600;
type SsoFlowResult = Awaited<
  ReturnType<ReturnType<typeof useSSO>["startSSOFlow"]>
>;
type PendingGoogleSignUp = {
  signUp: NonNullable<SsoFlowResult["signUp"]>;
  setActive: NonNullable<SsoFlowResult["setActive"]>;
  missingFields: string[];
  unverifiedFields: string[];
};

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
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { exitGuest } = useGuest();
  const memberDestination = memberAuthDestination(params.returnTo);

  const finishMemberAuth = useCallback(() => {
    router.replace(memberDestination as never);
  }, [memberDestination, router]);

  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();

  const [ssoLoading, setSsoLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailAuthOpen, setEmailAuthOpen] = useState(false);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);
  const [pendingGoogleSignUp, setPendingGoogleSignUp] =
    useState<PendingGoogleSignUp | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const advanceGoogleSso = useCallback(
    async (initialResult: SsoFlowResult) => {
      let result = initialResult;
      let attemptedEmptyCompletion = false;

      // The first result is either a session (an existing Google member) or a
      // transferred SignUpResource (a new Google member). A transferred signup
      // with no fields is legitimately completed by Clerk's update({}); all
      // other fields are explicitly collected below.
      for (;;) {
        const signUp = result.signUp;
        const transition = ssoCompletionTransition({
          createdSessionId: result.createdSessionId,
          authSessionType: result.authSessionResult?.type,
          signUpStatus: signUp?.status,
          missingFields: signUp?.missingFields,
          unverifiedFields: signUp?.unverifiedFields,
        });

        if (transition.kind === "activate") {
          if (!result.setActive) {
            setError(
              "Google verified your account, but the app could not activate the session. Please try again.",
            );
            return;
          }
          exitGuest();
          // setActive persists the Clerk session first. Passing navigate here
          // is unsafe for this route: Clerk invokes that callback immediately
          // before activation, so the tabs gate can briefly see signed-out
          // state and send a just-authenticated member back to welcome.
          await result.setActive({ session: transition.sessionId });
          finishMemberAuth();
          return;
        }

        if (transition.kind === "cancelled") {
          setError("Google sign-in was cancelled.");
          return;
        }

        if (transition.kind === "completeEmptySignUp") {
          if (!signUp || attemptedEmptyCompletion) {
            setError(
              "Google sign-in did not create a session. Please try again, or continue with email.",
            );
            return;
          }
          attemptedEmptyCompletion = true;
          const completed = await signUp.update({});
          result = {
            createdSessionId: completed.createdSessionId,
            signUp: completed,
            setActive: result.setActive,
            authSessionResult: result.authSessionResult,
          };
          continue;
        }

        if (transition.kind === "collectRequirements" && signUp && result.setActive) {
          setPendingGoogleSignUp({
            signUp,
            setActive: result.setActive,
            missingFields: transition.missingFields,
            unverifiedFields: transition.unverifiedFields,
          });
          return;
        }

        setError(
          "Google sign-in did not create a session. Please try again, or continue with email.",
        );
        return;
      }
    },
    [exitGuest, finishMemberAuth],
  );

  const onGoogle = useCallback(async () => {
    if (ssoLoading) return;
    setError(null);
    setSsoLoading("google");
    try {
      if (signIn?.status !== null && signIn?.status !== undefined) {
        await signIn.reset();
      }
      const result = await startSSOFlow({
        strategy: "oauth_google",
        // @clerk/expo 3 defaults web to /sso-callback. That dedicated,
        // same-origin route calls maybeCompleteAuthSession before app bootstrap
        // so the popup returns its rotating nonce to this still-open screen.
        // Native keeps its already registered iconic-app:// redirect.
        ...ssoRedirectOptions(Platform.OS, () => AuthSession.makeRedirectUri()),
      });
      await advanceGoogleSso(result);
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setSsoLoading(null);
    }
  }, [
    ssoLoading,
    signIn,
    startSSOFlow,
    advanceGoogleSso,
  ]);

  const cancelPendingGoogleSignUp = useCallback(() => {
    setPendingGoogleSignUp(null);
    setError(null);
    // The SignUpResource returned by @clerk/expo useSSO is the legacy
    // resource and has no reset() method. The next Google attempt resets its
    // SignIn attempt before Clerk creates a fresh transferable signup.
  }, []);

  const submitGoogleRequirements = useCallback(
    async (values: SsoRequirementValues) => {
      const pending = pendingGoogleSignUp;
      if (!pending || ssoLoading) return;
      const required = pending.missingFields;
      const username = values.username.trim().toLowerCase();
      const emailAddress = values.emailAddress.trim();
      const phoneNumber = values.phoneNumber.trim();

      if (required.includes("first_name") && !values.firstName.trim()) {
        setError("Enter your first name to continue.");
        return;
      }
      if (required.includes("last_name") && !values.lastName.trim()) {
        setError("Enter your last name to continue.");
        return;
      }
      if (required.includes("username") && !/^[a-z][a-z0-9._]{2,29}$/.test(username)) {
        setError(
          "Username must be 3–30 characters, start with a letter, and use only letters, numbers, dots, or underscores.",
        );
        return;
      }
      if (
        required.includes("email_address") &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)
      ) {
        setError("Enter a valid email address.");
        return;
      }
      if (
        required.includes("phone_number") &&
        !/^\+[1-9]\d{7,14}$/.test(phoneNumber)
      ) {
        setError("Enter your mobile number with country code, for example +919876543210.");
        return;
      }
      if (required.includes("password") && values.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (required.includes("legal_accepted") && !values.legalAccepted) {
        setError("Accept the Terms of Service to create your account.");
        return;
      }

      setError(null);
      setSsoLoading("google");
      try {
        const updated = await pending.signUp.update({
          ...(required.includes("first_name")
            ? { firstName: values.firstName.trim() }
            : {}),
          ...(required.includes("last_name")
            ? { lastName: values.lastName.trim() }
            : {}),
          ...(required.includes("username") ? { username } : {}),
          ...(required.includes("email_address") ? { emailAddress } : {}),
          ...(required.includes("phone_number") ? { phoneNumber } : {}),
          ...(required.includes("password") ? { password: values.password } : {}),
          ...(required.includes("legal_accepted")
            ? { legalAccepted: values.legalAccepted }
            : {}),
        });
        await advanceGoogleSso({
          createdSessionId: updated.createdSessionId,
          signUp: updated,
          setActive: pending.setActive,
          authSessionResult: null,
        });
      } catch (err: unknown) {
        setError(clerkError(err));
      } finally {
        setSsoLoading(null);
      }
    },
    [advanceGoogleSso, pendingGoogleSignUp, ssoLoading],
  );

  const sendGoogleVerification = useCallback(
    async (field: "email_address" | "phone_number"): Promise<boolean> => {
      const pending = pendingGoogleSignUp;
      if (!pending || ssoLoading) return false;
      setError(null);
      setSsoLoading("google");
      try {
        const updated =
          field === "phone_number"
            ? await pending.signUp.preparePhoneNumberVerification({
                strategy: "phone_code",
              })
            : await pending.signUp.prepareEmailAddressVerification({
                strategy: "email_code",
              });
        setPendingGoogleSignUp({
          ...pending,
          signUp: updated,
          missingFields: [...updated.missingFields],
          unverifiedFields: [...updated.unverifiedFields],
        });
        return true;
      } catch (err: unknown) {
        const message = clerkError(err);
        setError(
          field === "phone_number"
            ? `We couldn't send a mobile verification code. ${message} Check your number or use email signup instead.`
            : message,
        );
        return false;
      } finally {
        setSsoLoading(null);
      }
    },
    [pendingGoogleSignUp, ssoLoading],
  );

  const verifyGoogleRequirement = useCallback(
    async (field: "email_address" | "phone_number", code: string) => {
      const pending = pendingGoogleSignUp;
      if (!pending || ssoLoading) return;
      if (!code) {
        setError("Enter the verification code you received.");
        return;
      }
      setError(null);
      setSsoLoading("google");
      try {
        const updated =
          field === "phone_number"
            ? await pending.signUp.attemptPhoneNumberVerification({ code })
            : await pending.signUp.attemptEmailAddressVerification({ code });
        await advanceGoogleSso({
          createdSessionId: updated.createdSessionId,
          signUp: updated,
          setActive: pending.setActive,
          authSessionResult: null,
        });
      } catch (err: unknown) {
        setError(clerkError(err));
      } finally {
        setSsoLoading(null);
      }
    },
    [advanceGoogleSso, pendingGoogleSignUp, ssoLoading],
  );

  const onApple = useCallback(async () => {
    if (ssoLoading) return;
    setError(null);
    setSsoLoading("apple");
    try {
      if (signIn?.status !== null && signIn?.status !== undefined) {
        await signIn.reset();
      }
      const { createdSessionId, setActive, signUp } =
        await startAppleAuthenticationFlow();
      let sessionId = createdSessionId;
      if (
        !sessionId &&
        signUp &&
        signUp.status === "missing_requirements" &&
        (signUp.missingFields?.length ?? 0) === 0
      ) {
        const result = await signUp.update({});
        if (result.status === "complete") sessionId = result.createdSessionId;
      }
      if (!sessionId || !setActive) {
        if (signUp?.status === "missing_requirements") {
          setError(
            "Apple sign-in needs additional account details. Please create your account with email, then connect Apple.",
          );
        }
        return;
      }
      exitGuest();
      await setActive({ session: sessionId });
      finishMemberAuth();
    } catch (err: unknown) {
      if (!isAppleCancellation(err)) setError(clerkError(err));
    } finally {
      setSsoLoading(null);
    }
  }, [
    ssoLoading,
    signIn,
    startAppleAuthenticationFlow,
    finishMemberAuth,
    exitGuest,
  ]);

  const onAppleWeb = useCallback(async () => {
    if (ssoLoading) return;
    setError(null);
    setSsoLoading("apple");
    try {
      if (signIn?.status !== null && signIn?.status !== undefined) {
        await signIn.reset();
      }
      const result = await startSSOFlow({
        strategy: "oauth_apple",
        ...ssoRedirectOptions(Platform.OS, () => AuthSession.makeRedirectUri()),
      });
      if (result.createdSessionId && result.setActive) {
        exitGuest();
        await result.setActive({ session: result.createdSessionId });
        finishMemberAuth();
      } else if (result.authSessionResult?.type === "cancel" || result.authSessionResult?.type === "dismiss") {
        setError("Apple sign-in was cancelled.");
      } else {
        setError("Apple sign-in needs more account details. Please continue with OTP or Google.");
      }
    } catch (err: unknown) {
      setError(clerkError(err));
    } finally {
      setSsoLoading(null);
    }
  }, [ssoLoading, signIn, startSSOFlow, exitGuest, finishMemberAuth]);

  // Use the supplied artwork at its original aspect ratio without cropping or distortion.
  const availH = height;
  const scale = Math.min(width / ART_W, availH / ART_H);
  const artW = ART_W * scale;
  const artH = ART_H * scale;
  const artLeft = (width - artW) / 2;
  const artTop = (availH - artH) / 2;

  const hotspots: {
    key: string;
    rect: [number, number, number, number];
    label: string;
    testID: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  }[] = [
    { key: "otp", rect: [78, 1088, 657, 1163], label: "Login with OTP", testID: "welcome-continue-email", onPress: () => setEmailAuthOpen(true), disabled: ssoLoading !== null },
    { key: "google", rect: [78, 1179, 657, 1257], label: "Continue with Google", testID: "welcome-google", onPress: onGoogle, loading: ssoLoading === "google", disabled: ssoLoading !== null },
    { key: "apple", rect: [78, 1270, 657, 1348], label: "Continue with Apple", testID: "welcome-apple", onPress: Platform.OS === "ios" ? onApple : onAppleWeb, loading: ssoLoading === "apple", disabled: ssoLoading !== null },
    { key: "staff", rect: [78, 1431, 657, 1510], label: "Staff Login", testID: "welcome-staff", onPress: () => router.push("/staff-login"), disabled: ssoLoading !== null },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: "#07090A" }]}>
      <Image
        source={require("@/assets/images/login-all-club-screen.jpg")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        blurRadius={24}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(4,6,5,0.55)" }]} />
      <View style={{ position: "absolute", left: artLeft, top: artTop, width: artW, height: artH }}>
        <Image
          source={require("@/assets/images/login-all-club-screen.jpg")}
          style={{ width: artW, height: artH }}
          resizeMode="contain"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
        <AppText accessibilityRole="header" style={styles.srOnly}>
          Iconic Fitness. One membership. All club access. 17+ premium gyms. One pass. Train anywhere. Anytime.
        </AppText>
        {hotspots.map((h) => {
          const [x1, y1, x2, y2] = h.rect;
          return (
            <Pressable
              key={h.key}
              accessibilityRole="button"
              accessibilityLabel={h.label}
              accessibilityState={{ disabled: !!h.disabled, busy: !!h.loading }}
              testID={h.testID}
              onPress={h.onPress}
              onFocus={() => setFocusedAction(h.key)}
              onBlur={() => setFocusedAction(null)}
              hitSlop={{ top: 3, bottom: 3 }}
              disabled={h.disabled}
              style={({ pressed }) => [
                styles.hotspot,
                {
                  left: x1 * scale,
                  top: y1 * scale,
                  width: (x2 - x1) * scale,
                  height: (y2 - y1) * scale,
                  backgroundColor: pressed ? "rgba(255,255,255,0.14)" : "transparent",
                  borderColor: focusedAction === h.key ? LOGIN_LIME : "transparent",
                },
              ]}
            >
              {h.loading ? (
                <View style={styles.loadingVeil}>
                  <ActivityIndicator color={LOGIN_LIME} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {error && !pendingGoogleSignUp ? (
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={`${error} Tap to dismiss.`}
          onPress={() => setError(null)}
          style={[styles.errorBanner, { top: Math.max(insets.top, 12) + 8 }]}
        >
          <AppText size={13} color="#FFF" style={{ textAlign: "center" }}>
            {error}
          </AppText>
        </Pressable>
      ) : null}
      {emailAuthOpen ? (
        <AuthPopup
          onClose={() => setEmailAuthOpen(false)}
          returnTo={memberDestination}
        />
      ) : null}
      {pendingGoogleSignUp ? (
        <SsoRequirementsPopup
          missingFields={pendingGoogleSignUp.missingFields}
          unverifiedFields={pendingGoogleSignUp.unverifiedFields}
          loading={ssoLoading === "google"}
          error={error}
          onCancel={cancelPendingGoogleSignUp}
          onSubmit={submitGoogleRequirements}
          onSendVerification={sendGoogleVerification}
          onVerify={verifyGoogleRequirement}
        />
      ) : null}
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

function isAppleCancellation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "ERR_REQUEST_CANCELED"
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, overflow: "hidden" },
  hotspot: { position: "absolute", borderRadius: 999, borderWidth: 2, overflow: "hidden" },
  loadingVeil: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  srOnly: { position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" },
  errorBanner: {
    position: "absolute", left: 16, right: 16, padding: 12, borderRadius: 14,
    backgroundColor: "rgba(150,30,30,0.92)", maxWidth: 440, alignSelf: "center",
  },
});
