import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyAttendanceQueryKey, getListMyCheckinsQueryKey, useScanAttendance } from "@workspace/api-client-react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { LoadingView, Segmented } from "@/components/ui-bits";
import { attendanceLinkParams, attendanceTime, decodeAttendanceQr } from "@/lib/attendance";
import { memberAuthHref } from "@/lib/memberAuth";

export default function CheckInScreen() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const params = useLocalSearchParams<{ code?: string | string[]; action?: string | string[] }>();
  const link = attendanceLinkParams(params.code, params.action);
  const router = useRouter();
  if (!isLoaded) return <Screen><LoadingView /></Screen>;
  if (!isSignedIn || !userId) return <Screen>
    <AppText weight="700" size={28}>Gym check-in</AppText>
    <AppText muted style={{ marginVertical: 20 }}>Sign in to scan your gym’s attendance QR code.</AppText>
    {link.error ? <AppText accessibilityRole="alert">{link.error}</AppText> : null}
    <Button label="Sign in" onPress={() => router.push(memberAuthHref(link.returnTo))} />
  </Screen>;
  return <MemberScanner key={`${userId}:${link.code ?? ""}:${link.action ?? ""}:${link.error ?? ""}`}
    initialCode={link.code} initialAction={link.action} initialError={link.error} />;
}

