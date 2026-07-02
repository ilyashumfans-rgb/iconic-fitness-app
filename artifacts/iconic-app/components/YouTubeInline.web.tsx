import { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * Inline auto-playing YouTube player for the home banner (web / expo-web).
 * Uses the YouTube IFrame Player API so we can (a) play only while the slide is
 * active, and (b) report when the video finishes so the carousel can advance.
 * The player is non-interactive (parent View has pointerEvents="none") so taps
 * open the full video and swipes still page the carousel.
 */

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as {
    YT?: { Player?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function YouTubeInline({
  videoId,
  active = true,
  loop = false,
  onEnded,
  style,
}: {
  videoId: string;
  active?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  // Track the latest `active` prop so onReady applies the CURRENT state, not the
  // value at mount — the slide may have changed before the player was ready.
  const activeRef = useRef(active);
  activeRef.current = active;
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      if (!YT?.Player) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          autoplay: activeRef.current ? 1 : 0,
          mute: 1,
          controls: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          ...(loop ? { loop: 1, playlist: videoId } : {}),
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (e: any) => {
            readyRef.current = true;
            e.target.mute();
            // Apply the latest active state (guards against a slide change that
            // happened while the player was still initializing).
            if (activeRef.current) {
              e.target.seekTo(0);
              e.target.playVideo();
            } else {
              e.target.pauseVideo();
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (e: any) => {
            // 0 === ENDED
            if (e.data === 0 && !loop) onEndedRef.current?.();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore teardown errors
      }
      playerRef.current = null;
    };
  }, [videoId, loop]);

  // Play only while this slide is the active one; restart on (re)activation.
  // If the player isn't ready yet, onReady applies the latest state instead.
  useEffect(() => {
    if (!readyRef.current) return;
    const p = playerRef.current;
    if (!p?.playVideo) return;
    try {
      if (active) {
        p.seekTo(0);
        p.playVideo();
      } else {
        p.pauseVideo();
      }
    } catch {
      // player not ready yet — onReady handles the initial state
    }
  }, [active]);

  return (
    <View style={style} pointerEvents="none">
      <div
        ref={hostRef}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      />
    </View>
  );
}
