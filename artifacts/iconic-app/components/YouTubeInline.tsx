import { useEffect, useMemo, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

/**
 * Inline auto-playing YouTube player for the home banner (native).
 * Loads the YouTube IFrame Player API inside a WebView so we can play only
 * while the slide is active and post a message back when the video ends, so the
 * carousel advances after the video finishes. Non-interactive (parent View has
 * pointerEvents="none") so taps open the full video and swipes still page.
 */

function buildHtml(videoId: string, initialActive: boolean, loop: boolean) {
  const loopVars = loop ? "loop:1,playlist:'" + videoId + "'," : "";
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>*{margin:0;padding:0}html,body{height:100%;background:#000;overflow:hidden}#p{width:100%;height:100%}</style>
</head><body>
<div id="p"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player, ready=false, desiredActive=${initialActive ? "true" : "false"};
// setActive is the single source of truth for playback. It stores the desired
// state and applies it if the player is ready; otherwise onReady applies it.
function setActive(a){
  desiredActive=a;
  if(ready&&player){ if(a){player.seekTo(0);player.playVideo();} else {player.pauseVideo();} }
}
function onYouTubeIframeAPIReady(){
  player=new YT.Player('p',{videoId:'${videoId}',
    playerVars:{autoplay:${initialActive ? "1" : "0"},mute:1,controls:0,playsinline:1,rel:0,modestbranding:1,fs:0,iv_load_policy:3,disablekb:1,${loopVars}},
    events:{
      onReady:function(e){ready=true;e.target.mute();setActive(desiredActive);},
      onStateChange:function(e){ if(e.data===0 && !${loop ? "true" : "false"}){ if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage('ended');} } }
    }});
}
// Back-compat aliases (unused but harmless).
function play(){ setActive(true); }
function pause(){ setActive(false); }
true;
</script></body></html>`;
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
  const ref = useRef<WebView>(null);
  const initialActive = useRef(active).current;
  // Track the latest active state so onLoadEnd can apply the CURRENT value even
  // if the slide changed while the WebView was still loading.
  const activeRef = useRef(active);
  activeRef.current = active;
  const html = useMemo(
    () => buildHtml(videoId, initialActive, loop),
    [videoId, initialActive, loop],
  );

  // Play only while this slide is active; restart on (re)activation. setActive
  // stores the desired state and defers to onReady if the player isn't ready.
  useEffect(() => {
    ref.current?.injectJavaScript(`setActive(${active}); true;`);
  }, [active]);

  return (
    <View style={style} pointerEvents="none">
      <WebView
        ref={ref}
        source={{ html, baseUrl: "https://www.youtube.com" }}
        originWhitelist={["*"]}
        style={{ flex: 1, backgroundColor: "transparent" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        pointerEvents="none"
        androidLayerType="hardware"
        onMessage={(e) => {
          if (e.nativeEvent.data === "ended") onEnded?.();
        }}
        // Apply the latest active state once the page loads; if the YT player
        // isn't ready yet, onReady picks up desiredActive from setActive.
        onLoadEnd={() => {
          ref.current?.injectJavaScript(
            `setActive(${activeRef.current}); true;`,
          );
        }}
      />
    </View>
  );
}
