import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "card" | "elevated";
};

export function Card({ children, style, tone = "card" }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone === "elevated" ? colors.elevated : colors.card,
          borderColor: colors.border,
          borderRadius: 24, // softer, premium radius
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: tone === "elevated" ? 0.15 : 0.05,
          shadowRadius: 12,
          elevation: tone === "elevated" ? 4 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
});
