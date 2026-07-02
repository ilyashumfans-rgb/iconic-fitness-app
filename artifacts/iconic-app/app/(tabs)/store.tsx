import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { SiteWebView } from "@/components/SiteWebView";
import { useColors } from "@/hooks/useColors";
import { storeUrl } from "@/lib/links";

export default function StoreScreen() {
  const colors = useColors();
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
      <SiteWebView url={storeUrl} />
    </SafeAreaView>
  );
}
