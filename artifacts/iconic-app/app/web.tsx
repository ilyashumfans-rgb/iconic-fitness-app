import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { WEB_NOTCH_TOP } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";
import { openExternal } from "@/lib/links";

// In-app browser screen: opens web links inside the app instead of bouncing
// the viewer out to another page. Native uses a WebView; web uses an iframe.
export default function WebScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const url = typeof params.url === "string" ? params.url : "";
  const title = typeof params.title === "string" && params.title ? params.title : "Iconic Fitness";

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "web" ? WEB_NOTCH_TOP : 8,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.elevated,
          }}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
        <AppText weight="700" size={16} numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </AppText>
        <Pressable
          onPress={() => void openExternal(url)}
          hitSlop={10}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.elevated,
          }}
        >
          <Feather name="external-link" size={16} color={colors.foreground} />
        </Pressable>
      </View>
      {url ? (
        <WebContent url={url} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <AppText muted>Nothing to show.</AppText>
        </View>
      )}
    </SafeAreaView>
  );
}

function WebContent({ url }: { url: string }) {
  if (Platform.OS === "web") {
    return (
      <iframe
        src={url}
        style={{ flex: 1, borderWidth: 0, width: "100%", height: "100%" }}
        allow="autoplay; encrypted-media; fullscreen"
      />
    );
  }
  // Required lazily so the web bundle never touches the native-only module.
  const { WebView } = require("react-native-webview") as
    typeof import("react-native-webview");
  return (
    <WebView
      source={{ uri: url }}
      style={{ flex: 1 }}
      allowsInlineMediaPlayback
      startInLoadingState
    />
  );
}
