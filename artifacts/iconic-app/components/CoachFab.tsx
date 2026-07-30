import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * WhatsApp-style floating chat button: animated bot avatar pinned to the
 * bottom-right corner; tapping it opens the AI chat.
 */
export function CoachFab() {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/coach")}
      style={({ pressed }) => [
        styles.fab,
        {
          borderColor: colors.primary,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
      hitSlop={6}
    >
      <View style={styles.inner}>
        <Image
          source={require("@/assets/chatbot.webp")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    backgroundColor: "#0A0C08",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  inner: {
    flex: 1,
    borderRadius: 27,
    overflow: "hidden",
  },
});
