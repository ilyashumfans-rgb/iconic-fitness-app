import {
  useListMemberships,
  getListMembershipsQueryKey,
} from "@workspace/api-client-react";
import { useMemo } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { PackageCard } from "@/components/PackageCard";
import { Screen } from "@/components/Screen";
import {
  EmptyState,
  ErrorView,
  LoadingView,
  SectionHeader,
} from "@/components/ui-bits";

export default function PackagesScreen() {
  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });

  // Packages = annual plans (created under the admin "Packages" tab).
  const visible = useMemo(
    () =>
      (query.data ?? [])
        .filter((p) => p.billingPeriod === "annual")
        .map((p) => ({ ...p, name: p.name.trim() }))
        .sort((a, b) => {
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return a.priceInr - b.priceInr;
        }),
    [query.data],
  );

  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <SectionHeader title="Packages" />
      <AppText muted size={14} style={{ marginBottom: 16 }}>
        Go annual and save the most across the year.
      </AppText>

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="package"
          title="No packages right now"
          message="Annual packages are on the way. Check back soon."
        />
      ) : (
        <View style={{ gap: 14 }}>
          {visible.map((plan) => (
            <PackageCard key={plan.id} plan={plan} />
          ))}
        </View>
      )}
    </Screen>
  );
}
