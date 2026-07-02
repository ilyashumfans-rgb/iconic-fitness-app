import {
  useListMemberships,
  useGetMyMembership,
  getListMembershipsQueryKey,
  getGetMyMembershipQueryKey,
} from "@workspace/api-client-react";
import { useMemo } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { ModalHeader } from "@/components/ModalHeader";
import { PlanCard } from "@/components/PlanCard";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";

export default function OffersScreen() {
  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });
  const mine = useGetMyMembership({
    query: { queryKey: getGetMyMembershipQueryKey() },
  });

  // Offers = annual plans (created under the admin "Annual Plans" tab).
  const visible = useMemo(
    () =>
      (query.data ?? [])
        .filter((p) => p.billingPeriod === "annual")
        .map((p) => ({ ...p, name: p.name.trim() }))
        .sort((a, b) => {
          if (a.popular && !b.popular) return 1;
          if (!a.popular && b.popular) return -1;
          return a.priceInr - b.priceInr;
        }),
    [query.data],
  );

  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ModalHeader title="Offers" />
      <AppText muted size={14} style={{ marginBottom: 16 }}>
        Go annual and save the most across the year.
      </AppText>

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No offers right now"
          message="Annual offers are on the way. Check back soon."
        />
      ) : (
        <View style={{ gap: 14 }}>
          {visible.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={mine.data?.planId === plan.id}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
