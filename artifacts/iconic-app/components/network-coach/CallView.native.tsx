import { Feather } from "@expo/vector-icons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { ComponentType } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import type { CallViewProps } from "./callTypes";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Native: the LiveKit WebRTC module only exists in an updated development/production build.
 * Expo Go gets an explicit message instead of crashing; the native module is required lazily
 * so it is never evaluated in Expo Go (or bundled for web, which uses CallView.web.tsx).
 */
export function CallView(props: CallViewProps) {
  const c = useColors();
  if (isExpoGo) {
    return (
      <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]} testID="call-unsupported">
        <Feather name="smartphone" size={28} color={c.primary} />
        <AppText weight="700" size={16} style={{ textAlign: "center" }}>Video calls need the Iconic app</AppText>
        <AppText muted size={13} style={{ textAlign: "center" }}>
          Expo Go can't run in-app video calls. Open this session in the installed Iconic Fitness app (latest version) or on the web app.
        </AppText>
        <Button label="Go back" variant="secondary" onPress={props.onLeave} />
      </View>
    );
  }
  let Impl: ComponentType<CallViewProps>;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Impl = require("./NativeCallImpl").NativeCallImpl as ComponentType<CallViewProps>;
  } catch {
    return (
      <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
        <Feather name="download" size={28} color={c.primary} />
        <AppText weight="700" size={16} style={{ textAlign: "center" }}>Update the app to join</AppText>
        <AppText muted size={13} style={{ textAlign: "center" }}>This version of the app doesn't include video calling yet. Install the latest update and try again.</AppText>
        <Button label="Go back" variant="secondary" onPress={props.onLeave} />
      </View>
    );
  }
  return <Impl {...props} />;
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 12, alignItems: "center", marginTop: 24 },
});
