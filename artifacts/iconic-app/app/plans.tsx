import {
  useListMemberships,
  useGetMyMembership,
  getListMembershipsQueryKey,
  getGetMyMembershipQueryKey,
} from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";
import { ModalHeader } from "@/components/ModalHeader";
import { PlanCard } from "@/components/PlanCard";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

type Period = "monthly" | "quarterly";

const PERIOD_ORDER: Period[] = ["monthly", "quarterly"];
const PERIOD_LABEL: Record<Period, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export default function PlansScreen() {
  const colors = useColors();
  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });
  const mine = useGetMyMembership({
    query: { queryKey: getGetMyMembershipQueryKey() },
  });

  // Membership plans only — annual plans live on the Offers screen.
  const plans = useMemo(
    () => (query.data ?? []).filter((p) => p.billingPeriod !== "annual"),
    [query.data],
  );

  // Which billing periods actually have plans (keeps the toggle honest).
  const availablePeriods = useMemo(
    () => PERIOD_ORDER.filter((p) => plans.some((pl) => pl.billingPeriod === p)),
    [plans],
  );

  const [period, setPeriod] = useState<Period>("monthly");
  // Default the toggle to the first period that has plans.
  const activePeriod = availablePeriods.includes(period)
    ? period
    : availablePeriods[0] ?? "monthly";

  const visible = useMemo(
    () =>
      plans
        .filter((p) => p.billingPeriod === activePeriod)
        .map((p) => ({ ...p, name: p.name.trim() }))
        .sort((a, b) => {
          if (a.popular && !b.popular) return 1;
          if (!a.popular && b.popular) return -1;
          return a.priceInr - b.priceInr;
        }),
    [plans, activePeriod],
  );

  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ModalHeader title="Membership Plans" />
      <AppText muted size={14} style={{ marginBottom: 16 }}>
        One pass. Every gym. Choose the plan that fits your goals.
      </AppText>

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon="credit-card"
          title="No plans yet"
          message="Membership plans are on the way. Check back soon."
        />
      ) : (
        <>
          {availablePeriods.length > 1 ? (
            <View
              style={[
                styles.toggle,
                { backgroundColor: colors.elevated, borderColor: colors.border },
              ]}
            >
              {availablePeriods.map((p) => {
                const on = p === activePeriod;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPeriod(p)}
                    style={[
                      styles.toggleBtn,
                      on && { backgroundColor: colors.primary },
                    ]}
                  >
                    <AppText
                      size={13}
                      weight="700"
                      color={on ? colors.primaryForeground : colors.mutedForeground}
                    >
                      {PERIOD_LABEL[p]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={{ gap: 14 }}>
            {visible.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={mine.data?.planId === plan.id}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 999,
  },
});
