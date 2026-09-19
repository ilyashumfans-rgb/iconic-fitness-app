import { useAuth } from "@clerk/expo";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";

import { memberAuthDestination } from "@/lib/memberAuth";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  // Only bounce to the app once we KNOW the user is signed in. While Clerk is
  // still loading (or never loads on a slow/offline device) we keep showing the
  // auth stack so "Continue without login" stays reachable — never a blank gate.
  // SSO activates the Clerk session asynchronously. Redirect to the same
  // validated destination carried by welcome rather than always to tabs, so an
  // auth-layout re-render cannot win the hand-off race and discard returnTo.
  if (isLoaded && isSignedIn) {
    return <Redirect href={memberAuthDestination(params.returnTo) as never} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
