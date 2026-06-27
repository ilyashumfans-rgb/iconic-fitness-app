import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChallengeQueryKey,
  getListChallengesQueryKey,
  useGetChallenge,
  useJoinChallenge,
  useLeaveChallenge,
  type LeaderboardEntry,
} from "@workspace/api-client-react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import {
  challengePeriodLabel,
  challengeProgressPct,
  challengeUnitLabel,
  challengeValue,
} from "@/lib/challenges";
import { resolveImageUrl } from "@/lib/images";

export default function ChallengeDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const challengeId = Number(id);
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useGetChallenge(challengeId, {
    query: {
      enabled: Number.isInteger(challengeId),
      queryKey: getGetChallengeQueryKey(challengeId),
    },
  });
  const join = useJoinChallenge();
  const leave = useLeaveChallenge();
  const [busy, setBusy] = useState(false);

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const c = query.data;

  const onToggle = async () => {
    if (!c) return;
    setBusy(true);
    try {
      if (c.joined) await leave.mutateAsync({ challengeId });
      else await join.mutateAsync({ challengeId });
      await queryClient.invalidateQueries({
        queryKey: getGetChallengeQueryKey(challengeId),
      });
      await queryClient.invalidateQueries({
        queryKey: getListChallengesQueryKey(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ModalHeader title="Challenge" />

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError || !c ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : (
        <>
          {/* Hero */}
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary + "22",
                }}
              >
                <Feather
                  name={c.icon as keyof typeof Feather.glyphMap}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={19}>
                  {c.title}
                </AppText>
                <AppText muted size={12} style={{ marginTop: 2 }}>
                  {challengePeriodLabel(c.period)} · {c.participantCount}{" "}
                  {c.participantCount === 1 ? "member" : "members"}
                </AppText>
              </View>
            </View>

            <AppText size={14} style={{ lineHeight: 20 }}>
              {c.description}
            </AppText>

            {/* My progress */}
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <AppText size={13} weight="600">
                  Your progress
                </AppText>
                <AppText size={13} weight="600" color={colors.primary}>
                  {challengeValue(c.myProgress, c.unit)} /{" "}
                  {challengeValue(c.goal, c.unit)} {challengeUnitLabel(c.unit)}
                </AppText>
              </View>
              <View
                style={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.elevated,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${challengeProgressPct(c.myProgress, c.goal) * 100}%`,
                    height: "100%",
                    backgroundColor: colors.primary,
                  }}
                />
              </View>
            </View>

            <Button
              label={c.joined ? "Leave challenge" : "Join challenge"}
              variant={c.joined ? "secondary" : "primary"}
              icon={c.joined ? "x" : "plus"}
              loading={busy}
              full
              onPress={onToggle}
            />
          </Card>

          {/* Leaderboard */}
          <AppText weight="700" size={18} style={{ marginTop: 28, marginBottom: 14 }}>
            Leaderboard
          </AppText>

          {c.leaderboard.length === 0 ? (
            <EmptyState
              icon="users"
              title="No one yet"
              message="Be the first to join and lead the board."
            />
          ) : (
            <View style={{ gap: 10 }}>
              {c.leaderboard.map((entry) => (
                <LeaderRow key={entry.rank} entry={entry} unit={c.unit} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function LeaderRow({
  entry,
  unit,
}: {
  entry: LeaderboardEntry;
  unit: string;
}) {
  const colors = useColors();
  const avatar = resolveImageUrl(entry.avatarUrl);
  const isPodium = entry.rank <= 3;

  return (
    <Card
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderColor: entry.isMe ? colors.primary : colors.border,
        borderWidth: entry.isMe ? 1.5 : undefined,
      }}
    >
      <View
        style={{
          width: 30,
          alignItems: "center",
        }}
      >
        {isPodium ? (
          <Feather
            name="award"
            size={20}
            color={
              entry.rank === 1
                ? "#E0B020"
                : entry.rank === 2
                  ? "#9AA3AD"
                  : "#B5793A"
            }
          />
        ) : (
          <AppText weight="700" size={15} muted>
            {entry.rank}
          </AppText>
        )}
      </View>

      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: 38, height: 38, borderRadius: 19 }}
        />
      ) : (
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
          <Feather name="user" size={18} color={colors.mutedForeground} />
        </View>
      )}

      <AppText weight="600" size={15} style={{ flex: 1 }}>
        {entry.isMe ? "You" : entry.name}
      </AppText>

      <AppText weight="700" size={15} color={colors.primary}>
        {challengeValue(entry.progress, unit)} {challengeUnitLabel(unit)}
      </AppText>
    </Card>
  );
}
