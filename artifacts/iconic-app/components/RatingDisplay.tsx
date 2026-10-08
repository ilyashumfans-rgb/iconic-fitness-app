import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

export const STAR_YELLOW = "#FABB05";

/** Five yellow stars with fractional fill (4.3 -> 4 full + 30% of the fifth). */
export function RatingStars({ rating, size = 13, gap = 1 }: { rating: number; size?: number; gap?: number }) {
  const value = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  return (
    <View style={{ flexDirection: "row", gap }} accessible={false}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <View key={i} style={{ width: size, height: size }}>
            <Ionicons name="star" size={size} color={STAR_YELLOW + "40"} style={StyleSheet.absoluteFill} />
            <View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: size * fill, overflow: "hidden" }}>
              <Ionicons name="star" size={size} color={STAR_YELLOW} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Google-style inline rating: "4.3 ★★★★☆ (308)".
 * Only pass `count` when a real review count exists — never invent one.
 */
export function RatingDisplay({
  rating,
  count,
  size = 13,
  color,
  mutedColor,
  style,
}: {
  rating: number;
  count?: number | null;
  size?: number;
  color?: string;
  mutedColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const hasCount = typeof count === "number" && Number.isFinite(count);
  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 4 }, style]}
      accessible
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5${hasCount ? `, ${count} reviews` : ""}`}
    >
      <AppText weight="700" size={size} color={color ?? colors.foreground}>{rating.toFixed(1)}</AppText>
      <RatingStars rating={rating} size={size} />
      {hasCount ? (
        <AppText size={size - 1} color={mutedColor ?? colors.mutedForeground}>({count})</AppText>
      ) : null}
    </View>
  );
}
