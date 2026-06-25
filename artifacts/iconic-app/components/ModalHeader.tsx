import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

export function ModalHeader({ title }: { title: string }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={styles.header}>
      <AppText weight="700" size={24}>
        {title}
      </AppText>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={[
          styles.close,
          { backgroundColor: colors.elevated, borderColor: colors.border },
        ]}
      >
        <Feather name="x" size={20} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
