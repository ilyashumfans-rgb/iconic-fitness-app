import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  type Edge,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: readonly Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ["top"],
  contentContainerStyle,
  padded = true,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const padStyle = padded ? styles.padded : undefined;
  // On web/canvas previews there are no safe-area insets, so SafeAreaView adds
  // no top padding and content hugs (and gets clipped by) the status bar/notch.
  // Add a small fallback only when the top edge is requested and there's no inset.
  const topFallback =
    edges.includes("top") && insets.top === 0
      ? { paddingTop: 16 }
      : undefined;

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[padStyle, topFallback, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padStyle, topFallback, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 20, paddingBottom: 120 },
});
