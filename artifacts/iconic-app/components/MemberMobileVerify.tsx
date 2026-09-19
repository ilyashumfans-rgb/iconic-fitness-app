import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  useLookupMembership,
} from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useColors } from "@/hooks/useColors";
import { clearPendingMobile, setPendingMobile } from "@/lib/pendingMobile";
import { syncMobileAndRefresh } from "@/lib/syncMemberMobile";

/**
 * "Already an Iconic member?" widget for the sign-in/up screens.
 *
 * The member enters their gym-registered mobile; we check it live against the
 * gym system (YoActiv). On a match the number is stashed locally and, once the
 * user finishes login/signup, PendingMobileLink (root layout) writes it to
 * their profile so their plan connects automatically.
 */
export function MemberMobileVerify({ initialMobile = "", syncMode = false, onSynced }: { initialMobile?: string; syncMode?: boolean; onSynced?: () => void } = {}) {
  const colors = useColors();
  const { isSignedIn, userId } = useAuth();
  const currentOwner = useRef<string | null>(null);
  const mounted = useRef(true);
  currentOwner.current = isSignedIn ? (userId ?? null) : null;
  const queryClient = useQueryClient();
  const lookup = useLookupMembership();
  const { mutate: lookupMember } = lookup;
  const [linking, setLinking] = useState(false);

  const [mobile, setMobile] = useState(initialMobile);
  const [result, setResult] = useState<
    | { state: "idle" }
    | { state: "invalid" }
    | { state: "error"; message: string }
    | { state: "found"; memberName: string; branchName: string }
    | { state: "notFound" }
  >({ state: "idle" });

  useEffect(() => () => {
    mounted.current = false;
    currentOwner.current = null;
  }, []);

  const onVerify = useCallback(() => {
    const ownerAtLookup = currentOwner.current;
    const digits = mobile.replace(/\D/g, "");
    if (digits.length < 10) {
      setResult({ state: "invalid" });
      return;
    }
    const normalized = digits.slice(-10);
    lookupMember(
      { data: { mobile: normalized } },
      {
        onSuccess: async (res) => {
          // An outstanding pre-login/account-A lookup cannot link account B.
          if (!mounted.current || currentOwner.current !== ownerAtLookup) return;
          if (res.found) {
            if (isSignedIn) {
              setLinking(true);
              try {
                await syncMobileAndRefresh(queryClient, normalized, undefined,
                  () => mounted.current && currentOwner.current === ownerAtLookup, ownerAtLookup);
                if (!mounted.current || currentOwner.current !== ownerAtLookup) return;
                await clearPendingMobile();
              } catch {
                if (!mounted.current || currentOwner.current !== ownerAtLookup) return;
                setResult({
                  state: "error",
                  message:
                    "Membership found, but we couldn't connect it. Please try again.",
                });
                return;
              } finally {
                if (mounted.current) setLinking(false);
              }
            } else {
              await setPendingMobile(normalized);
            }
            setResult({
              state: "found",
              memberName: res.memberName,
              branchName: res.branchName,
            });
            if (isSignedIn) onSynced?.();
          } else {
            setResult({ state: "notFound" });
            void clearPendingMobile();
          }
        },
        onError: () => {
          if (!mounted.current || currentOwner.current !== ownerAtLookup) return;
          setResult({
            state: "error",
            message:
              "Couldn't check right now — you can continue and link your number later from Profile.",
          });
        },
      },
    );
  }, [isSignedIn, mobile, lookupMember, queryClient, onSynced]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Feather name="user-check" size={15} color={colors.primary} />
        <AppText size={13} weight="700" color={colors.primary}>
          {syncMode ? "Sync your gym membership" : "Already an Iconic member?"}
        </AppText>
      </View>
      <AppText size={12} muted>
        {syncMode
          ? "Confirm your gym-registered mobile number to fetch your latest membership details."
          : "Enter your gym-registered mobile number — we'll connect your plan automatically after you log in or create an account."}
      </AppText>

      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <Field
            value={mobile}
            onChangeText={(v) => {
              setMobile(v);
              if (result.state !== "idle") setResult({ state: "idle" });
            }}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={14}
          />
        </View>
        <Button
          label={syncMode ? "Sync" : "Verify"}
          onPress={onVerify}
          loading={lookup.isPending || linking}
          variant="secondary"
          size="md"
          full={false}
        />
      </View>

      {result.state === "invalid" ? (
        <AppText size={12} color={colors.destructive}>
          Enter a valid 10-digit mobile number.
        </AppText>
      ) : null}
      {result.state === "error" ? (
        <AppText size={12} color={colors.destructive}>
          {result.message}
        </AppText>
      ) : null}
      {result.state === "notFound" ? (
        <AppText size={12} muted>
          No membership found for that number. You can still create an account
          — or check the number registered with your gym.
        </AppText>
      ) : null}
      {result.state === "found" ? (
        <View
          style={[
            styles.foundRow,
            {
              borderColor: colors.primary,
              backgroundColor: colors.primary + "1A",
            },
          ]}
        >
          <Feather name="check-circle" size={15} color={colors.primary} />
          <AppText size={12} weight="700" color={colors.primary} style={{ flex: 1 }}>
            Membership found ✓ {result.memberName}
            {result.branchName ? ` · ${result.branchName}` : ""}
            {isSignedIn
              ? " — connected to your account"
              : " — finish logging in to connect it"}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  inputRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  foundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
