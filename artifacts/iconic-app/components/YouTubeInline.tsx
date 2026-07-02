import { View, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

/**
 * Inline, auto-playing (muted + looping) YouTube player for the home banner.
 * Native implementation via react-native-webview. The player is non-interactive
 * (pointerEvents="none") so the surrounding Pressable/carousel keeps handling
 * taps and swipes — tapping the slide opens the full video externally.
 */
export function YouTubeInline({
  videoId,
  style,
}: {
  videoId: string;
  style?: StyleProp<ViewStyle>;
}) {
  const src =
    `https://www.youtube.com/embed/${videoId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${videoId}` +
    `&controls=0&playsinline=1&rel=0&modestbranding=1&showinfo=0` +
    `&iv_load_policy=3&disablekb=1&fs=0`;

  return (
    <View style={style} pointerEvents="none">
      <WebView
        source={{ uri: src }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        pointerEvents="none"
        androidLayerType="hardware"
      />
    </View>
  );
}
