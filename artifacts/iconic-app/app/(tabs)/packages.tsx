import {
  useListMemberships,
  getListMembershipsQueryKey,
  useListPackageCategories,
  getListPackageCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PackageCard } from "@/components/PackageCard";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";
import {
  Chip,
  ChipRow,
  EmptyState,
  ErrorView,
  LoadingView,
  SectionHeader,
} from "@/components/ui-bits";

function CategoryChip({
  label,
  imageUrl,
  active,
  onPress,
}: {
  label: string;
  imageUrl: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: 6,
        paddingRight: 16,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : colors.elevated,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 26, height: 26, borderRadius: 13 }}
      />
      <AppText
        weight="600"
        size={13}
        color={active ? colors.primaryForeground : colors.mutedForeground}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default function PackagesScreen() {
  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });
  const categoriesQuery = useListPackageCategories({
    query: { queryKey: getListPackageCategoriesQueryKey() },
  });
  const [categoryId, setCategoryId] = useState<number>(0);

  const categories = categoriesQuery.data ?? [];

  // If the selected category is hidden/deleted by an admin, fall back to All.
  useEffect(() => {
    if (
      categoryId !== 0 &&
      categoriesQuery.isSuccess &&
      !categories.some((c) => c.id === categoryId)
    ) {
      setCategoryId(0);
    }
  }, [categoryId, categories, categoriesQuery.isSuccess]);

  // Packages = annual plans (created under the admin "Packages" tab).
  const annual = useMemo(
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

  // 0 = "All". Plans with an unknown/removed category only show under "All".
  const visible = useMemo(
    () =>
      categoryId === 0
        ? annual
        : annual.filter((p) => (p.categoryId ?? 0) === categoryId),
    [annual, categoryId],
  );

  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
        void categoriesQuery.refetch();
      }}
    >
      <SectionHeader title="Packages" />
      <AppText muted size={14} style={{ marginBottom: 16 }}>
        Go annual and save the most across the year.
      </AppText>

      {categories.length > 0 ? (
        <View style={{ marginBottom: 16 }}>
          <ChipRow>
            <Chip
              label="All"
              active={categoryId === 0}
              onPress={() => setCategoryId(0)}
            />
            {categories.map((c) =>
              c.imageUrl ? (
                <CategoryChip
                  key={c.id}
                  label={c.name}
                  imageUrl={c.imageUrl}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ) : (
                <Chip
                  key={c.id}
                  label={c.name}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ),
            )}
          </ChipRow>
        </View>
      ) : null}

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="package"
          title="No packages right now"
          message={
            categoryId === 0
              ? "Annual packages are on the way. Check back soon."
              : "No packages in this category yet. Try another one."
          }
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
