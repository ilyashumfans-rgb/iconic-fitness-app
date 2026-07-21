import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WEB_NOTCH_TOP } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";

import { BranchesContent } from "../gyms";

export default function SportsScreen() {
  const colors = useColors();
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === "web" ? WEB_NOTCH_TOP : 0,
        }}
      >
        <BranchesContent showBack={false} />
      </View>
    </SafeAreaView>
  );
}
