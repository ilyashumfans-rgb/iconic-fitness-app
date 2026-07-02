import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getListMyNotificationsQueryKey,
  useListMyNotifications,
  useMarkAllNotificationsRead,
  type Notification as AppNotification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default function NotificationsScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const query = useListMyNotifications();
  const markAll = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();
  const markedRef = useRef(false);

  const notifications = query.data ?? [];
  const hasUnread = notifications.some((n) => !n.readAt);

  // Opening the screen clears the unread badge — mark everything read once.
  useEffect(() => {
    if (markedRef.current || !hasUnread) return;
    markedRef.current = true;
    markAll.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListMyNotificationsQueryKey(),
        });
      },
      // If it fails, allow a later attempt (e.g. on refetch) rather than
      // leaving the badge stuck as read-but-not-persisted.
      onError: () => {
        markedRef.current = false;
      },
    });
  }, [hasUnread, markAll, queryClient]);

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ModalHeader title="Notifications" />

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          message="Updates and announcements will show up here."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const colors = useColors();
  const unread = !notification.readAt;
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.elevated,
          }}
        >
          <Feather name="bell" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AppText weight="700" size={15} style={{ flex: 1 }}>
              {notification.title}
            </AppText>
            {unread ? (
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: colors.primary,
                }}
              />
            ) : null}
          </View>
          {notification.body ? (
            <AppText muted size={14} style={{ marginTop: 4 }}>
              {notification.body}
            </AppText>
          ) : null}
          <AppText muted size={12} style={{ marginTop: 8 }}>
            {formatWhen(notification.createdAt)}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
