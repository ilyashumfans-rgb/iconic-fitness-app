import { useSignIn, useSSO } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import * as AuthSession from "expo-auth-session";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { AuthPopup } from "@/components/AuthPopup";
import {
  SsoRequirementsPopup,
  type SsoRequirementValues,
} from "@/components/SsoRequirementsPopup";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { ThemeContext } from "@/hooks/useTheme";
import { GoogleIcon } from "@/components/GoogleIcon";
import { memberAuthDestination } from "@/lib/memberAuth";
import { ssoRedirectOptions } from "@/lib/ssoRedirect";
import {
  ssoCompletionTransition,
} from "@/lib/ssoCompletion";

const LOGIN_LIME = "#85F12C";
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
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const topPadding = Math.max(insets.top + 8, Platform.OS === "web" ? 44 : 24);
  const artworkHeight = Math.min(Math.min(width, 480) * 1252 / 982, Math.max(300, height - topPadding - 330));
  const { enterGuest, exitGuest } = useGuest();
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

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("@/assets/images/login-original-artwork.jpg")}
          style={{ width: "100%", height: artworkHeight, marginBottom: 12 }}
          resizeMode="contain"
          accessible
          accessibilityLabel="Iconic Fitness. The Fitness Company. A stronger, healthier, happier you."
        />

        <View style={styles.bottom}>
          {error ? (
            <AppText size={13} color={colors.destructive} style={styles.errorText}>
              {error}
            </AppText>
          ) : null}

          {/* Email Login */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with email"
            testID="welcome-continue-email"
            onPress={() => setEmailAuthOpen(true)}
            style={({ pressed }) => [
              styles.primaryOption,
              { backgroundColor: LOGIN_LIME, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <View style={styles.iconBox}>
              <Feather name="mail" size={20} color="#0A0C08" />
            </View>
            <AppText weight="700" size={16} color="#0A0C08" style={styles.optionTextCenter}>
              Continue with Email
            </AppText>
            <View style={styles.iconBox}>
              <Feather name="arrow-right" size={20} color="#0A0C08" />
            </View>
          </Pressable>

          {/* Google Login */}
          <Pressable
            accessibilityRole="button"
            onPress={onGoogle}
            disabled={ssoLoading !== null}
            style={({ pressed }) => [
              styles.outlineOption,
              { opacity: pressed || ssoLoading === "google" ? 0.7 : 1 },
            ]}
          >
            <View style={styles.iconBox}>
              <GoogleIcon />
            </View>
            <AppText weight="700" size={16} color="#FFF" style={styles.optionTextCenter}>
              {ssoLoading === "google" ? "Connecting…" : "Continue with Google"}
            </AppText>
            <View style={styles.iconBox}>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </View>
          </Pressable>

          {/* Apple Login (iOS only) */}
          {Platform.OS === "ios" ? (
            <Pressable
              accessibilityRole="button"
              onPress={onApple}
              disabled={ssoLoading !== null}
              style={({ pressed }) => [
                styles.outlineOption,
                { opacity: pressed || ssoLoading === "apple" ? 0.7 : 1 },
              ]}
            >
              <View style={styles.iconBox}>
                <FontAwesome5 name="apple" size={22} color="#FFF" />
              </View>
              <AppText weight="700" size={16} color="#FFF" style={styles.optionTextCenter}>
                {ssoLoading === "apple" ? "Connecting…" : "Continue with Apple"}
              </AppText>
              <View style={styles.iconBox}>
                <Feather name="arrow-right" size={20} color="#FFF" />
              </View>
            </Pressable>
          ) : null}

          {/* Guest Login */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              enterGuest();
              router.replace("/(tabs)");
            }}
            style={({ pressed }) => [
              styles.outlineOption,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.iconBox}>
              <Feather name="user" size={22} color="#FFF" />
            </View>
            <AppText weight="700" size={16} color="#FFF" style={styles.optionTextCenter}>
              Continue as Guest
            </AppText>
            <View style={styles.iconBox}>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </View>
          </Pressable>

          {/* Staff Login */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/staff-login")}
            style={({ pressed }) => [
              styles.outlineOption,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.iconBox}>
              <Feather name="users" size={22} color="#FFF" />
            </View>
            <AppText weight="700" size={16} color="#FFF" style={styles.optionTextCenter}>
              Staff Login
            </AppText>
            <View style={styles.iconBox}>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </View>
          </Pressable>


          <AppText weight="700" size={11} color="#666" style={styles.motto}>
            DISCIPLINE  BUILDS  FREEDOM
          </AppText>
        </View>
      </ScrollView>
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
  flex: { flex: 1 },
  content: { flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  bottom: { 
    marginHorizontal: 24,
    marginTop: "auto", 
    gap: 9
  },
  errorText: {
    textAlign: "center",
    marginBottom: 8,
  },
  primaryOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 8,
  },
  outlineOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#FFF",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  iconBox: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextCenter: {
    flex: 1,
    textAlign: "center",
  },
  motto: {
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 0,
  },
});

