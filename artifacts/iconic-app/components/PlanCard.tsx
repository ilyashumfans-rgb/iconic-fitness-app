import { Feather } from "@expo/vector-icons";
import { type MembershipPlan } from "@workspace/api-client-react";
import { View, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { membershipsUrl, openExternal } from "@/lib/links";

const PERIOD_SUFFIX: Record<string, string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  annual: "/yr",
};

export function PlanCard({
  plan,
  isCurrent,
}: {
  plan: MembershipPlan;
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
          <View style={[styles.pill, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="star" size={11} color={colors.primary} />
            <AppText size={11} weight="700" color={colors.primary}>
              Popular
            </AppText>
          </View>
        ) : isCurrent ? (
          <View style={[styles.pill, { backgroundColor: colors.primary + "22" }]}>
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
          {PERIOD_SUFFIX[plan.billingPeriod] ?? ""}
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
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
