import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import { openExternal } from "@/lib/links";

/**
 * Renders an external site embedded INSIDE the app (native) via a WebView, so
 * tabs like Sports & Fitness / Store open in-app instead of a browser popup.
 * Shows a spinner while loading and an in-app fallback if the page can't load.
 */
export function SiteWebView({ url }: { url: string }) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText weight="700" size={16}>
          Couldn&apos;t load the page
        </AppText>
        <AppText
          muted
          size={14}
          style={{ textAlign: "center", marginTop: 6, marginBottom: 16 }}
        >
          Check your connection and try again.
        </AppText>
        <Button
          label="Retry"
          onPress={() => {
            setFailed(false);
            setLoading(true);
          }}
        />
        <View style={{ height: 10 }} />
        <Button
          label="Open in browser"
          variant="secondary"
          onPress={() => openExternal(url)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: colors.background }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
      />
      {loading ? (
        <View style={[styles.center, styles.overlay]} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
