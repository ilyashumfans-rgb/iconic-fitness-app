import { useAuth } from "@clerk/expo";
import {
  getGetFitnessSetupQueryKey,
  useGetFitnessSetup,
} from "@workspace/api-client-react";
import { Redirect, useSegments } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { usePendingWhatsappSignup } from "@/lib/pendingWhatsappSignup";

/**
 * Keeps only freshly provisioned member sessions behind the short setup flow.
 * The query key includes Clerk's id so React Query cannot briefly show a prior
 * account's private setup state after account switching.
 */
export function FitnessSetupGate({ children }: { children: ReactNode }) {
  const colors = useColors();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isGuest } = useGuest();
  const pendingWhatsapp = usePendingWhatsappSignup();
  const segments = useSegments();
  const isSetupRoute = segments[0] === "fitness-setup";
  const isMemberHome = segments[0] === "(tabs)";
  const isMember = isLoaded && !!isSignedIn && !isGuest && !!userId && !pendingWhatsapp;
  const setupQuery = useGetFitnessSetup({
    query: {
      enabled: isMember,
      queryKey: [...getGetFitnessSetupQueryKey(), userId ?? "anonymous"],
      retry: 1,
    },
  });

  // Authentication itself is deliberately not gated here: auth and guest
  // routes retain their existing slow-network behavior. Once it is a settled
  // member session, wait for this private decision before rendering Home.
  // Staff and auth routes have their own auth/session flows. The member home
  // is the shared private entry point, so only it waits on this decision.
  if (pendingWhatsapp) return <Redirect href="/whatsapp-setup" />;
  if (!isMember || isSetupRoute || !isMemberHome) return <>{children}</>;
  if (setupQuery.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText muted size={13} style={{ marginTop: 12 }}>
          Preparing your member home…
        </AppText>
      </View>
    );
  }
  if (setupQuery.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText weight="700">We couldn&apos;t check your setup</AppText>
        <AppText muted size={13} style={styles.copy}>
          Check your connection and try again. Your member home stays private until this is confirmed.
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void setupQuery.refetch()}
          style={[styles.retry, { backgroundColor: colors.primary }]}
        >
          <AppText weight="700" color={colors.primaryForeground}>Try again</AppText>
        </Pressable>
      </View>
    );
  }
  if (
    setupQuery.data?.requiredForOnboarding &&
    !setupQuery.data.completed
  ) {
    return <Redirect href="/fitness-setup" />;
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  copy: { marginTop: 8, maxWidth: 320, textAlign: "center" },
  retry: { borderRadius: 999, marginTop: 20, paddingHorizontal: 22, paddingVertical: 12 },
});