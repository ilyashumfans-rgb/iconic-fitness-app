import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { getMe, updateMe } from "@workspace/api-client-react";

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
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      attempted.current = false;
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    void (async () => {
      try {
        const mobile = await getPendingMobile();
        if (!mobile) return;

        const me = await getMe();
        const currentDigits = (me.mobile ?? "").replace(/\D/g, "").slice(-10);
        if (currentDigits && currentDigits !== mobile) {
          // This account already belongs to a different mobile — never
          // overwrite it with a number verified before login (shared device).
          await clearPendingMobile();
          return;
        }

        if (currentDigits !== mobile) {
          await updateMe({ mobile });
        }
        await clearPendingMobile();

        // Profile + membership views should immediately reflect the link.
        await queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key !== "string") return false;
            return (
              key.startsWith("/api/me") ||
              key.startsWith("/api/memberships/mine")
            );
          },
        });
      } catch {
        // Leave the stash in place — we'll retry on the next app start;
        // the member can also set their mobile from the Profile tab.
      }
    })();
  }, [isSignedIn, queryClient]);

  return null;
}
