import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions } from "react-native";

const SPLASH_DURATION_MS = 4000;

/**
 * Four-second anniversary launch animation. A timer, rather than the
 * animation callback, guarantees dismissal even with reduced motion.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.98, height * 0.9);

  // Run the hide timer exactly once. The parent passes an inline callback
  // (new identity every render), so depending on it would keep resetting
  // the timer and the splash would never dismiss.
  useEffect(() => {
    let disposed = false;
    scale.setValue(0.88);
    opacity.setValue(1);
    const zoom = Animated.timing(scale, {
      toValue: 1, duration: SPLASH_DURATION_MS,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    zoom.start();
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced && !disposed) {
        zoom.stop();
        scale.setValue(1);
      }
    }).catch(() => {});
    const fadeTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0, duration: 250, useNativeDriver: true,
      }).start();
    }, SPLASH_DURATION_MS - 250);
    const t = setTimeout(() => onFinishRef.current(), SPLASH_DURATION_MS);
    return () => {
      disposed = true;
      clearTimeout(t);
      clearTimeout(fadeTimer);
      zoom.stop();
      opacity.stopAnimation();
    };
  }, [scale, opacity]);

  return (
    <Animated.View
      accessibilityLabel="Iconic Fitness 10 year anniversary"
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { opacity },
      ]}
    >
      <Animated.Image
        source={require("@/assets/images/anniversary-splash.png")}
        style={{ width: size, height: size, transform: [{ scale }] }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 100, alignItems: "center", justifyContent: "center",
    backgroundColor: "#000000",
  },
});
