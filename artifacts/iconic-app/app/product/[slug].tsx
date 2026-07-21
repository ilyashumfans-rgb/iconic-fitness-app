import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useListStoreProducts,
  type StoreProduct,
} from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { ModalHeader } from "@/components/ModalHeader";
import { ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/lib/cart";
import { resolveImageUrl } from "@/lib/images";

export default function ProductDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { add, count } = useCart();

  const productsQuery = useListStoreProducts();
  const product = useMemo(
    () =>
      ((productsQuery.data ?? []) as StoreProduct[]).find(
        (p) => p.slug === slug,
      ),
    [productsQuery.data, slug],
  );

  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [heroIdx, setHeroIdx] = useState(0);

  if (productsQuery.isLoading) {
    return (
      <Shell>
        <LoadingView />
      </Shell>
    );
  }
  if (productsQuery.isError || !product) {
    return (
      <Shell>
        <ErrorView onRetry={() => void productsQuery.refetch()} />
      </Shell>
    );
  }

  const gallery = [
    product.imageUrl,
    ...(product.gallery ?? []).filter((g: string) => g && g !== product.imageUrl),
  ];
  const hero = gallery[Math.min(heroIdx, gallery.length - 1)];
  const sizes = product.sizes ?? [];
  const colorsOpt = product.colors ?? [];
  const out = (product.stock ?? 0) <= 0;
  const discount =
    product.originalPriceInr > product.priceInr
      ? Math.round(
          ((product.originalPriceInr - product.priceInr) /
            product.originalPriceInr) *
            100,
        )
      : 0;

  const onAdd = (goToCart: boolean) => {
    if (sizes.length > 0 && !size) {
      Alert.alert("Pick a size", "Please choose a size first.");
      return;
    }
    if (colorsOpt.length > 0 && !color) {
      Alert.alert("Pick a color", "Please choose a color first.");
      return;
    }
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceInr: product.priceInr,
        imageUrl: product.imageUrl,
        size,
        color,
      },
      qty,
    );
    if (goToCart) {
      router.push("/cart");
    } else {
      Alert.alert("Added to cart", `${product.name} × ${qty}`);
    }
  };

  return (
    <Shell>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Image
          source={{ uri: resolveImageUrl(hero) }}
          style={{
            width: "100%",
            aspectRatio: 1,
            backgroundColor: colors.elevated,
          }}
          resizeMode="cover"
        />
        {gallery.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, gap: 8 }}
          >
            {gallery.map((g, i) => (
              <Pressable key={`${g}-${i}`} onPress={() => setHeroIdx(i)}>
                <Image
                  source={{ uri: resolveImageUrl(g) }}
                  style={[
                    styles.thumb,
                    {
                      backgroundColor: colors.elevated,
                      borderColor:
                        i === heroIdx ? colors.primary : colors.border,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 14 }}>
          <View>
            <AppText weight="700" size={20}>
              {product.name}
            </AppText>
            <View style={styles.priceRow}>
              <AppText weight="700" size={22}>
                ₹{product.priceInr}
              </AppText>
              {discount > 0 ? (
                <>
                  <AppText
                    muted
                    size={15}
                    style={{ textDecorationLine: "line-through" }}
                  >
                    ₹{product.originalPriceInr}
                  </AppText>
                  <View
                    style={[styles.tag, { backgroundColor: colors.primary }]}
                  >
                    <AppText
                      weight="700"
                      size={11}
                      style={{ color: colors.primaryForeground }}
                    >
                      {discount}% OFF
                    </AppText>
                  </View>
                </>
              ) : null}
            </View>
            {out ? (
              <AppText
                weight="600"
                size={13}
                style={{ color: colors.destructive, marginTop: 4 }}
              >
                Out of stock
              </AppText>
            ) : null}
          </View>

          {product.description ? (
            <AppText muted size={14} style={{ lineHeight: 21 }}>
              {product.description}
            </AppText>
          ) : null}

          {sizes.length > 0 ? (
            <OptionRow
              label="Size"
              options={sizes}
              value={size}
              onChange={setSize}
            />
          ) : null}
          {colorsOpt.length > 0 ? (
            <OptionRow
              label="Color"
              options={colorsOpt}
              value={color}
              onChange={setColor}
            />
          ) : null}

          {/* Quantity */}
          <View style={{ gap: 8 }}>
            <AppText weight="600" size={14}>
              Quantity
            </AppText>
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                style={[styles.qtyBtn, { backgroundColor: colors.elevated }]}
              >
                <AppText weight="700" size={18}>
                  −
                </AppText>
              </Pressable>
              <AppText weight="700" size={17} style={{ minWidth: 32, textAlign: "center" }}>
                {qty}
              </AppText>
              <Pressable
                onPress={() => setQty((q) => Math.min(99, q + 1))}
                style={[styles.qtyBtn, { backgroundColor: colors.elevated }]}
              >
                <AppText weight="700" size={18}>
                  +
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 10, marginTop: 6 }}>
            <Button
              label="Add to cart"
              icon="shopping-cart"
              variant="secondary"
              disabled={out}
              onPress={() => onAdd(false)}
            />
            <Button
              label="Buy now"
              icon="arrow-right"
              disabled={out}
              onPress={() => onAdd(true)}
            />
            {count > 0 ? (
              <Button
                label={`View cart (${count})`}
                variant="ghost"
                onPress={() => router.push("/cart")}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ModalHeader title="Product" />
      {children}
    </SafeAreaView>
  );
}

function OptionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 8 }}>
      <AppText weight="600" size={14}>
        {label}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const active = value === o;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(active ? "" : o)}
              style={[
                styles.option,
                {
                  backgroundColor: active ? colors.primary : colors.elevated,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <AppText
                weight="600"
                size={13}
                style={{
                  color: active ? colors.primaryForeground : colors.foreground,
                }}
              >
                {o}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
});
