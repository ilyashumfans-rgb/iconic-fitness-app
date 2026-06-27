import { useEffect } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { exploreUrl, openExternal } from "@/lib/links";

export default function SportsScreen() {
  useEffect(() => {
    openExternal(exploreUrl);
  }, []);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <AppText weight="700" size={18}>
          Sports & Fitness
        </AppText>
        <AppText muted size={14} style={{ textAlign: "center" }}>
          Explore gyms, sports and fitness near you.
        </AppText>
        <Button label="Open" onPress={() => openExternal(exploreUrl)} />
      </View>
    </Screen>
  );
}
