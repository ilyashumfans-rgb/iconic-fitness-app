import { useEffect } from "react";
import { getListMyNotificationsQueryKey, useListMyNotifications } from "@workspace/api-client-react";
import { presentSessionReminder } from "@/lib/sessionReminderAlerts";

/** Keep reminders visible while the member stays on their session list. */
export function SessionReminderAlerts() {
  const q = useListMyNotifications({ query: {
    queryKey: getListMyNotificationsQueryKey(), refetchInterval: 30_000,
  } });
  useEffect(() => {
    for (const n of q.data ?? []) {
      if (!n.readAt) void presentSessionReminder(n).catch(() => undefined);
    }
  }, [q.data]);
  return null;
}
