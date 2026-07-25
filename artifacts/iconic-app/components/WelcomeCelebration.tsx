import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  type SharedValue,
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

const GOLD = "#F5C842";
const LIME = "#C7F000";
const BG = "rgba(6, 8, 5, 0.94)";

const SPARK_COLORS = [GOLD, LIME, "#FF6B6B", "#6BC5FF", "#FF9DE2", "#FFFFFF"];

type BurstSpec = {
  cx: number; // center x as fraction of width
  cy: number; // center y as fraction of height
  delay: number;
  size: number; // max travel radius
  count: number;
};

/** One firework burst: sparks fly outward from a center point and fade. */
function Burst({ spec, w, h }: { spec: BurstSpec; w: number; h: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, spec.delay]);

  const sparks = useMemo(
    () =>
      Array.from({ length: spec.count }, (_, i) => {
        const angle = (i / spec.count) * Math.PI * 2 + (i % 2) * 0.22;
        const dist = spec.size * (0.75 + ((i * 37) % 10) / 40);
        return {
          key: i,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          color: SPARK_COLORS[i % SPARK_COLORS.length],
          dot: 3 + ((i * 13) % 3) * 1.5,
        };
      }),
    [spec.count, spec.size],
  );

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: spec.cx * w,
        top: spec.cy * h,
      }}
    >
      {sparks.map((s) => (
        <Spark key={s.key} progress={progress} spark={s} />
      ))}
    </View>
  );
}

function Spark({
  progress,
  spark,
}: {
  progress: SharedValue<number>;
  spark: { dx: number; dy: number; color: string; dot: number };
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p === 0 ? 0 : 1 - p,
      transform: [
        { translateX: spark.dx * p },
        // slight gravity droop near the end, like a real cracker
        { translateY: spark.dy * p + 26 * p * p },
        { scale: 1 - 0.5 * p },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: spark.dot,
          height: spark.dot,
          borderRadius: spark.dot / 2,
          backgroundColor: spark.color,
        },
        style,
      ]}
    />
  );
}

/**
 * One-time "Diwali crackers" welcome overlay for new members: repeating
 * firework bursts + a springing welcome message. Tap anywhere (or wait)
 * to dismiss.
 */
export function WelcomeCelebration({
  memberName,
  onDone,
}: {
  memberName?: string;
  onDone: () => void;
}) {
  const { width: w, height: h } = useWindowDimensions();
  const overlay = useSharedValue(0);
  const textScale = useSharedValue(0.6);
  const textOpacity = useSharedValue(0);
  const glow = useSharedValue(0.4);
  // Re-key bursts every 1.6s so the crackers keep going while visible.
  const [wave, setWave] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    overlay.value = withTiming(1, { duration: 320 });
    textOpacity.value = withDelay(350, withTiming(1, { duration: 400 }));
    textScale.value = withDelay(
      350,
      withSpring(1, { damping: 9, stiffness: 120, mass: 0.9 }),
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }),
        withTiming(0.4, { duration: 800, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [overlay, textOpacity, textScale, glow]);

  useEffect(() => {
    if (closing) return;
    const id = setInterval(() => setWave((v) => v + 1), 1600);
    return () => clearInterval(id);
  }, [closing]);

  // Auto-dismiss after ~7s if the member doesn't tap.
  useEffect(() => {
    const id = setTimeout(() => setClosing(true), 7000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!closing) return;
    overlay.value = withTiming(
      0,
      { duration: 420, easing: Easing.in(Easing.quad) },
      (done) => {
        if (done) runOnJS(onDone)();
      },
    );
  }, [closing, overlay, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const bursts: BurstSpec[] = [
    { cx: 0.22, cy: 0.2, delay: 150, size: 90, count: 14 },
    { cx: 0.78, cy: 0.16, delay: 500, size: 110, count: 16 },
    { cx: 0.5, cy: 0.3, delay: 850, size: 130, count: 18 },
    { cx: 0.18, cy: 0.68, delay: 1150, size: 95, count: 14 },
    { cx: 0.82, cy: 0.72, delay: 1350, size: 100, count: 14 },
  ];

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, overlayStyle, styles.root]}>
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => setClosing(true)}
        accessibilityLabel="Dismiss welcome celebration"
      >
        <View style={StyleSheet.absoluteFillObject}>
          {bursts.map((b, i) => (
            <Burst key={`${wave}-${i}`} spec={b} w={w} h={h} />
          ))}
        </View>

        <View style={styles.center} pointerEvents="none">
          <Animated.View style={[styles.halo, glowStyle]} />
          <Animated.View style={[styles.textWrap, textStyle]}>
            <AppText size={15} weight="700" color={GOLD} style={styles.kicker}>
              CONGRATULATIONS{memberName ? `, ${memberName.toUpperCase()}` : ""}!
            </AppText>
            <AppText size={30} weight="700" color="#FFFFFF" style={styles.title}>
              Welcome to the{"\n"}Iconic Fitness journey
            </AppText>
            <AppText
              size={14}
              weight="600"
              color="rgba(255,255,255,0.75)"
              style={styles.sub}
            >
              Your membership is active. Let's get moving!
            </AppText>
            <View style={styles.tapHint}>
              <AppText size={12} weight="700" color={LIME}>
                Tap anywhere to continue
              </AppText>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BG,
    zIndex: 1000,
    elevation: 1000,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  halo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(199, 240, 0, 0.08)",
  },
  textWrap: {
    alignItems: "center",
  },
  kicker: {
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: "center",
  },
  title: {
    textAlign: "center",
    lineHeight: 38,
  },
  sub: {
    marginTop: 12,
    textAlign: "center",
  },
  tapHint: {
    marginTop: 26,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(199, 240, 0, 0.4)",
  },
});
