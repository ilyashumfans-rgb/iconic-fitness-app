import { Feather } from "@expo/vector-icons";
import type { CoachCategory } from "@workspace/api-client-react";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

const PREVIEW_BENEFITS = 2;

/** Compact category card: banner image with count chip, modest title, short copy, benefits, actions. */
export function CoachCategoryCard({ category, onSeeCoaches }: { category: CoachCategory; onSeeCoaches: () => void }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const image = resolveImageUrl(category.imageUrl);
  const count = category.coachCount ?? 0;
  const extraBenefits = Math.max(0, category.benefits.length - PREVIEW_BENEFITS);
  const hasMore = !!category.details || extraBenefits > 0 || (category.summary?.length ?? 0) > 110;
  const benefits = expanded ? category.benefits : category.benefits.slice(0, PREVIEW_BENEFITS);
  return (
    <View
      testID={`card-coach-category-${category.id}`}
      style={{ borderRadius: 18, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
    >
      <View>
        {image ? (
          <Image source={{ uri: image }} style={{ width: "100%", aspectRatio: 2.4 }} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ width: "100%", aspectRatio: 3.2, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}>
            <Feather name="users" size={24} color={colors.primary} />
          </View>
        )}
        {count > 0 ? (
          <View
            style={{
              position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 5,
              backgroundColor: "rgba(10,12,8,0.78)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            <AppText weight="600" size={11} color="#F4F6F0">{count} {count === 1 ? "coach" : "coaches"}</AppText>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 8 }}>
        <AppText weight="700" size={16} accessibilityRole="header">{category.title}</AppText>
        {category.summary ? (
          <AppText muted size={13} numberOfLines={expanded ? undefined : 2} style={{ lineHeight: 18 }}>{category.summary}</AppText>
        ) : null}
        {benefits.length > 0 ? (
          <View style={{ gap: 5 }}>
            {benefits.map((b, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 7, alignItems: "flex-start" }}>
                <Feather name="check" size={13} color={colors.primary} style={{ marginTop: 2 }} />
                <AppText size={13} style={{ flex: 1, lineHeight: 18 }}>{b}</AppText>
              </View>
            ))}
            {!expanded && extraBenefits > 0 ? (
              <AppText muted size={12} style={{ marginLeft: 20 }}>+{extraBenefits} more</AppText>
            ) : null}
          </View>
        ) : null}
        {expanded && category.details ? (
          <AppText size={13} style={{ lineHeight: 19 }} testID={`text-category-details-${category.id}`}>{category.details}</AppText>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          {hasMore ? (
            <Pressable
              onPress={() => setExpanded(e => !e)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${expanded ? "Show less" : "Know more"} about ${category.title}`}
              testID={`button-know-more-${category.id}`}
              style={({ pressed }) => ({
                minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText weight="600" size={13}>{expanded ? "Less" : "Know more"}</AppText>
              <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onSeeCoaches}
            accessibilityRole="button"
            accessibilityLabel={`See coaches for ${category.title}, ${count} available`}
            testID={`button-see-coaches-${category.id}`}
            style={({ pressed }) => ({
              flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 6, opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <AppText weight="700" size={13} color={colors.primaryForeground}>See coaches</AppText>
            <Feather name="arrow-right" size={15} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
