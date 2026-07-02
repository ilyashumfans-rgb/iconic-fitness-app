import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getListMyNotificationsQueryKey,
  useListMyNotifications,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { presentLocalNotification } from "@/lib/notifications";

const LAST_SEEN_KEY = "iconic.lastSeenNotificationId";

/**
 * Floating notification bell shown over the Home hero. Members-only (the feed
 * requires auth); shows an unread badge and opens the notifications screen.
 * Rendered as an absolute overlay so it stays fixed while the page scrolls.
 */
export function NotificationBell() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();

  const query = useListMyNotifications({
    query: {
      queryKey: getListMyNotificationsQueryKey(),
      enabled: !!isSignedIn,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });

  const lastSeenRef = useRef<number | null>(null);
  const seenUserRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const data = query.data;

  // When polling surfaces notifications newer than the last one we've seen, fire
  // a local (audible) heads-up so the member is alerted while the app is open.
  // The very first load only records the high-water mark — it never re-alerts
  // for notifications that already existed before this session. The watermark is
  // scoped per user and advanced BEFORE awaiting so concurrent/re-entrant runs
  // can't double-fire the same notification.
  useEffect(() => {
    if (!isSignedIn || !userId || !data || data.length === 0) return;
    // Reset the in-memory watermark when the signed-in account changes.
    if (seenUserRef.current !== userId) {
      seenUserRef.current = userId;
      lastSeenRef.current = null;
    }
    if (processingRef.current) return;
    processingRef.current = true;

    const key = `${LAST_SEEN_KEY}.${userId}`;
    const maxId = data.reduce((m, n) => (n.id > m ? n.id : m), 0);

    (async () => {
      try {
        if (lastSeenRef.current === null) {
          const stored = await AsyncStorage.getItem(key);
          lastSeenRef.current = stored ? Number(stored) : 0;
        }
        const seen = lastSeenRef.current ?? 0;
        if (maxId <= seen) return;
        // Advance + persist the mark first so a re-entrant run sees the new value.
        lastSeenRef.current = maxId;
        await AsyncStorage.setItem(key, String(maxId));
        if (seen > 0) {
          const fresh = data
            .filter((n) => n.id > seen)
            .sort((a, b) => a.id - b.id);
          for (const n of fresh) {
            await presentLocalNotification(n.title, n.body);
          }
        }
      } finally {
        processingRef.current = false;
      }
    })();
  }, [isSignedIn, userId, data]);

  if (!isSignedIn) return null;

  const unread = (data ?? []).filter((n) => !n.readAt).length;
  const top = insets.top > 0 ? insets.top + 6 : 14;

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      hitSlop={8}
      accessibilityLabel="Notifications"
      style={[styles.button, { top, right: 16 }]}
    >
      <Feather name="bell" size={20} color="#FFFFFF" />
      {unread > 0 ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText} weight="700" size={10}>
            {unread > 9 ? "9+" : String(unread)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    zIndex: 50,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,12,8,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 14,
  },
});
