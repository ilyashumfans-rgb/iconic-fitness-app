import {
  autoSyncMemberMobile, syncMemberMobile,
  type AutomaticMobileSyncResult,
} from "@workspace/api-client-react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";

export const MOBILE_SYNC_PENDING_KEY = ["member-mobile-sync-pending"] as const;
export const AUTOMATIC_MOBILE_SYNC_KEY = "member-mobile-automatic-sync";
export type AutomaticMobileSyncState =
  | "idle"
  | "pending"
  | "synced"
  | "confirmation_required"
  | "mobile_conflict"
  | "error";

/** Local state is a cache subscription, not a fetchable QueryObserver. */
export function createMobileSyncPendingStore(queryClient: QueryClient) {
  const getSnapshot = () => queryClient.getQueryData<number>(MOBILE_SYNC_PENDING_KEY) ?? 0;
  return {
    getSnapshot,
    subscribe: (notify: () => void) => {
      let previous = getSnapshot();
      return queryClient.getQueryCache().subscribe(event => {
        if (event.query.queryKey[0] !== MOBILE_SYNC_PENDING_KEY[0]) return;
        const next = getSnapshot();
        if (next === previous) return;
        previous = next;
        notify();
      });
    },
  };
}

const getServerSyncSnapshot = () => 0;

export function useMobileSyncPending() {
  const queryClient = useQueryClient();
  const store = useMemo(() => createMobileSyncPendingStore(queryClient), [queryClient]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSyncSnapshot);
}

const AUTO_SYNC_IDLE: AutomaticMobileSyncState = "idle";

export function automaticMobileSyncKey(accountId: string) {
  return [AUTOMATIC_MOBILE_SYNC_KEY, accountId] as const;
}

export function useAutomaticMobileSyncState(accountId?: string | null) {
  const queryClient = useQueryClient();
  const key = useMemo(() => automaticMobileSyncKey(accountId ?? ""), [accountId]);
  const store = useMemo(() => {
    const getSnapshot = () =>
      queryClient.getQueryData<AutomaticMobileSyncState>(key) ?? AUTO_SYNC_IDLE;
    return {
      getSnapshot,
      subscribe: (notify: () => void) => {
        let previous = getSnapshot();
        return queryClient.getQueryCache().subscribe(event => {
          if (event.query.queryKey[0] !== key[0] || event.query.queryKey[1] !== key[1]) return;
          const next = getSnapshot();
          if (next === previous) return;
          previous = next;
          notify();
        });
      },
    };
  }, [queryClient, key]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => AUTO_SYNC_IDLE);
}

/** Refresh only from the server-held receipt; this function never accepts a mobile. */
export async function autoSyncAndRefresh(
  queryClient: QueryClient,
  accountId: string,
  sync: () => Promise<AutomaticMobileSyncResult> = autoSyncMemberMobile,
  stillCurrent: () => boolean = () => true,
) {
  const journey = { queryKey: ["/api/memberships/journey"] };
  const stateKey = automaticMobileSyncKey(accountId);
  queryClient.setQueryData<AutomaticMobileSyncState>(stateKey, "pending");
  try {
    await queryClient.cancelQueries(journey);
    if (!stillCurrent()) throw new Error("Account changed before automatic membership sync.");
    queryClient.setQueriesData(journey, (old: unknown) =>
      old && typeof old === "object" ? { ...old, eligible: false } : old);
    const response = await sync();
    if (!stillCurrent()) throw new Error("Account changed during automatic membership sync.");
    const state: AutomaticMobileSyncState = response.synced ? "synced" : response.reason;
    queryClient.setQueryData<AutomaticMobileSyncState>(
      stateKey,
      current => current === "synced" ? "synced" : state,
    );
    await queryClient.invalidateQueries({
      predicate: query => {
        const key = query.queryKey[0];
        return typeof key === "string" &&
          (key.startsWith("/api/me") || key.startsWith("/api/memberships/"));
      },
    });
    return response;
  } catch (error) {
    if (stillCurrent()) {
      queryClient.setQueriesData(journey, (old: unknown) =>
        old && typeof old === "object" ? { ...old, eligible: false } : old);
      queryClient.setQueryData<AutomaticMobileSyncState>(
        stateKey,
        current => current === "synced" ? "synced" : "error",
      );
    }
    throw error;
  }
}

/** Clear old eligibility before syncing; refresh only after server receipt saves. */
export async function syncMobileAndRefresh(
  queryClient: QueryClient, mobile: string, sync = syncMemberMobile,
  stillCurrent: () => boolean = () => true,
  accountId?: string | null,
) {
  const journey = { queryKey: ["/api/memberships/journey"] };
  queryClient.setQueryData<number>(MOBILE_SYNC_PENDING_KEY, old => (old ?? 0) + 1);
  try {
    await queryClient.cancelQueries(journey);
    if (!stillCurrent()) throw new Error("Account changed before mobile sync.");
    queryClient.setQueriesData(journey, (old: unknown) =>
      old && typeof old === "object" ? { ...old, eligible: false } : old);
    const response = await sync({ mobile });
    if (!response.synced) throw new Error("Mobile sync was not confirmed.");
    if (!stillCurrent()) throw new Error("Account changed during mobile sync.");
    if (accountId) {
      queryClient.setQueryData<AutomaticMobileSyncState>(
        automaticMobileSyncKey(accountId), "synced",
      );
    }
    await queryClient.invalidateQueries({
      predicate: query => {
        const key = query.queryKey[0];
        return typeof key === "string" &&
          (key.startsWith("/api/me") || key.startsWith("/api/memberships/"));
      },
    });
  } finally {
    queryClient.setQueryData<number>(MOBILE_SYNC_PENDING_KEY, old => Math.max(0, (old ?? 1) - 1));
  }
}