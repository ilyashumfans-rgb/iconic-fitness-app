import { Feather } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useLookupMembership } from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useColors } from "@/hooks/useColors";
import { clearPendingMobile, setPendingMobile } from "@/lib/pendingMobile";

/**
 * "Already an Iconic member?" widget for the sign-in/up screens.
 *
 * The member enters their gym-registered mobile; we check it live against the
 * gym system (YoActiv). On a match the number is stashed locally and, once the
 * user finishes login/signup, PendingMobileLink (root layout) writes it to
 * their profile so their plan connects automatically.
 */
export function MemberMobileVerify() {
  const colors = useColors();
  const lookup = useLookupMembership();

  const [mobile, setMobile] = useState("");
  const [result, setResult] = useState<
    | { state: "idle" }
    | { state: "invalid" }
    | { state: "error"; message: string }
    | { state: "found"; memberName: string; branchName: string }
    | { state: "notFound" }
  >({ state: "idle" });

  const onVerify = useCallback(() => {
    const digits = mobile.replace(/\D/g, "");
    if (digits.length < 10) {
      setResult({ state: "invalid" });
      return;
    }
    const normalized = digits.slice(-10);
    lookup.mutate(
      { data: { mobile: normalized } },
      {
        onSuccess: (res) => {
          if (res.found) {
            setResult({
              state: "found",
              memberName: res.memberName,
              branchName: res.branchName,
            });
            void setPendingMobile(normalized);
          } else {
            setResult({ state: "notFound" });
            void clearPendingMobile();
          }
        },
        onError: () => {
          setResult({
            state: "error",
            message:
              "Couldn't check right now — you can continue and link your number later from Profile.",
          });
        },
      },
    );
  }, [mobile, lookup]);

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
          Already an Iconic member?
        </AppText>
      </View>
      <AppText size={12} muted>
        Enter your gym-registered mobile number — we&apos;ll connect your plan
        automatically after you log in or create an account.
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
          label="Verify"
          onPress={onVerify}
          loading={lookup.isPending}
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
            {result.branchName ? ` · ${result.branchName}` : ""} — finish
            logging in to connect it
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
