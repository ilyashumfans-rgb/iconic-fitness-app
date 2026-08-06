import { useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePreviewCoupon } from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Field } from "@/components/Field";
import { useColors } from "@/hooks/useColors";

export type AppliedCoupon = { code: string; discountInr: number };

/**
 * "Have a coupon?" input — validates the code server-side against the
 * selected package's list price and reports the applied discount up.
 * The server re-validates at checkout, so this preview is display-only.
 */
export function CouponInput({
  amountInr,
  kind,
  mobile,
  applied,
  onApplied,
}: {
  /** List price of the selected package (₹); 0/null disables the input. */
  amountInr: number | null;
  kind: "package" | "pt";
  mobile?: string;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
}) {
  const colors = useColors();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const preview = usePreviewCoupon();

  async function apply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || !amountInr) return;
    setError(null);
    try {
      const res = await preview.mutateAsync({
        data: {
          code: trimmed,
          amountInr: Math.round(amountInr),
          kind,
          ...(mobile?.trim() ? { mobile: mobile.trim() } : {}),
        },
      });
      if (res.valid && res.discountInr) {
        onApplied({ code: res.code ?? trimmed, discountInr: res.discountInr });
      } else {
        onApplied(null);
        setError(res.error ?? "This coupon code is not valid");
      }
    } catch (err) {
      onApplied(null);
      setError(err instanceof Error ? err.message : "Could not check coupon");
    }
  }

  function clear() {
    onApplied(null);
    setCode("");
    setError(null);
  }

  if (applied) {
    return (
      <View
        style={{
          marginTop: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: `${colors.primary}14`,
        }}
      >
        <Feather name="tag" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={13}>
            Coupon {applied.code} applied
          </AppText>
          <AppText muted size={11} style={{ marginTop: 2 }}>
            You save ₹{applied.discountInr.toLocaleString("en-IN")}
          </AppText>
        </View>
        <Pressable onPress={clear} hitSlop={8}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 18, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Have a coupon?"
            placeholder="Enter coupon code"
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              if (error) setError(null);
            }}
          />
        </View>
        <Pressable
          onPress={apply}
          disabled={preview.isPending || !code.trim() || !amountInr}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.primary,
            opacity: preview.isPending || !code.trim() || !amountInr ? 0.5 : 1,
          }}
        >
          <AppText weight="700" size={13} color={colors.primary}>
            {preview.isPending ? "Checking…" : "Apply"}
          </AppText>
        </Pressable>
      </View>
      {!amountInr && code.trim() ? (
        <AppText muted size={11}>
          Choose a package first, then apply your coupon.
        </AppText>
      ) : null}
      {error ? (
        <AppText size={11} style={{ color: "#e5484d" }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
