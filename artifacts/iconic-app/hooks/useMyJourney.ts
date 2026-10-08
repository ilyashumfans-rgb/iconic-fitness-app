import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyMemberJourneyQueryKey, useGetMyMemberJourney } from "@workspace/api-client-react";

/** Owner-bound journey query that refetches on focus/return and every 30s while active. */
export function useMyJourney(accountId: string) {
  const query = useGetMyMemberJourney({
    query: {
      queryKey: [...getGetMyMemberJourneyQueryKey(), accountId],
      enabled: !!accountId,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: "always",
    },
  });
  const refetch = query.refetch;
  useFocusEffect(useCallback(() => {
    void refetch({ cancelRefetch: false });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refetch({ cancelRefetch: false });
    }, 30000);
    const sub = AppState.addEventListener("change", state => { if (state === "active") void refetch({ cancelRefetch: false }); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refetch]));
  return query;
}

/** Invalidate every account-scoped journey query (prefix match). */
export function useInvalidateJourney() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: getGetMyMemberJourneyQueryKey() }), [client]);
}
