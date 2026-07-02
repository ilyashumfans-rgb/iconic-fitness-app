import { Feather } from "@expo/vector-icons";
import { type MembershipPlan } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

export function PackageCard({
  plan,
  onPress,
}: {
  plan: MembershipPlan;
  onPress?: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const uri = resolveImageUrl(plan.imageUrl);
  const handlePress = onPress ?? (() => router.push(`/package/${plan.id}`));

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: plan.popular ? colors.primary : colors.border,
          borderWidth: plan.popular ? 1.5 : StyleSheet.hairlineWidth,
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
              <Feather name="package" size={26} color={colors.primary} />
            </View>
          </LinearGradient>
        )}
      </View>

      <View style={styles.body}>
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={17} numberOfLines={1}>
            {plan.name}
          </AppText>
          {plan.tagline ? (
            <AppText muted size={13} numberOfLines={2} style={{ marginTop: 3 }}>
              {plan.tagline}
            </AppText>
          ) : null}
        </View>

        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        />

        <View style={styles.priceRow}>
          <AppText weight="700" size={18}>
            ₹{plan.priceInr.toLocaleString("en-IN")}
          </AppText>
          <AppText muted size={13} style={{ marginLeft: 2 }}>
            {" "}
            / year
          </AppText>
          <AppText muted size={12} style={{ marginLeft: 8 }}>
            onwards
          </AppText>
          <View style={{ flex: 1 }} />
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 20,
    overflow: "hidden",
    height: 138,
  },
  media: {
    width: 122,
    height: "100%",
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
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
