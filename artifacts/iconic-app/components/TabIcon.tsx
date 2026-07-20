import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

import { useColors } from "@/hooks/useColors";

// 3D-look bottom tab icon: the active tab gets a raised gradient chip with a
// drop shadow and a glossy top highlight; inactive tabs stay flat and muted.
// Shadow lives on the outer wrapper, clipping on the inner view (iOS clips a
// view's own shadow when it has overflow:hidden).
export function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof Feather.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) {
  const colors = useColors();

  if (!focused) {
    return <Feather name={name} size={size} color={color} />;
  }

  return (
    <View
      style={{
        shadowColor: colors.primary,
        shadowOpacity: 0.55,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        borderRadius: 16,
        // Nudge the chip up a touch so it feels raised out of the bar.
        marginTop: -6,
      }}
    >
      <View style={{ borderRadius: 16, overflow: "hidden" }}>
        <LinearGradient
          colors={colors.primaryGradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 46,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Glossy highlight across the top half for the 3D sheen. */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 16,
              backgroundColor: "rgba(255,255,255,0.28)",
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
            }}
          />
          <Feather name={name} size={size - 2} color="#0A0C08" />
        </LinearGradient>
      </View>
    </View>
  );
}
