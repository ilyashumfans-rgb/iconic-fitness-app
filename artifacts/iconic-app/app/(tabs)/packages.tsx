import { Feather } from "@expo/vector-icons";
import {
  useListMemberships,
  getListMembershipsQueryKey,
  useListPackageCategories,
  getListPackageCategoriesQueryKey,
  type PackageCategory,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

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

function CategoryCard({
  name,
  imageUrl,
  count,
  icon,
  onPress,
}: {
  name: string;
  imageUrl: string;
  count: number;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  const colors = useColors();
  const uri = resolveImageUrl(imageUrl);
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Animated.View
      style={[
        styles.catShadow,
        { shadowColor: colors.primary, transform: [{ scale }] },
      ]}
    >
      <Pressable
        onPressIn={() => springTo(0.97)}
        onPressOut={() => springTo(1)}
        onPress={onPress}
      >
        <LinearGradient
          colors={[colors.primary + "66", colors.border]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.catBorder}
        >
          <LinearGradient
            colors={[colors.elevated, colors.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.catInner}
          >
            {/* Sheen highlight for depth */}
            <LinearGradient
              colors={["#FFFFFF14", "#FFFFFF00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.catSheen}
              pointerEvents="none"
            />

            {/* Logo — raised circular tile on the left */}
            <View
              style={[
                styles.logoWrap,
                { shadowColor: "#000", backgroundColor: colors.background },
              ]}
            >
              <LinearGradient
                colors={[colors.primary + "55", colors.card]}
                style={styles.logoRing}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.logoImg} />
                ) : (
                  <View style={styles.logoFallback}>
                    <Feather
                      name={icon ?? "grid"}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Name on the right */}
            <View style={{ flex: 1, marginLeft: 16 }}>
              <AppText weight="700" size={18} numberOfLines={1}>
                {name}
              </AppText>
              <AppText muted size={12.5} style={{ marginTop: 3 }}>
                {count} {count === 1 ? "package" : "packages"}
              </AppText>
            </View>

            <View
              style={[styles.chevBubble, { backgroundColor: colors.primary }]}
            >
              <Feather
                name="arrow-right"
                size={16}
                color={colors.primaryForeground}
              />
            </View>
          </LinearGradient>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function PackagesScreen() {
  const query = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });
  const categoriesQuery = useListPackageCategories({
    query: { queryKey: getListPackageCategoriesQueryKey() },
  });
  // null = category picker; 0 = "All packages"; >0 = specific category
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const categories = categoriesQuery.data ?? [];

  // If the open category is hidden/deleted by an admin, go back to the picker.
  useEffect(() => {
    if (
      categoryId !== null &&
      categoryId !== 0 &&
      categoriesQuery.isSuccess &&
      !categories.some((c) => c.id === categoryId)
    ) {
      setCategoryId(null);
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
    if (!hasCategories || categoryId === 0 || categoryId === null) return annual;
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
            {categories.map((c) => (
              <CategoryCard
                key={c.id}
                name={c.name}
                imageUrl={c.imageUrl ?? ""}
                count={countFor(c)}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
            <CategoryCard
              name="All packages"
              imageUrl=""
              icon="layers"
              count={annual.length}
              onPress={() => setCategoryId(0)}
            />
          </View>
        )
      ) : (
        <>
          {hasCategories ? (
            <BackRow
              label={openCategory ? openCategory.name : "All packages"}
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
                !hasCategories || categoryId === 0
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
  // Shadow lives on the outer wrapper; clipping happens on inner views.
  catShadow: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    borderRadius: 22,
  },
  catBorder: {
    borderRadius: 22,
    padding: 1.5,
  },
  catInner: {
    borderRadius: 20.5,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  catSheen: {
    ...StyleSheet.absoluteFillObject,
    height: 34,
  },
  logoWrap: {
    borderRadius: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  logoRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  chevBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
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
