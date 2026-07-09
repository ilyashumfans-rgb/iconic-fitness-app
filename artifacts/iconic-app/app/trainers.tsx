import { Feather } from "@expo/vector-icons";
import {
  useListLiveTrainers,
  useListTrainers,
  type LiveTrainer,
  type Trainer,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import {
  Chip,
  ChipRow,
  EmptyState,
  ErrorView,
  LoadingView,
} from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

export default function TrainersScreen() {
  const router = useRouter();
  const liveQuery = useListLiveTrainers();
  const query = useListTrainers({});
  const [specialty, setSpecialty] = useState<string | null>(null);

  const liveTrainers = useMemo(
    () => liveQuery.data ?? [],
    [liveQuery.data],
  );
  // The gym-management system is the real roster; fall back to the in-app
  // trainer profiles only when it has nothing for us.
  const useLive = liveTrainers.length > 0;

  const trainers = useMemo(() => query.data ?? [], [query.data]);
  const specialties = useMemo(
    () => Array.from(new Set(trainers.map((t) => t.specialty))).sort(),
    [trainers],
  );
  const filtered = useMemo(
    () =>
      specialty ? trainers.filter((t) => t.specialty === specialty) : trainers,
    [trainers, specialty],
  );

  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={liveQuery.isRefetching || query.isRefetching}
      onRefresh={() => {
        void liveQuery.refetch();
        void query.refetch();
      }}
    >
      <ModalHeader title="Personal Trainers" />
      <AppText muted size={14} style={{ marginBottom: 16 }}>
        Browse certified coaches and request a 1-on-1 session.
      </AppText>

      {liveQuery.isLoading || (!useLive && query.isLoading) ? (
        <LoadingView />
      ) : useLive ? (
        <View style={{ gap: 12 }}>
          {liveTrainers.map((t) => (
            <LiveTrainerCard
              key={t.id}
              trainer={t}
              onPress={() =>
                router.push({
                  pathname: "/book-trainer",
                  params: { trainerName: t.name },
                })
              }
            />
          ))}
        </View>
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : trainers.length === 0 ? (
        <EmptyState
          icon="users"
          title="No trainers yet"
          message="Check back soon — coaches are being added."
        />
      ) : (
        <>
          {specialties.length > 1 ? (
            <View style={{ marginBottom: 16 }}>
              <ChipRow>
                <Chip
                  label="All"
                  active={specialty === null}
                  onPress={() => setSpecialty(null)}
                />
                {specialties.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    active={s === specialty}
                    onPress={() => setSpecialty(s)}
                  />
                ))}
              </ChipRow>
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
            {filtered.map((t) => (
              <TrainerCard
                key={t.id}
                trainer={t}
                onPress={() => router.push(`/trainer/${t.id}`)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
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
  const initials = trainer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.elevated,
            }}
          >
            <AppText weight="700" size={16} color={colors.primary}>
              {initials || "PT"}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={16}>
              {trainer.name}
            </AppText>
            <AppText muted size={13} style={{ marginTop: 1 }}>
              Personal Trainer
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

function TrainerCard({
  trainer,
  onPress,
}: {
  trainer: Trainer;
  onPress: () => void;
}) {
  const colors = useColors();
  const photo = resolveImageUrl(trainer.photoUrl);

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", gap: 14 }}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: 64, height: 64, borderRadius: 14 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.elevated,
              }}
            >
              <Feather name="user" size={26} color={colors.mutedForeground} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <AppText weight="700" size={16}>
              {trainer.name}
            </AppText>
            <AppText muted size={13} style={{ marginTop: 1 }}>
              {trainer.specialty}
            </AppText>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="star" size={13} color={colors.primary} />
                <AppText size={13} weight="600">
                  {trainer.rating.toFixed(1)}
                </AppText>
              </View>
              <AppText muted size={13}>
                ₹{trainer.pricePerSession}/session
              </AppText>
            </View>
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
