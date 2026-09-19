import { Feather } from "@expo/vector-icons";
import { View } from "react-native";
import { useColors } from "@/hooks/useColors";

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
  return (
    <View
      style={{
        width: 34,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.secondary : "transparent",
      }}
    >
      <Feather name={name} size={Math.min(size, 22)} color={color} />
    </View>
  );
}