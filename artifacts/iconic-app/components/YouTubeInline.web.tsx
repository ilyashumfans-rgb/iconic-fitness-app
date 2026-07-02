import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * Inline, auto-playing (muted + looping) YouTube player for the home banner.
 * Web implementation renders a raw <iframe> (expo web runs on react-dom). The
 * iframe is non-interactive so the surrounding Pressable/carousel keeps handling
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
      <iframe
        src={src}
        title="video"
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          pointerEvents: "none",
        }}
      />
    </View>
  );
}
