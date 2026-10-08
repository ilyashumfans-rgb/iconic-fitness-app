import { Feather } from "@expo/vector-icons";
import { ConnectionState, Room, RoomEvent, Track, type RemoteTrack, type LocalTrack } from "livekit-client";
import { createElement, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import type { CallViewProps } from "./callTypes";

/** Web: livekit-client directly. Nothing is recorded; leaving disconnects and stops local tracks. */
export function CallView({ token, url, peerLabel, onLeave }: CallViewProps) {
  const c = useColors();
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<ConnectionState>(ConnectionState.Connecting);
  const [peer, setPeer] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const attach = (t: RemoteTrack) => {
      if (t.kind === Track.Kind.Video && remoteRef.current) t.attach(remoteRef.current);
      if (t.kind === Track.Kind.Audio && audioRef.current) t.attach(audioRef.current);
    };
    room.on(RoomEvent.ConnectionStateChanged, setState)
      .on(RoomEvent.TrackSubscribed, (t) => attach(t))
      .on(RoomEvent.ParticipantConnected, () => setPeer(true))
      .on(RoomEvent.ParticipantDisconnected, () => setPeer(room.remoteParticipants.size > 0))
      .on(RoomEvent.LocalTrackPublished, (pub) => { const t = pub.track as LocalTrack | undefined; if (t?.kind === Track.Kind.Video && localRef.current) t.attach(localRef.current); });
    let cancelled = false;
    (async () => {
      try {
        await room.connect(url, token);
        if (cancelled) return;
        setPeer(room.remoteParticipants.size > 0);
        room.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => { if (pub.track) attach(pub.track as RemoteTrack); }));
        await room.localParticipant.enableCameraAndMicrophone();
      } catch (e) {
        setErr(e instanceof Error && /Permission|NotAllowed/i.test(e.name + e.message) ? "Allow camera and microphone access in your browser to join." : "Couldn't connect to the call. Check your connection and try again.");
      }
    })();
    return () => { cancelled = true; void room.disconnect(true); };
  }, [token, url]);

  const toggleMic = async () => { const r = roomRef.current; if (!r) return; await r.localParticipant.setMicrophoneEnabled(!mic); setMic(!mic); };
  const toggleCam = async () => { const r = roomRef.current; if (!r) return; await r.localParticipant.setCameraEnabled(!cam); setCam(!cam); };
  const leave = () => { void roomRef.current?.disconnect(true); onLeave(); };

  return (
    <View style={[styles.stage, { backgroundColor: STAGE }]}>
      {createElement("video", { ref: remoteRef, autoPlay: true, playsInline: true, style: { width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 } })}
      {createElement("audio", { ref: audioRef, autoPlay: true })}
      {!peer ? (
        <View style={styles.waiting}>
          <Feather name="user" size={28} color="#9AA08F" />
          <AppText size={14} color="#E8EBE3" style={{ textAlign: "center" }}>
            {err ?? (state === ConnectionState.Connected ? `Waiting for ${peerLabel} to join…` : "Connecting securely…")}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.pip, { borderColor: c.primary }]}>
        {createElement("video", { ref: localRef, autoPlay: true, playsInline: true, muted: true, style: { width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" } })}
      </View>
      <View style={styles.controls}>
        <Ctl icon={mic ? "mic" : "mic-off"} onPress={() => void toggleMic()} label="Toggle microphone" off={!mic} />
        <Ctl icon={cam ? "video" : "video-off"} onPress={() => void toggleCam()} label="Toggle camera" off={!cam} />
        <Ctl icon="phone-off" onPress={leave} label="Leave call" danger />
      </View>
    </View>
  );
}

function Ctl({ icon, onPress, label, off, danger }: { icon: keyof typeof Feather.glyphMap; onPress: () => void; label: string; off?: boolean; danger?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} testID={`call-${label.replace(/\s/g, "-").toLowerCase()}`}
      style={[styles.ctl, { backgroundColor: danger ? c.destructive : off ? "#E8EBE3" : "rgba(255,255,255,0.14)" }]}>
      <Feather name={icon} size={22} color={danger ? "#fff" : off ? "#0A0C08" : "#fff"} />
    </Pressable>
  );
}

const STAGE = "#0A0C08"; // call stage is always dark for video contrast
const styles = StyleSheet.create({
  stage: { flex: 1, borderRadius: 22, overflow: "hidden", minHeight: 420 },
  waiting: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  pip: { position: "absolute", right: 12, top: 12, width: 96, height: 132, borderRadius: 14, overflow: "hidden", borderWidth: 2, backgroundColor: "#1a1d17" },
  controls: { position: "absolute", left: 0, right: 0, bottom: 18, flexDirection: "row", justifyContent: "center", gap: 18 },
  ctl: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
