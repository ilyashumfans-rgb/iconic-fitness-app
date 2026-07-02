import { Feather } from "@expo/vector-icons";
import {
  useListMemberships,
  useGetMyMembership,
  getListMembershipsQueryKey,
  getGetMyMembershipQueryKey,
  type MembershipPlan,
} from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { membershipsUrl, openExternal } from "@/lib/links";

type Period = "monthly" | "quarterly" | "annual";

const PERIOD_ORDER: Period[] = ["monthly", "quarterly", "annual"];
const PERIOD_LABEL: Record<Period, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};
const PERIOD_SUFFIX: Record<Period, string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  annual: "/yr",
};

export default function PlansScreen() {
  const colors = useColors();
  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });
  const mine = useGetMyMembership({
    query: { queryKey: getGetMyMembershipQueryKey() },
  });

  const plans = query.data ?? [];

  // Which billing periods actually have plans (keeps the toggle honest).
  const availablePeriods = useMemo(
    () =>
      PERIOD_ORDER.filter((p) =>
        plans.some((pl) => pl.billingPeriod === p),
      ),
    [plans],
  );

  const [period, setPeriod] = useState<Period>("monthly");
  // Default the toggle to the first period that has plans.
  const activePeriod =
    availablePeriods.includes(period)
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
                period={activePeriod}
                isCurrent={mine.data?.planId === plan.id}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function PlanCard({
  plan,
  period,
  isCurrent,
}: {
  plan: MembershipPlan;
  period: Period;
  isCurrent: boolean;
}) {
  const colors = useColors();
  const savings =
    plan.originalPriceInr > plan.priceInr
      ? Math.round(
          ((plan.originalPriceInr - plan.priceInr) / plan.originalPriceInr) * 100,
        )
      : 0;

  return (
    <Card
      style={{
        gap: 12,
        borderWidth: plan.popular ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: plan.popular ? colors.primary : colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={18}>
            {plan.name}
          </AppText>
          {plan.tagline ? (
            <AppText muted size={13} style={{ marginTop: 2 }}>
              {plan.tagline}
            </AppText>
          ) : null}
        </View>
        {plan.popular ? (
          <View
            style={[styles.pill, { backgroundColor: colors.primary + "22" }]}
          >
            <Feather name="star" size={11} color={colors.primary} />
            <AppText size={11} weight="700" color={colors.primary}>
              Popular
            </AppText>
          </View>
        ) : isCurrent ? (
          <View
            style={[styles.pill, { backgroundColor: colors.primary + "22" }]}
          >
            <AppText size={11} weight="700" color={colors.primary}>
              Current
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <AppText weight="700" size={30}>
          ₹{plan.priceInr.toLocaleString("en-IN")}
        </AppText>
        <AppText muted size={14} style={{ marginBottom: 5 }}>
          {PERIOD_SUFFIX[period]}
        </AppText>
        {savings > 0 ? (
          <View
            style={[
              styles.pill,
              { backgroundColor: colors.success + "22", marginBottom: 4 },
            ]}
          >
            <AppText size={11} weight="700" color={colors.success}>
              SAVE {savings}%
            </AppText>
          </View>
        ) : null}
      </View>
      {plan.originalPriceInr > plan.priceInr ? (
        <AppText
          muted
          size={13}
          style={{ marginTop: -6, textDecorationLine: "line-through" }}
        >
          ₹{plan.originalPriceInr.toLocaleString("en-IN")}
        </AppText>
      ) : null}

      <View style={{ gap: 8, marginTop: 2 }}>
        <Perk text={`${plan.gymsIncluded}+ premium gyms`} />
        <Perk text={`${plan.classesPerMonth} classes / month`} />
        {plan.perks.map((perk) => (
          <Perk key={perk} text={perk} />
        ))}
      </View>

      {isCurrent ? (
        <Button
          label="Current plan"
          variant="secondary"
          disabled
          onPress={() => {}}
        />
      ) : (
        <Button
          label="Get this plan"
          icon="arrow-right"
          onPress={() => openExternal(membershipsUrl)}
        />
      )}
    </Card>
  );
}

function Perk({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <Feather
        name="check"
        size={16}
        color={colors.primary}
        style={{ marginTop: 1 }}
      />
      <AppText size={14} style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
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
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
