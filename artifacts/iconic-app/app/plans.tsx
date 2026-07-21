import { Feather } from "@expo/vector-icons";
import {
  useListMemberships,
  useGetMyMembership,
  getListMembershipsQueryKey,
  getGetMyMembershipQueryKey,
  type MyMembership,
} from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { PlanCard } from "@/components/PlanCard";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { istDateLabel, istDateStr } from "@/lib/dates";

/** Whole IST calendar days from today until `dateIso` (negative = past). */
function daysUntilIst(dateIso: string): number {
  const today = Date.parse(`${istDateStr()}T00:00:00Z`);
  const target = Date.parse(`${istDateStr(new Date(dateIso))}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

/** Signed-in member's current plan summary shown above the plan list. */
function CurrentPlanCard({ membership }: { membership: MyMembership }) {
  const colors = useColors();
  const expiryKnown = membership.expiryKnown !== false;
  const days = expiryKnown ? daysUntilIst(membership.renewsOn) : null;
  const isExpired =
    membership.status === "expired" || (days !== null && days < 0);
  const soon = !isExpired && days !== null && days <= 7;
  const pillColor = isExpired ? colors.destructive : colors.primary;

  return (
    <Card style={{ gap: 10, marginBottom: 18 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <AppText muted size={12} weight="600" style={{ letterSpacing: 0.5 }}>
            YOUR CURRENT PLAN
          </AppText>
          <AppText weight="700" size={17} style={{ marginTop: 2 }}>
            {membership.planName}
          </AppText>
          {membership.branchName ? (
            <AppText muted size={13}>
              {membership.branchName}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: pillColor + "22" }]}>
          <AppText
            size={12}
            weight="700"
            color={pillColor}
            style={{ textTransform: "capitalize" }}
          >
            {isExpired ? "expired" : membership.status}
          </AppText>
        </View>
      </View>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <AppText muted size={12}>
            Started on
          </AppText>
          <AppText weight="700" size={14}>
            {membership.startedOn
              ? istDateLabel(istDateStr(new Date(membership.startedOn)))
              : "—"}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText muted size={12}>
            {isExpired ? "Expired on" : "Expires on"}
          </AppText>
          <AppText
            weight="700"
            size={14}
            color={
              isExpired
                ? colors.destructive
                : soon
                  ? colors.warning
                  : colors.foreground
            }
          >
            {expiryKnown
              ? istDateLabel(istDateStr(new Date(membership.renewsOn)))
              : "—"}
          </AppText>
        </View>
      </View>
      {days !== null ? (
        <View
          style={[
            styles.renewNote,
            {
              backgroundColor: isExpired
                ? colors.destructive + "1A"
                : soon
                  ? colors.warning + "1A"
                  : colors.muted,
            },
          ]}
        >
          <Feather
            name={isExpired ? "alert-circle" : soon ? "clock" : "check-circle"}
            size={14}
            color={
              isExpired
                ? colors.destructive
                : soon
                  ? colors.warning
                  : colors.success
            }
          />
          <AppText
            size={13}
            weight="600"
            color={
              isExpired
                ? colors.destructive
                : soon
                  ? colors.warning
                  : colors.foreground
            }
            style={{ flex: 1 }}
          >
            {isExpired
              ? "Your plan has expired — renew to keep access"
              : days === 0
                ? "Your plan expires today — renew to stay active"
                : days === 1
                  ? "1 day left on your plan"
                  : `${days} days left on your plan`}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

type Period = "monthly" | "quarterly" | "half_yearly" | "yearly";

const PERIOD_ORDER: Period[] = ["monthly", "quarterly", "half_yearly", "yearly"];
const PERIOD_LABEL: Record<Period, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "6 Months",
  yearly: "Yearly",
};

export default function PlansScreen() {
  const colors = useColors();
  const { isGuest } = useGuest();
  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });
  // Only signed-in members get their own plan details on this page.
  const mine = useGetMyMembership({
    query: { queryKey: getGetMyMembershipQueryKey(), enabled: !isGuest },
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

      {!isGuest && mine.data ? <CurrentPlanCard membership={mine.data} /> : null}

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
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  renewNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
