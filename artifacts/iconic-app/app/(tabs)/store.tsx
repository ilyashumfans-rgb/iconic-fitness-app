import { useEffect } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { openExternal, storeUrl } from "@/lib/links";

export default function StoreScreen() {
  useEffect(() => {
    openExternal(storeUrl);
  }, []);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <AppText weight="700" size={18}>
          Store
        </AppText>
        <AppText muted size={14} style={{ textAlign: "center" }}>
          Shop gear, supplements and more.
        </AppText>
        <Button label="Open" onPress={() => openExternal(storeUrl)} />
      </View>
    </Screen>
  );
}
