import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  raised?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  size = "md",
  full = true,
  raised = false,
  accessibilityLabel,
}: Props) {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";

  const bg = isPrimary
    ? "transparent"
    : variant === "danger"
      ? colors.destructive
      : variant === "secondary"
        ? colors.elevated
        : "transparent";

  const fg = isPrimary
    ? "#FFFFFF"
    : variant === "danger"
      ? colors.destructiveForeground
      : colors.foreground;

  const handlePress = () => {
    if (isDisabled) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: 999, // Pill shape for premium feel
          paddingVertical: size === "sm" ? 10 : size === "lg" ? 18 : 14,
          minHeight: size === "sm" ? 44 : undefined,
          borderWidth: variant === "ghost" || variant === "secondary" ? 1 : 0,
          borderColor: variant === "secondary" ? colors.border : "transparent",
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          alignSelf: full ? "stretch" : "flex-start",
          paddingHorizontal: size === "sm" ? 12 : full ? 16 : 28,
          overflow: "hidden",
          transform: raised
            ? [{ translateY: pressed && !isDisabled ? 3 : 0 }]
            : [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={colors.primaryGradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {raised ? (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
          style={[StyleSheet.absoluteFill, { height: "52%", borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.3)", borderRadius: 999 }]}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Feather name={icon} size={size === "sm" ? 15 : 18} color={fg} /> : null}
          <AppText weight="700" size={size === "sm" ? 12 : size === "lg" ? 16 : 15} color={fg}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
  if (!raised) return button;
  return <View style={{
    borderRadius: 999, paddingBottom: 4,
    alignSelf: full ? "stretch" : "flex-start",
    backgroundColor: isPrimary ? colors.primaryGradient[1] : colors.border,
    shadowColor: "#000000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 5, elevation: 5,
  }}>
    {button}
  </View>;
}

const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
