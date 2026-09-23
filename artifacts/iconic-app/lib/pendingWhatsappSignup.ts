import { useSyncExternalStore } from "react";

// Deliberately memory-only: a short-lived bearer continuation is never written
// to logs, URLs, query caches or unencrypted persistent storage.
type Pending = { continuationToken: string; mobile: string; requiresAccountSignIn?: boolean };
let pending: Pending | null = null;
const listeners = new Set<() => void>();
export function setPendingWhatsappSignup(value: Pending | null) {
  pending = value;
  listeners.forEach((listener) => listener());
}
export function usePendingWhatsappSignup() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => pending,
    () => null,
  );
}