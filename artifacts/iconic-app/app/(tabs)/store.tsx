import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { AppText } from "@/components/AppText";
import { SiteWebView } from "@/components/SiteWebView";
import { useColors } from "@/hooks/useColors";
import { storeUrl } from "@/lib/links";

export default function StoreScreen() {
  const colors = useColors();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const base = category
    ? `${storeUrl}?category=${encodeURIComponent(category)}`
    : storeUrl;
  // `embed=1` tells the website to hide its own header/footer so the store
  // renders as a clean in-app screen (no duplicate logo + menu button).
  const url = `${base}${base.includes("?") ? "&" : "?"}embed=1`;
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 }}>
        <AppText weight="700" size={22}>
          Store
        </AppText>
      </View>
      <SiteWebView key={url} url={url} />
    </SafeAreaView>
  );
}
