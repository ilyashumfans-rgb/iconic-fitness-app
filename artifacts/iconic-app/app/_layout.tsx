import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useColors } from "@/hooks/useColors";
import { GuestProvider } from "@/hooks/useGuest";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Point generated API hooks at the remote GYMCO backend (same domain, /api).
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) {
  setBaseUrl(`https://${domain}`);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Supply the Clerk session token as a bearer to every generated API call,
// at the root so all routes (tabs + root-level modals) are covered.
function ApiAuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function RootLayoutNav() {
  const colors = useColors();
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[slug]" />
        <Stack.Screen name="workout/[id]" />
        <Stack.Screen name="workout/generate" />
        <Stack.Screen name="meal-plan/[id]" />
        <Stack.Screen
          name="water"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="diet"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="workouts"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="body"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="meal-plans"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="habits"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  // Hide the native splash as soon as fonts resolve — but NEVER wait on them
  // forever. If the font download stalls (slow device / blocked tunnel), a 2s
  // fail-safe hides the splash anyway so the app always reveals its UI.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 2000);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  // Fail-safe: never let the animated splash trap the user, even if the
  // Reanimated completion callback doesn't fire (web/reduced-motion edge cases).
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // IMPORTANT: do NOT gate the whole app on font loading (`return null`). Doing
  // so leaves a permanent blank screen if the font assets are slow to download
  // on a real device. We render immediately and let Inter swap in when ready;
  // the system font is a perfectly fine fallback for the first moment.

  return (
    // NOTE: we intentionally do NOT wrap the app in <ClerkLoaded>. Gating the
    // whole tree on Clerk finishing its network load means a slow/blocked auth
    // request on a real device traps the user on a blank screen after the splash
    // (and even blocks guests from reaching "Continue without login"). Instead we
    // always render the app and let each route handle the auth-loading state.
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      {...(proxyUrl ? { proxyUrl } : {})}
    >
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ApiAuthBridge />
              <GuestProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                  {!splashDone ? (
                    <AnimatedSplash onFinish={() => setSplashDone(true)} />
                  ) : null}
                </GestureHandlerRootView>
              </GuestProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
