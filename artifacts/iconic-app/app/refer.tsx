import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyReferralInfoQueryKey,
  useApplyReferralCode,
  useGetMyReferralInfo,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Share, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function ReferScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const infoQuery = useGetMyReferralInfo({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyReferralInfoQueryKey(),
    },
  });
  const applyCode = useApplyReferralCode();
  const [codeInput, setCodeInput] = useState("");
  const [applying, setApplying] = useState(false);

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const info = infoQuery.data;

  async function onShare() {
    if (!info) return;
    try {
      await Share.share({
        message: `Join me on Iconic Fitness! Use my referral code ${info.code} when you sign up and I earn rewards when you make your first purchase. Download the Iconic Fitness app to get started.`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function onApply() {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert("Enter a code", "Please enter a valid referral code.");
      return;
    }
    setApplying(true);
    try {
      await applyCode.mutateAsync({ data: { code } });
      setCodeInput("");
      await queryClient.invalidateQueries({
        queryKey: getGetMyReferralInfoQueryKey(),
      });
      Alert.alert(
        "Code applied",
        "Your friend will earn rewards when you make your first purchase.",
      );
    } catch (err) {
      Alert.alert(
        "Could not apply code",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Refer & Earn" />

      {infoQuery.isLoading ? (
        <LoadingView />
      ) : infoQuery.isError || !info ? (
        <ErrorView onRetry={() => infoQuery.refetch()} />
      ) : (
        <View style={{ gap: 14 }}>
          {/* Points balance */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent,
                }}
              >
                <Feather name="award" size={22} color={colors.accentForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText muted size={12}>
                  Wallet points
                </AppText>
                <AppText weight="700" size={26}>
                  {info.balanceInr.toLocaleString("en-IN")}
                </AppText>
                <AppText muted size={11}>
                  1 point = ₹1 · redeem on packages and store orders
                </AppText>
              </View>
            </View>
          </Card>

          {/* Share code */}
          <Card>
            <AppText weight="700" size={15} style={{ marginBottom: 4 }}>
              Your referral code
            </AppText>
            <AppText muted size={12} style={{ marginBottom: 12 }}>
              {info.isActive
                ? info.rewardType === "percent"
                  ? `Earn ${info.rewardValue}% of your friend's first purchase in points.`
                  : `Earn ${info.rewardValue.toLocaleString("en-IN")} points when a friend makes their first purchase.`
                : "The referral program is currently paused — codes can still be shared."}
            </AppText>
            <Pressable
              onPress={onShare}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}0D`,
                marginBottom: 12,
              }}
            >
              <AppText weight="700" size={18} color={colors.primary}>
                {info.code}
              </AppText>
              <Feather name="share-2" size={18} color={colors.primary} />
            </Pressable>
            <Button label="Share your code" onPress={onShare} icon="share-2" />
            {info.referredCount > 0 ? (
              <AppText muted size={12} style={{ marginTop: 10, textAlign: "center" }}>
                {info.referredCount} friend{info.referredCount === 1 ? "" : "s"} joined
                with your code
              </AppText>
            ) : null}
          </Card>

          {/* Apply someone's code */}
          {!info.appliedCode ? (
            <Card>
              <AppText weight="700" size={15} style={{ marginBottom: 4 }}>
                Got a friend's code?
              </AppText>
              <AppText muted size={12} style={{ marginBottom: 12 }}>
                Enter it once — they'll earn rewards on your first purchase.
              </AppText>
              <Field
                label="Referral code"
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder="ICN-XXXXXX"
                autoCapitalize="characters"
              />
              <View style={{ height: 12 }} />
              <Button label="Apply code" onPress={onApply} loading={applying} />
            </Card>
          ) : null}

          {/* History */}
          <Card>
            <AppText weight="700" size={15} style={{ marginBottom: 10 }}>
              Points history
            </AppText>
            {info.history.length === 0 ? (
              <EmptyState
                icon="clock"
                title="No activity yet"
                message="Rewards you earn and points you spend will show up here."
              />
            ) : (
              <View style={{ gap: 12 }}>
                {info.history.map((t) => (
                  <View
                    key={t.id}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                  >
                    <Feather
                      name={t.amountInr >= 0 ? "arrow-down-left" : "arrow-up-right"}
                      size={16}
                      color={t.amountInr >= 0 ? colors.success : colors.mutedForeground}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText size={13}>{t.label}</AppText>
                      <AppText muted size={11}>
                        {formatWhen(t.createdAt)}
                      </AppText>
                    </View>
                    <AppText
                      weight="700"
                      size={14}
                      color={t.amountInr >= 0 ? colors.success : colors.foreground}
                    >
                      {t.amountInr >= 0 ? "+" : "−"}
                      {Math.abs(t.amountInr).toLocaleString("en-IN")}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}
    </Screen>
  );
}
