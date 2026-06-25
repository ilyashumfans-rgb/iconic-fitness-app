import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  // Only bounce to the app once we KNOW the user is signed in. While Clerk is
  // still loading (or never loads on a slow/offline device) we keep showing the
  // auth stack so "Continue without login" stays reachable — never a blank gate.
  if (isLoaded && isSignedIn) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
