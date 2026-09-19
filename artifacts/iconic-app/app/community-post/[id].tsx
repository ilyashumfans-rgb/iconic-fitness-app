import { getGetCommunityPostQueryKey, useGetCommunityPost } from "@workspace/api-client-react";
import { useLocalSearchParams } from "expo-router";

import { CommunityPostCard } from "@/components/Community";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";

export default function CommunityPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const validId = Number.isSafeInteger(postId) && postId > 0;
  const query = useGetCommunityPost(postId, {
    query: {
      queryKey: getGetCommunityPostQueryKey(postId),
      enabled: validId,
      staleTime: 0,
      gcTime: 0,
      retry: false,
    },
    request: { cache: "no-store" },
  });
  return (
    <Screen contentContainerStyle={{ paddingBottom: 40 }}>
      <ModalHeader title="Story details" />
      {!validId ? (
        <EmptyState icon="file-text" title="Story unavailable" />
      ) : query.isPending ? (
        <LoadingView />
      ) : query.isError ? (
        <>
          <EmptyState icon="file-text" title="Story unavailable" message="This story may have been removed or is no longer shared." />
          <ErrorView onRetry={() => void query.refetch()} />
        </>
      ) : query.data ? (
        <CommunityPostCard
          post={query.data}
          detail
          showStatus={!!query.data.status}
          privateImages={!!query.data.status && query.data.status !== "approved"}
        />
      ) : null}
    </Screen>
  );
}