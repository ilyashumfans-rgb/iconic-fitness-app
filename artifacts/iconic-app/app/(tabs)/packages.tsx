import { Feather } from "@expo/vector-icons";
import {
  useListMemberships,
  getListMembershipsQueryKey,
  useListPackageCategories,
  getListPackageCategoriesQueryKey,
  type PackageCategory,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PackageCard } from "@/components/PackageCard";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";
import {
  EmptyState,
  ErrorView,
  LoadingView,
  SectionHeader,
} from "@/components/ui-bits";

// Mirrors the PackageCard layout: media block on the left, details on the right.
function CategoryCard({
  name,
  imageUrl,
  count,
  onPress,
}: {
  name: string;
  imageUrl: string;
  count: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const uri = resolveImageUrl(imageUrl);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.media}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.primary + "33", colors.card]}
            style={styles.image}
          >
            <View style={styles.mediaFallback}>
              <Feather name="grid" size={26} color={colors.primary} />
            </View>
          </LinearGradient>
        )}
      </View>

      <View style={styles.body}>
        <View>
          <AppText weight="700" size={17} numberOfLines={1}>
            {name}
          </AppText>
          <AppText muted size={13} numberOfLines={1} style={{ marginTop: 3 }}>
            {count === 0
              ? "Live plans at your branch"
              : `${count} ${count === 1 ? "package" : "packages"}`}
          </AppText>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.footRow}>
          <AppText weight="600" size={14} color={colors.primary}>
            {count === 0 ? "View plans & prices" : "View packages"}
          </AppText>
          <View style={{ flex: 1 }} />
          <Feather
            name="chevron-right"
            size={20}
            color={colors.mutedForeground}
          />
        </View>
      </View>
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
  const router = useRouter();

  // The URL is the single source of truth for which category is open:
  // /(tabs)/packages?categoryId=N (also the deep-link target from Home's
  // category tiles). Absent/invalid param = category picker.
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const paramCategoryId = Number(params.categoryId);
  const categoryId =
    params.categoryId && Number.isFinite(paramCategoryId) && paramCategoryId > 0
      ? paramCategoryId
      : null;
  const setCategoryId = (id: number | null) => {
    // "" (rather than removing the key) keeps setParams' types happy and
    // parses back to null above.
    router.setParams({ categoryId: id ? String(id) : "" });
  };

  const categories = categoriesQuery.data ?? [];

  // If the open category is hidden/deleted by an admin, go back to the picker.
  useEffect(() => {
    if (
      categoryId !== null &&
      categoriesQuery.isSuccess &&
      !categories.some((c) => c.id === categoryId)
    ) {
      setCategoryId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const countFor = (c: PackageCategory) =>
    annual.filter((p) => (p.categoryId ?? 0) === c.id).length;

  // Wait until the categories query settles before choosing picker vs list,
  // otherwise the list flashes first and then jumps to the category picker.
  const categoriesSettled =
    categoriesQuery.isSuccess || categoriesQuery.isError;
  const hasCategories = categories.length > 0;
  // No categories configured (or fetch failed) → behave like before and list everything.
  const showPicker = hasCategories && categoryId === null;

  const visible = useMemo(() => {
    if (!hasCategories || categoryId === null) return annual;
    return annual.filter((p) => (p.categoryId ?? 0) === categoryId);
  }, [annual, categoryId, hasCategories]);

  const openCategory = categories.find((c) => c.id === categoryId);

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

      {!categoriesSettled && categoryId === null ? (
        <LoadingView />
      ) : showPicker ? (
        query.isLoading ? (
          <LoadingView />
        ) : query.isError ? (
          <ErrorView onRetry={() => void query.refetch()} />
        ) : (
          <View style={{ gap: 14 }}>
            {categories.map((c) => {
              const count = countFor(c);
              return (
                <CategoryCard
                  key={c.id}
                  name={c.name}
                  imageUrl={c.imageUrl ?? ""}
                  count={count}
                  onPress={() =>
                    // Categories without in-app packages lead straight to the
                    // live branch list to buy a plan online (YoActiv-backed).
                    count === 0
                      ? router.push("/book-package")
                      : setCategoryId(c.id)
                  }
                />
              );
            })}
          </View>
        )
      ) : (
        <>
          {hasCategories ? (
            <BackRow
              label={openCategory ? openCategory.name : "Packages"}
              onBack={() => setCategoryId(null)}
            />
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
                !hasCategories
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
        </>
      )}
    </Screen>
  );
}

function BackRow({ label, onBack }: { label: string; onBack: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.backRow}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={({ pressed }) => [
          styles.backBtn,
          {
            backgroundColor: colors.elevated,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="chevron-left" size={18} color={colors.foreground} />
      </Pressable>
      <AppText weight="700" size={17} style={{ marginLeft: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same shape as PackageCard so categories and packages feel like one family.
  card: {
    borderRadius: 20,
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: 170,
  },
  image: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  footRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
