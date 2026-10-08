import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { getGetNetworkCoachReminderQueryKey, useGetNetworkCoachReminder, useSetNetworkCoachReminder } from "@workspace/api-client-react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useState } from "react";
import { Alert, Linking, Platform, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { ensureAndroidChannel, ensureNotificationPermission } from "@/lib/notifications";
import { enablePushForAccount, pushCapable } from "@/lib/pushRegistration";
import { rememberSessionPush } from "@/lib/sessionReminderAlerts";

/** Explicit opt-in only. Web/Expo Go honestly offer feed delivery, not push. */
export function SessionReminder({ bookingId, role }: { bookingId: number; role: "member" | "trainer" }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const queryKey = [...getGetNetworkCoachReminderQueryKey(role, bookingId), userId ?? role];
  const q = useGetNetworkCoachReminder(role, bookingId, { query: { queryKey, staleTime: 0 }, request: { credentials: "include" } });
  const mutation = useSetNetworkCoachReminder({ request: { credentials: "include" } });
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const enabled = !q.data?.enabled;
      let token: string | undefined;
      if (enabled && pushCapable()) {
        await ensureAndroidChannel();
        if (role === "member") {
          const result = userId ? await enablePushForAccount(userId) : "failed";
          if (result !== "enabled") throw new Error(result === "denied" ? "Allow notifications in Settings, then try again." : "Couldn't register this phone. Please try again.");
        } else {
          if (!await ensureNotificationPermission()) throw new Error("Allow notifications in Settings, then try again.");
          const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
      }
      const result = await mutation.mutateAsync({ role, id: bookingId, data: {
        enabled, ...(token ? { token, platform: Platform.OS === "ios" ? "ios" as const : "android" as const } : {}),
      } });
      qc.setQueryData(queryKey, result);
      await rememberSessionPush(`/network-coach/call?bookingId=${bookingId}&role=${role}`, enabled && pushCapable());
    } catch (e) {
      Alert.alert("Reminder not saved", e instanceof Error ? e.message : "Please try again.", [
        { text: "OK" },
        ...(Platform.OS !== "web" ? [{ text: "Settings", onPress: () => void Linking.openSettings() }] : []),
      ]);
    } finally { setBusy(false); }
  };
  return <View style={{ gap: 5 }}>
    <Button size="sm" variant="secondary" icon="bell"
      label={q.isError ? "Retry reminder settings" : q.data?.enabled ? "Turn off session reminder" : "Remind me when joining opens"}
      loading={q.isLoading || busy || mutation.isPending}
      onPress={() => q.isError ? void q.refetch() : void toggle()} />
    <AppText muted size={11}>
      {pushCapable() ? "Optional notification 10 minutes before start." : "In-app reminder only here. Install the native app for background notifications."}
    </AppText>
  </View>;
}
