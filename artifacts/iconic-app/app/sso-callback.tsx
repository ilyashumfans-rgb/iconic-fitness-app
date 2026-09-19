import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

/**
 * The dedicated same-origin web callback route for @clerk/expo useSSO.
 *
 * Completion itself runs from the root layout before auth configuration loads,
 * which lets Expo WebBrowser post the rotating-token callback to the opener
 * immediately. This route keeps that URL routable while the popup closes.
 */
export default function SsoCallbackScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText size={21} weight="700" color={colors.foreground}>
          Sign-in window expired
        </AppText>
        <AppText size={14} color={colors.mutedForeground} style={styles.copy}>
          This sign-in callback no longer has an open app window to return to.
          Return to welcome and start Google sign-in again.
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to welcome"
          onPress={() => router.replace("/(auth)/welcome")}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <AppText size={15} weight="700" color={colors.primaryForeground}>
            Return to welcome
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    maxWidth: 420,
    padding: 24,
    width: "100%",
  },
  copy: { lineHeight: 21 },
  button: {
    alignItems: "center",
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
});