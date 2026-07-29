import { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";

const BRAND_BG = "#0A0C08";

/**
 * Plain launch screen: just the brand mark on the dark brand background —
 * no glow, ring or pulse animation. Holds briefly, then reveals the app.
 * Always renders the dark, branded palette regardless of system light/dark mode.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Run the hide timer exactly once. The parent passes an inline callback
  // (new identity every render), so depending on it would keep resetting
  // the timer and the splash would never dismiss.
  useEffect(() => {
    const t = setTimeout(() => onFinishRef.current(), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: BRAND_BG, pointerEvents: "none" },
      ]}
    >
      <Image
        source={require("@/assets/images/iconic-logo.png")}
        style={styles.mark}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, alignItems: "center", justifyContent: "center" },
  mark: {
    width: 200,
    height: 200,
  },
});
