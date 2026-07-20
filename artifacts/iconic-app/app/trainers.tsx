import { Feather } from "@expo/vector-icons";
import {
  getListLiveTrainersQueryKey,
  useListGyms,
  useListLiveTrainers,
  type Gym,
  type LiveTrainer,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

export default function TrainersScreen() {
  const router = useRouter();
  const colors = useColors();
  const gymsQuery = useListGyms({});
  const [gymId, setGymId] = useState<number | null>(null);

  const gyms = useMemo(() => gymsQuery.data ?? [], [gymsQuery.data]);
  const selectedGym = gyms.find((g) => g.id === gymId) ?? null;

  // Live roster from the gym-management system only — no local fallback, so
  // members never see stale or hand-entered trainer profiles.
  const liveParams = gymId !== null ? { gymId } : undefined;
  const liveQuery = useListLiveTrainers(liveParams, {
    query: {
      enabled: gymId !== null,
      queryKey: getListLiveTrainersQueryKey(liveParams),
    },
  });

  const liveTrainers = useMemo(() => liveQuery.data ?? [], [liveQuery.data]);

  // Step 1 — pick a branch.
  if (gymId === null) {
    return (
      <Screen
        contentContainerStyle={{ paddingTop: 8 }}
        refreshing={gymsQuery.isRefetching}
        onRefresh={() => void gymsQuery.refetch()}
      >
        <ModalHeader title="Personal Trainers" />
        <AppText muted size={14} style={{ marginBottom: 16 }}>
          Pick your branch to see its coaches.
        </AppText>
        {gymsQuery.isLoading ? (
          <LoadingView />
        ) : gymsQuery.isError ? (
          <ErrorView onRetry={() => void gymsQuery.refetch()} />
        ) : gyms.length === 0 ? (
          <EmptyState
            icon="map-pin"
            title="No branches yet"
            message="Check back soon."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {gyms.map((g) => (
              <BranchCard key={g.id} gym={g} onPress={() => setGymId(g.id)} />
            ))}
          </View>
        )}
      </Screen>
    );
  }

  // Step 2 — live trainers at the chosen branch.
  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={liveQuery.isRefetching}
      onRefresh={() => void liveQuery.refetch()}
    >
      <ModalHeader title="Personal Trainers" />
      <Pressable
        onPress={() => setGymId(null)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
        }}
      >
        <Feather name="map-pin" size={14} color={colors.primary} />
        <AppText weight="600" size={14} color={colors.primary}>
          {selectedGym?.name ?? "Branch"}
        </AppText>
        <AppText muted size={13}>
          · change
        </AppText>
      </Pressable>

      {liveQuery.isLoading ? (
        <LoadingView />
      ) : liveQuery.isError ? (
        <ErrorView onRetry={() => void liveQuery.refetch()} />
      ) : liveTrainers.length === 0 ? (
        <EmptyState
          icon="users"
          title="No coaches listed"
          message="This branch hasn't published its trainer roster yet — check back soon or ask at the front desk."
        />
      ) : (
        // Two-up grid: big photo tiles with the name underneath, so the
        // whole roster is visible at a glance instead of a long list.
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: 12,
          }}
        >
          {liveTrainers.map((t) => (
            <LiveTrainerCard
              key={t.id}
              trainer={t}
              onPress={() =>
                router.push({
                  pathname: "/book-trainer",
                  params: {
                    trainerName: t.name,
                    trainerId: t.id,
                    gymId: String(gymId),
                    gymName: selectedGym?.name ?? "",
                  },
                })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function BranchCard({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.elevated,
            }}
          >
            <Feather name="map-pin" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={15}>
              {gym.name}
            </AppText>
            <AppText muted size={13} style={{ marginTop: 1 }}>
              {[gym.area, gym.city].filter(Boolean).join(", ")}
            </AppText>
          </View>
          <Feather
            name="chevron-right"
            size={20}
            color={colors.mutedForeground}
          />
        </View>
      </Card>
    </Pressable>
  );
}

function LiveTrainerCard({
  trainer,
  onPress,
}: {
  trainer: LiveTrainer;
  onPress: () => void;
}) {
  const colors = useColors();
  const photo = resolveImageUrl(trainer.photoUrl ?? null);
  const initials = trainer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <Pressable onPress={onPress} style={{ width: "48.5%" }}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: "100%", aspectRatio: 1 }}
          />
        ) : (
          <View
            style={{
              width: "100%",
              aspectRatio: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.elevated,
            }}
          >
            <AppText weight="700" size={34} color={colors.primary}>
              {initials || "PT"}
            </AppText>
          </View>
        )}
        <View style={{ padding: 12, gap: 2 }}>
          <AppText weight="700" size={15} numberOfLines={1}>
            {trainer.name}
          </AppText>
          <AppText muted size={12}>
            Personal Trainer
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}
