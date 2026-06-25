import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
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

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

/**
 * Premium launch animation: a glowing lime mark springs in, a halo pulses,
 * the ICONIC wordmark rises, then the whole overlay fades to reveal the app.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const colors = useColors();

  const container = useSharedValue(1);
  const markScale = useSharedValue(0.55);
  const markOpacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const ring = useSharedValue(0.4);
  const wordOpacity = useSharedValue(0);
  const wordTranslate = useSharedValue(18);
  const taglineOpacity = useSharedValue(0);

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

    wordOpacity.value = withDelay(420, withTiming(1, { duration: 480 }));
    wordTranslate.value = withDelay(
      420,
      withSpring(0, { damping: 14, stiffness: 120 }),
    );
    taglineOpacity.value = withDelay(720, withTiming(1, { duration: 480 }));

    container.value = withDelay(
      1850,
      withTiming(0, { duration: 480, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
  }, [
    container,
    glow,
    markOpacity,
    markScale,
    ring,
    taglineOpacity,
    wordOpacity,
    wordTranslate,
  ]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.5,
    transform: [{ scale: 1 + glow.value * 0.25 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 0.5 - (ring.value - 0.4) * 0.5),
    transform: [{ scale: ring.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordTranslate.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: colors.background, pointerEvents: "none" },
        containerStyle,
      ]}
    >
      <View style={styles.center}>
        <View style={styles.markWrap}>
          <Animated.View
            style={[
              styles.glow,
              { backgroundColor: colors.primary },
              glowStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              { borderColor: colors.primary },
              ringStyle,
            ]}
          />
          <Animated.View style={markStyle}>
            <LinearGradient
              colors={["#E6FF4D", colors.primary, "#9FCB00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mark}
            >
              <Feather name="zap" size={46} color={colors.primaryForeground} />
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.View style={[styles.wordRow, wordStyle]}>
          <AppText weight="700" size={38} style={styles.word}>
            ICONIC
          </AppText>
        </Animated.View>
        <Animated.View style={taglineStyle}>
          <AppText
            weight="600"
            size={13}
            color={colors.primary}
            style={styles.tagline}
          >
            FITNESS
          </AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center" },
  markWrap: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  ring: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  mark: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  wordRow: { flexDirection: "row" },
  word: { letterSpacing: 8, marginLeft: 8 },
  tagline: { letterSpacing: 10, marginTop: 6, marginLeft: 10 },
});
