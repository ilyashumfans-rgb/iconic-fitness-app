import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const BRAND_BG = "#0A0C08";
const BRAND_LIME = "#0BE607";

/**
 * Premium launch animation: a glowing lime mark springs in, a halo pulses,
 * then the whole overlay fades to reveal the app.
 * Always renders the dark, branded palette regardless of system light/dark mode.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const container = useSharedValue(1);
  const markScale = useSharedValue(0.55);
  const markOpacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const ring = useSharedValue(0.4);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 360 });
    markScale.value = withSpring(1, { damping: 9, stiffness: 130, mass: 0.8 });

    glow.value = withDelay(
      120,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
          withTiming(0.45, { duration: 900, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );

    ring.value = withDelay(
      120,
      withRepeat(
        withTiming(1.55, { duration: 1800, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      ),
    );

    container.value = withDelay(
      1850,
      withTiming(0, { duration: 480, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
  }, [container, glow, markOpacity, markScale, ring]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.22,
    transform: [{ scale: 1 + glow.value * 0.35 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 0.5 - (ring.value - 0.4) * 0.5),
    transform: [{ scale: ring.value }],
  }));
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: BRAND_BG, pointerEvents: "none" },
        containerStyle,
      ]}
    >
      <View style={styles.center}>
        <View style={styles.markWrap}>
          <Animated.View
            style={[
              styles.glow,
              { backgroundColor: BRAND_LIME },
              glowStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              { borderColor: BRAND_LIME },
              ringStyle,
            ]}
          />
          <Animated.View style={markStyle}>
            <Image
              source={require("@/assets/images/iconic-logo.png")}
              style={styles.mark}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center" },
  markWrap: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glow: {
    position: "absolute",
    width: 264,
    height: 264,
    borderRadius: 132,
  },
  ring: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
  },
  mark: {
    width: 236,
    height: 236,
  },
});
