import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useListStoreCategories,
  useListStoreProducts,
  type StoreProduct,
} from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Field } from "@/components/Field";
import { WEB_NOTCH_TOP } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/lib/cart";
import { resolveImageUrl } from "@/lib/images";

export default function StoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { count } = useCart();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categoriesQuery = useListStoreCategories();
  const productsQuery = useListStoreProducts();

  const products = useMemo(() => {
    const all = (productsQuery.data ?? []) as StoreProduct[];
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      if (category && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [productsQuery.data, search, category]);

  const categories = categoriesQuery.data ?? [];

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? WEB_NOTCH_TOP : 8 },
        ]}
      >
        <AppText weight="700" size={22}>
          Store
        </AppText>
        <Pressable
          onPress={() => router.push("/cart")}
          style={[styles.cartBtn, { backgroundColor: colors.elevated }]}
          hitSlop={8}
        >
          <Feather name="shopping-cart" size={20} color={colors.foreground} />
          {count > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <AppText
                weight="700"
                size={11}
                style={{ color: colors.primaryForeground }}
              >
                {count > 99 ? "99+" : count}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Field
          placeholder="Search products…"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {[{ name: "All", slug: "" }, ...categories].map((c) => {
            const isThis = c.slug ? category === c.slug : category === null;
            return (
              <Pressable
                key={c.slug || "all"}
                onPress={() => setCategory(c.slug || null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isThis ? colors.primary : colors.elevated,
                    borderColor: isThis ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText
                  weight="600"
                  size={13}
                  style={{
                    color: isThis
                      ? colors.primaryForeground
                      : colors.foreground,
                  }}
                >
                  {c.name}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {productsQuery.isLoading ? (
        <LoadingView />
      ) : productsQuery.isError ? (
        <ErrorView onRetry={() => void productsQuery.refetch()} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          title="No products found"
          message={
            search || category
              ? "Try a different search or category."
              : "New gear is on the way — check back soon."
          }
        />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingTop: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isRefetching}
              onRefresh={() => void productsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.slug}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: StoreProduct;
  onPress: () => void;
}) {
  const colors = useColors();
  const discount =
    product.originalPriceInr > product.priceInr
      ? Math.round(
          ((product.originalPriceInr - product.priceInr) /
            product.originalPriceInr) *
            100,
        )
      : 0;
  const out = (product.stock ?? 0) <= 0;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: resolveImageUrl(product.imageUrl) }}
            style={[styles.cardImage, { backgroundColor: colors.elevated }]}
            resizeMode="cover"
          />
          {discount > 0 ? (
            <View style={[styles.discountTag, { backgroundColor: colors.primary }]}>
              <AppText
                weight="700"
                size={11}
                style={{ color: colors.primaryForeground }}
              >
                {discount}% OFF
              </AppText>
            </View>
          ) : null}
          {out ? (
            <View style={styles.outOverlay}>
              <AppText weight="700" size={13} style={{ color: "#fff" }}>
                Out of stock
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={{ padding: 10, gap: 4 }}>
          <AppText weight="600" size={14} numberOfLines={2}>
            {product.name}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppText weight="700" size={15}>
              ₹{product.priceInr}
            </AppText>
            {discount > 0 ? (
              <AppText
                muted
                size={12}
                style={{ textDecorationLine: "line-through" }}
              >
                ₹{product.originalPriceInr}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
  },
  discountTag: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  outOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