function MemberScanner({ initialCode, initialAction, initialError }: {
  initialCode?: string; initialAction?: "checkin" | "checkout"; initialError?: string;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [permission, requestPermission] = useCameraPermissions();
  const mutation = useScanAttendance();
  const [action, setAction] = useState<"checkin" | "checkout">(initialAction === "checkout" ? "checkout" : "checkin");
  const [capture, setCapture] = useState<{ code?: string; error?: string }>(() => {
    if (initialError) return { error: initialError };
    if (!initialCode) return {};
    try { return { code: decodeAttendanceQr(initialCode) }; }
    catch (error) { return { error: (error as Error).message }; }
  });
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const lock = useRef(!!initialCode || !!initialError);
  const posting = useRef(false);
  const alive = useRef(true);
  const [result, setResult] = useState<Awaited<ReturnType<typeof mutation.mutateAsync>> | null>(null);
  useEffect(() => {
    alive.current = true;
    const listener = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { alive.current = false; listener.remove(); };
  }, []);
  const scan = (data: string) => {
    if (lock.current || posting.current || !alive.current) return;
    lock.current = true;
    try { setCapture({ code: decodeAttendanceQr(data) }); }
    catch (err) { setCapture({ error: (err as Error).message }); }
  };
  const reset = () => {
    if (posting.current) return;
    setCapture({}); setResult(null); setError(""); setCameraError("");
    mutation.reset(); lock.current = false;
  };
  const confirm = async () => {
    if (!capture.code || posting.current || !alive.current) return;
    posting.current = true;
    setError("");
    try {
      const response = await mutation.mutateAsync({ data: { code: capture.code, action } });
      if (!alive.current) return;
      setResult(response);
      void client.invalidateQueries({ queryKey: getGetMyAttendanceQueryKey() });
      void client.invalidateQueries({ queryKey: getListMyCheckinsQueryKey() });
      void client.invalidateQueries({ queryKey: ["/api/tracking/summary"] });
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : "Attendance could not be confirmed. Please retry.");
    } finally { posting.current = false; }
  };
  const webUnsupported = Platform.OS === "web" &&
    (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia ||
      typeof window === "undefined" || !window.isSecureContext || typeof Worker === "undefined");
  return <Screen contentContainerStyle={{ gap: 18 }}>
    <Button label="Back" variant="ghost" icon="arrow-left" full={false} onPress={() => router.back()} />
    <AppText size={28} weight="700">Gym check-in</AppText>
    <AppText muted>Scan the attendance QR displayed at your gym. Your branch and eligibility are verified securely before recording a visit.</AppText>
    {!result ? <Segmented value={action} onChange={value => { if (!posting.current) setAction(value); }}
      options={[{ value: "checkin", label: "Check in" }, { value: "checkout", label: "Check out" }]} /> : null}
    {result ? <Card style={{ gap: 12 }}>
      <AppText size={22} weight="700">{({
        checked_in: "Checked in", already_checked_in: "Already checked in",
        checked_out: "Checked out", already_checked_out: "Already checked out",
      })[result.outcome]}</AppText>
      <AppText weight="700">{result.visit.gymName}</AppText>
      <AppText>Check in · {attendanceTime(result.visit.checkedInAt)}</AppText>
      {result.visit.checkedOutAt ? <AppText>Check out · {attendanceTime(result.visit.checkedOutAt)}</AppText> : null}
      <Button label="View attendance" onPress={() => router.replace("/attendance")} />
      <Button label="Scan another code" variant="secondary" onPress={reset} />
    </Card> : capture.code ? <Card style={{ gap: 12 }}>
      <AppText size={20} weight="700">Confirm {action === "checkin" ? "check-in" : "check-out"}</AppText>
      <AppText>QR captured. Confirm only if you are at the gym {action === "checkin" ? "and ready to begin your visit" : "and finishing your visit"}. The scanned branch will be verified by the server.</AppText>
      {error ? <AppText accessibilityRole="alert">{error} No new success has been confirmed. Retrying is safe.</AppText> : null}
      <Button label={action === "checkin" ? "Confirm check-in" : "Confirm check-out"} loading={mutation.isPending} onPress={() => { void confirm(); }} />
      <Button label="Cancel and rescan" variant="secondary" disabled={mutation.isPending} onPress={reset} />
    </Card> : capture.error ? <Card style={{ gap: 12 }}>
      <AppText accessibilityRole="alert">{capture.error}</AppText>
      <Button label="Scan again" onPress={reset} />
    </Card> : webUnsupported ? <Card>
      <AppText>Camera scanning is unavailable in this browser. Open Iconic Fitness on your phone, or use a supported browser over HTTPS with camera access enabled. Ask gym staff for help if needed.</AppText>
    </Card> : !permission ? <LoadingView /> : !permission.granted ? <Card style={{ gap: 12 }}>
      <AppText weight="700">Camera access needed</AppText>
      <AppText muted>We use only the camera to read the gym QR. No microphone access is requested.</AppText>
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
      {permission.canAskAgain ? <Button label="Allow camera / Retry" icon="camera" onPress={() => {
        void requestPermission().catch(() => setError("Could not request camera permission. Check your device settings."));
      }} /> : <>
        <AppText>Camera permission was denied. Enable it in {Platform.OS === "web" ? "your browser’s site settings, then reload this page" : "device Settings, then return here"}.</AppText>
        {Platform.OS !== "web" ? <Button label="Open Settings" onPress={() => { void Linking.openSettings().catch(() => setError("Could not open Settings. Open device Settings manually.")); }} /> : null}
        <Button label="Retry permission" variant="secondary" onPress={() => { void requestPermission().catch(() => setError("Camera is still unavailable.")); }} />
      </>}
    </Card> : cameraError ? <Card style={{ gap: 12 }}>
      <AppText accessibilityRole="alert">{cameraError}</AppText>
      <AppText muted>Check camera access or try the Iconic Fitness phone app. No attendance has been recorded.</AppText>
      <Button label="Retry camera" onPress={reset} />
    </Card> : <View style={{ gap: 12 }}>
      {focused && foreground ? <CameraView style={{ height: 320, borderRadius: 24, overflow: "hidden" }}
        facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => scan(data)}
        onMountError={() => setCameraError("The camera could not start on this device.")} /> : null}
      <AppText muted style={{ textAlign: "center" }}>Point your camera at the gym’s QR code.</AppText>
    </View>}
  </Screen>;
}