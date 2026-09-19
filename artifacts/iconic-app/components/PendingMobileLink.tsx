import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";

import { getMe } from "@workspace/api-client-react";
import { syncMobileAndRefresh } from "@/lib/syncMemberMobile";

import { clearPendingMobile, getPendingMobile } from "@/lib/pendingMobile";

/**
 * Root-level bridge: once the user is signed in, write any mobile number they
 * verified on the sign-in/up screen to their profile so the gym system
 * (YoActiv) membership connects automatically, then clear the stash.
 *
 * Safety rules (shared devices):
 * - The stash is TTL-limited (see lib/pendingMobile.ts).
 * - We only auto-link when the signed-in account has NO mobile on file (or it
 *   already matches). An account with a different mobile is never overwritten
 *   — the stash is discarded instead.
 * - One attempt per sign-in session; failures retry on the next app start.
 */
export function PendingMobileLink() {
  const { isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      attempted.current = null;
      return;
    }
    if (!userId || attempted.current === userId) return;
    attempted.current = userId;
    let cancelled = false;

    void (async () => {
      try {
        const mobile = await getPendingMobile();
        if (!mobile || cancelled) return;

        const me = await getMe();
        if (cancelled) return;
        const currentDigits = (me.mobile ?? "").replace(/\D/g, "").slice(-10);
        if (currentDigits && currentDigits !== mobile) {
          // This account already belongs to a different mobile — never
          // overwrite it with a number verified before login (shared device).
          await clearPendingMobile();
          return;
        }

        await syncMobileAndRefresh(
          queryClient, mobile, undefined, () => !cancelled, userId,
        );
        if (cancelled) return;
        await clearPendingMobile();

      } catch {
        // Leave the stash in place — we'll retry on the next app start;
        // the member can also set their mobile from the Profile tab.
        if (!cancelled) {
          Alert.alert("Membership sync incomplete", "Please open Profile and sync your gym mobile again. Your trial offer stays hidden until sync succeeds.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, queryClient]);

  return null;
}
