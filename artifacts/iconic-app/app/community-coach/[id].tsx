import { getGetCommunityCoachQueryKey, useGetCommunityCoach } from "@workspace/api-client-react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";

export default function CommunityCoachScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const validId = Number.isSafeInteger(postId) && postId > 0;
  const query = useGetCommunityCoach(postId, {
    query: {
      queryKey: getGetCommunityCoachQueryKey(postId),
      enabled: validId,
      staleTime: 0,
      gcTime: 0,
      retry: false,
    },
    request: { cache: "no-store" },
  });
  const coach = query.data;
  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Coach profile" />
      {!validId ? (
        <EmptyState icon="user-x" title="Coach unavailable" />
      ) : query.isPending ? (
        <LoadingView />
      ) : query.isError ? (
        <>
          <EmptyState icon="user-x" title="Coach unavailable" message="This coach's profile is no longer available for this story." />
          <ErrorView onRetry={() => void query.refetch()} />
        </>
      ) : coach ? (
        <Card>
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 16 }}>
            <MemberAvatar name={coach.name} avatarUrl={coach.photoUrl} size={120} />
            <AppText size={24} weight="700" style={{ textAlign: "center" }}>{coach.name}</AppText>
            <AppText size={15} muted>Personal trainer</AppText>
            <AppText size={14} style={{ textAlign: "center" }}>{coach.gymName}</AppText>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}