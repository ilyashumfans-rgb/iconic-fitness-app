import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import { openExternal } from "@/lib/links";

/**
 * Web fallback for the embedded site view — renders the external site in an
 * <iframe> inside the app. (Native uses react-native-webview via SiteWebView.tsx.)
 * Some sites block iframe embedding (X-Frame-Options / CSP), in which case the
 * frame stays blank; a timeout surfaces an "Open in browser" fallback.
 */
export function SiteWebView({ url }: { url: string }) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    // If the frame hasn't reported a successful load in a few seconds, assume
    // it was blocked by the target site and offer an escape hatch.
    const t = setTimeout(() => {
      if (!loadedRef.current) setBlocked(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [url]);

  if (blocked) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText weight="700" size={16}>
          Preview unavailable here
        </AppText>
        <AppText
          muted
          size={14}
          style={{ textAlign: "center", marginTop: 6, marginBottom: 16 }}
        >
          This page can&apos;t be shown inside the web preview. It works inside
          the mobile app.
        </AppText>
        <Button label="Open in browser" onPress={() => openExternal(url)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <iframe
        src={url}
        title="Embedded site"
        onLoad={() => {
          loadedRef.current = true;
          setLoading(false);
        }}
        style={{ border: "none", width: "100%", height: "100%" }}
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
