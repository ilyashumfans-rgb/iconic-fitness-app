import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useListChallenges, type Challenge } from "@workspace/api-client-react";
import { Redirect, useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
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

export default function ChallengesScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const query = useListChallenges();

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const challenges = query.data ?? [];

  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ModalHeader title="Challenges" />
      <AppText muted size={14} style={{ marginBottom: 16 }}>
        Join a challenge and climb the leaderboard.
      </AppText>

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : challenges.length === 0 ? (
        <EmptyState
          icon="award"
          title="No challenges yet"
          message="Check back soon — new challenges are on the way."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onPress={() => router.push(`/challenge/${c.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ChallengeCard({
  challenge,
  onPress,
}: {
  challenge: Challenge;
  onPress: () => void;
}) {
  const colors = useColors();
  const pct = challengeProgressPct(challenge.myProgress, challenge.goal);

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary + "22",
            }}
          >
            <Feather
              name={challenge.icon as keyof typeof Feather.glyphMap}
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText weight="700" size={16} style={{ flex: 1 }}>
                {challenge.title}
              </AppText>
              {challenge.joined ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: colors.primary + "22",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                  }}
                >
                  <Feather name="check" size={11} color={colors.primary} />
                  <AppText size={11} weight="600" color={colors.primary}>
                    Joined
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText muted size={12} style={{ marginTop: 2 }}>
              {challengePeriodLabel(challenge.period)} · {challenge.participantCount}{" "}
              {challenge.participantCount === 1 ? "member" : "members"}
            </AppText>
          </View>

          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </View>

        <View style={{ marginTop: 14, gap: 6 }}>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.elevated,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${pct * 100}%`,
                height: "100%",
                backgroundColor: colors.primary,
              }}
            />
          </View>
          <AppText muted size={12}>
            {challengeValue(challenge.myProgress, challenge.unit)} /{" "}
            {challengeValue(challenge.goal, challenge.unit)}{" "}
            {challengeUnitLabel(challenge.unit)}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}
