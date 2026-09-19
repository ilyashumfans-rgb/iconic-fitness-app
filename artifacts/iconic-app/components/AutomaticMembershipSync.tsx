import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { MemberMobileVerify } from "@/components/MemberMobileVerify";
import { useColors } from "@/hooks/useColors";
import {
  autoSyncAndRefresh,
  automaticMobileSyncKey,
  useAutomaticMobileSyncState,
  useMobileSyncPending,
} from "@/lib/syncMemberMobile";

/** Runs once for each authenticated account during this root mount. */
export function AutomaticMembershipSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const attempted = useRef<string | null>(null);
  const currentOwner = useRef<string | null>(null);
  currentOwner.current = isSignedIn ? (userId ?? null) : null;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      if (isLoaded && !isSignedIn) attempted.current = null;
      return;
    }
    if (attempted.current === userId) return;
    attempted.current = userId;
    let cancelled = false;
    void autoSyncAndRefresh(
      queryClient,
      userId,
      undefined,
      () => !cancelled && currentOwner.current === userId,
    ).catch(() => {
      // Home renders an account-scoped retry action; eligibility remains hidden.
    });
    return () => {
      cancelled = true;
      // React Strict Mode cleans up and replays effects. Release this attempt so
      // the replay starts a real request instead of leaving state at "pending".
      if (attempted.current === userId) attempted.current = null;
    };
  }, [isLoaded, isSignedIn, userId, queryClient]);

  return null;
}

export function AutomaticMembershipSyncNotice({ accountId }: { accountId: string }) {
  const colors = useColors();
  const { isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const state = useAutomaticMobileSyncState(accountId);
  const explicitSyncPending = useMobileSyncPending();
  const currentOwner = useRef(accountId);
  const mounted = useRef(true);
  currentOwner.current = isSignedIn && userId ? userId : "";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, [accountId]);

  const retry = useCallback(() => {
    void autoSyncAndRefresh(
      queryClient,
      accountId,
      undefined,
      () => mounted.current && currentOwner.current === accountId,
    ).catch(() => {});
  }, [accountId, queryClient]);

  if (explicitSyncPending > 0 ||
    state === "idle" || state === "pending" || state === "synced") return null;

  if (state === "confirmation_required" || state === "mobile_conflict") {
    return (
      <View style={styles.wrapper}>
        <MemberMobileVerify
          syncMode
          onSynced={() => {
            queryClient.setQueryData(automaticMobileSyncKey(accountId), "synced");
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name="refresh-cw" size={17} color={colors.primary} />
      <View style={styles.copy}>
        <AppText size={14} weight="700">Membership refresh incomplete</AppText>
        <AppText size={12} muted>
          Your journey offer stays hidden until your membership refresh succeeds.
        </AppText>
      </View>
      <Button label="Retry" onPress={retry} size="md" full={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  notice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  copy: { flex: 1, gap: 3 },
});