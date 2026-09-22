import { useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { getGetAvailableCouponsQueryKey, useGetAvailableCoupons, usePreviewCoupon } from "@workspace/api-client-react";

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
  const [showAvailable, setShowAvailable] = useState(false);
  const { userId, isLoaded } = useAuth();
  const hasAmount = Number.isFinite(amountInr) && Number(amountInr) > 0;
  const params = {
    kind,
    amountInr: hasAmount ? Math.round(amountInr!) : 0,
  };
  const available = useGetAvailableCoupons(params, {
    query: {
      queryKey: [...getGetAvailableCouponsQueryKey(params), userId ?? "guest"],
      enabled: isLoaded && showAvailable && hasAmount && !applied,
      staleTime: 0,
    },
  });
  const preview = usePreviewCoupon();
  const context = JSON.stringify([userId, kind, amountInr, mobile]);
  const latestContext = useRef(context);
  latestContext.current = context;
  const operation = useRef(0);
  useEffect(() => () => { operation.current += 1; }, []);

  async function apply(selectedCode = code) {
    const trimmed = selectedCode.trim().toUpperCase();
    if (!trimmed || !hasAmount || preview.isPending) return;
    const request = ++operation.current;
    const requestContext = context;
    setCode(trimmed);
    setError(null);
    Keyboard.dismiss();
    try {
      const res = await preview.mutateAsync({
        data: {
          code: trimmed,
          amountInr: Math.round(amountInr!),
          kind,
          ...(mobile?.trim() ? { mobile: mobile.trim() } : {}),
        },
      });
      if (request !== operation.current || requestContext !== latestContext.current) return;
      if (res.valid && res.discountInr) {
        onApplied({ code: res.code ?? trimmed, discountInr: res.discountInr });
        setShowAvailable(false);
      } else {
        onApplied(null);
        setError(res.error ?? "This coupon code is not valid");
        if (showAvailable) void available.refetch();
      }
    } catch (err) {
      if (request !== operation.current || requestContext !== latestContext.current) return;
      onApplied(null);
      setError(err instanceof Error ? err.message : "Could not check coupon");
    }
  }

  function clear() {
    operation.current += 1;
    onApplied(null);
    setCode("");
    setError(null);
    setShowAvailable(false);
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
        <Pressable accessibilityRole="button" accessibilityLabel="Remove coupon" onPress={clear} hitSlop={8}>
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
            onFocus={() => setShowAvailable(true)}
            onPressIn={() => setShowAvailable(true)}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              if (error) setError(null);
            }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apply entered coupon"
          onPress={() => void apply()}
          disabled={preview.isPending || !code.trim() || !hasAmount}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.primary,
            opacity: preview.isPending || !code.trim() || !hasAmount ? 0.5 : 1,
          }}
        >
          <AppText weight="700" size={13} color={colors.primary}>
            {preview.isPending ? "Checking…" : "Apply"}
          </AppText>
        </Pressable>
      </View>
      {showAvailable ? (
        <View style={{ marginTop: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <AppText weight="700" size={13}>Available coupons</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close available coupons"
              hitSlop={10} onPress={() => setShowAvailable(false)}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {!hasAmount ? <AppText muted size={12}>Choose a package to see available coupons.</AppText>
            : !isLoaded || available.isFetching ? <AppText muted size={12}>Loading coupons…</AppText>
            : available.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void available.refetch()}>
                <AppText size={12} color={colors.destructive}>Could not load coupons. Tap to retry.</AppText>
              </Pressable>
            ) : available.data?.coupons.length ? available.data.coupons.map((coupon) => (
              <Pressable key={coupon.code} accessibilityRole="button"
                accessibilityLabel={`Apply ${coupon.code}, save ₹${coupon.discountInr}`}
                disabled={preview.isPending} onPress={() => void apply(coupon.code)}
                style={({ pressed }) => ({
                  padding: 12, borderRadius: 12, backgroundColor: colors.elevated,
                  opacity: preview.isPending || pressed ? 0.6 : 1, gap: 6,
                })}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <AppText weight="700" size={14} style={{ flex: 1 }}>{coupon.code}</AppText>
                  <AppText weight="700" size={13} color={colors.primary}>Apply</AppText>
                </View>
                {coupon.description ? <AppText muted size={12}>{coupon.description}</AppText> : null}
                <AppText size={12}>Save ₹{coupon.discountInr.toLocaleString("en-IN")}</AppText>
              </Pressable>
            )) : <AppText muted size={12}>No coupons are available for this package right now. You can still enter a code above.</AppText>}
        </View>
      ) : null}
      {!amountInr && code.trim() ? (
        <AppText muted size={11}>
          Choose a package first, then apply your coupon.
        </AppText>
      ) : null}
      {error ? (
        <AppText size={11} style={{ color: colors.destructive }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
