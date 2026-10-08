import { Feather } from "@expo/vector-icons";
import {
  AudioSession, LiveKitRoom, VideoTrack, isTrackReference, registerGlobals, useConnectionState, useLocalParticipant, useRemoteParticipants, useRoomContext, useTracks,
} from "@livekit/react-native";
import { ConnectionState, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import type { CallViewProps } from "./callTypes";

// Loaded only from CallView.native.tsx after the Expo Go check — safe to touch native WebRTC here.
registerGlobals();

const STAGE = "#0A0C08"; // call stage is always dark for video contrast
const permissionMessage = "Allow camera and microphone access in Settings, then return and turn them on.";
const mediaError = (e: unknown) => e instanceof Error && /permission|notallowed|denied/i.test(e.name + e.message)
  ? permissionMessage : "Couldn't use your camera or microphone. Try turning it on again.";

export function NativeCallImpl({ token, url, peerLabel, onLeave }: CallViewProps) {
  const [err, setErr] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  useEffect(() => {
    let active = true;
    const started = AudioSession.startAudioSession();
    void started.then(() => { if (active) setAudioReady(true); }).catch(() => {
      if (active) setErr("Couldn't start call audio. Leave the call and try joining again.");
    });
    return () => {
      active = false;
      // Stop after startup settles, including when navigation happens during startup.
      void started.catch(() => {}).then(() => AudioSession.stopAudioSession()).catch(() => {});
    };
  }, []);
  return (
    <LiveKitRoom serverUrl={url} token={token} connect={audioReady} audio video options={{ adaptiveStream: { pixelDensity: "screen" } }}
      onDisconnected={() => setErr("The call disconnected. Leave and rejoin to try again.")}
      onMediaDeviceFailure={(failure) => setErr(failure === "PermissionDenied" ? permissionMessage : "Camera or microphone unavailable. Check that another app isn't using it.")}
      onError={(e) => setErr(/permission|notallowed|denied/i.test(e.name + e.message) ? permissionMessage : "Couldn't connect to the call. Leave and try joining again.")}>
      <Stage peerLabel={peerLabel} onLeave={onLeave} err={err} setErr={setErr} />
    </LiveKitRoom>
  );
}

function Stage({ peerLabel, onLeave, err, setErr }: { peerLabel: string; onLeave: () => void; err: string | null; setErr: (error: string | null) => void }) {
  const c = useColors();
  const room = useRoomContext();
  const connection = useConnectionState();
  const busy = useRef(false);
  const leaving = useRef(false);
  const [changing, setChanging] = useState(false);
  const changeDevice = async (kind: "mic" | "camera") => {
    if (busy.current || leaving.current || connection !== ConnectionState.Connected) return;
    busy.current = true;
    setChanging(true);
    try {
      if (kind === "mic") await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
      else await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);
      setErr(null);
    } catch (e) { setErr(mediaError(e)); }
    finally { busy.current = false; setChanging(false); }
  };
  const leave = async () => {
    if (leaving.current) return;
    leaving.current = true;
    try { await room.disconnect(true); }
    catch { /* Unmount also disconnects and stops local tracks. */ }
    finally { onLeave(); }
  };
  const tracks = useTracks([Track.Source.Camera]);
  const remotes = useRemoteParticipants();
  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const remote = tracks.find(t => !t.participant.isLocal);
  const local = tracks.find(t => t.participant.isLocal);
  return (
    <View style={[styles.stage, { backgroundColor: STAGE }]}>
      {remote && isTrackReference(remote) ? <VideoTrack trackRef={remote} style={StyleSheet.absoluteFillObject} objectFit="cover" /> : (
        <View style={styles.waiting}>
          <Feather name="user" size={28} color="#9AA08F" />
          <AppText size={14} color="#E8EBE3" style={{ textAlign: "center" }}>{connection !== ConnectionState.Connected ? (connection === ConnectionState.Reconnecting ? "Reconnecting…" : "Connecting securely…") : remotes.length ? `${peerLabel} has camera off` : `Waiting for ${peerLabel} to join…`}</AppText>
        </View>
      )}
      <View style={[styles.pip, { borderColor: c.primary }]}>
        {local && isTrackReference(local) ? <VideoTrack trackRef={local} style={StyleSheet.absoluteFillObject} objectFit="cover" mirror /> : null}
      </View>
      {err ? <View style={styles.error} accessibilityLiveRegion="polite">
        <AppText size={13} color="#fff">{err}</AppText>
        {err === permissionMessage ? <Pressable accessibilityRole="button" onPress={() => {
          void Linking.openSettings().catch(() => setErr("Couldn't open Settings. Open your phone's Settings and allow Iconic Fitness camera and microphone access."));
        }}><AppText weight="700" color="#fff">Open Settings</AppText></Pressable> : null}
      </View> : null}
      <View style={styles.controls}>
        <Ctl icon={isMicrophoneEnabled ? "mic" : "mic-off"} off={!isMicrophoneEnabled} disabled={changing || connection !== ConnectionState.Connected} label="Toggle microphone" onPress={() => void changeDevice("mic")} />
        <Ctl icon={isCameraEnabled ? "video" : "video-off"} off={!isCameraEnabled} disabled={changing || connection !== ConnectionState.Connected} label="Toggle camera" onPress={() => void changeDevice("camera")} />
        <Ctl icon="phone-off" danger label="Leave call" onPress={() => void leave()} />
      </View>
    </View>
  );
}

function Ctl({ icon, onPress, label, off, danger, disabled }: { icon: keyof typeof Feather.glyphMap; onPress: () => void; label: string; off?: boolean; danger?: boolean; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} testID={`call-${label.replace(/\s/g, "-").toLowerCase()}`} style={[styles.ctl, { opacity: disabled ? 0.5 : 1, backgroundColor: danger ? c.destructive : off ? "#E8EBE3" : "rgba(255,255,255,0.14)" }]}>
      <Feather name={icon} size={22} color={off && !danger ? "#0A0C08" : "#fff"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  error: { position: "absolute", left: 12, right: 12, bottom: 90, padding: 12, gap: 8, borderRadius: 12, backgroundColor: "rgba(120,20,20,0.95)" },
  stage: { flex: 1, borderRadius: 22, overflow: "hidden", minHeight: 420 },
  waiting: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  pip: { position: "absolute", right: 12, top: 12, width: 96, height: 132, borderRadius: 14, overflow: "hidden", borderWidth: 2, backgroundColor: "#1a1d17" },
  controls: { position: "absolute", left: 0, right: 0, bottom: 18, flexDirection: "row", justifyContent: "center", gap: 18 },
  ctl: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
