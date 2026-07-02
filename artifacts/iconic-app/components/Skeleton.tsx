import { useEffect } from "react";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

/**
 * A premium shimmering placeholder block. Pulses opacity on a loop so loading
 * states feel intentional and polished rather than a bare spinner.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const shimmer = useSharedValue(0.5);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

  const anim = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.elevated, borderRadius: 12 },
        style,
        anim,
      ]}
    />
  );
}

/** A skeleton shaped like a top-rated / nearby gym card. */
export function GymCardSkeleton() {
  const colors = useColors();
  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Skeleton style={styles.image} />
      <Skeleton style={styles.lineWide} />
      <Skeleton style={styles.lineNarrow} />
      <Skeleton style={styles.linePrice} />
    </Animated.View>
  );
}

/** A skeleton shaped like a category tile. */
export function CategoryCardSkeleton() {
  return <Skeleton style={styles.category} />;
}

const styles = StyleSheet.create({
  card: {
    width: 250,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingBottom: 16,
  },
  image: { width: "100%", height: 170, borderRadius: 0 },
  lineWide: { width: "70%", height: 15, marginTop: 16, marginHorizontal: 16 },
  lineNarrow: { width: "45%", height: 12, marginTop: 10, marginHorizontal: 16 },
  linePrice: { width: "30%", height: 13, marginTop: 14, marginHorizontal: 16 },
  category: { width: 150, height: 190, borderRadius: 22 },
});
