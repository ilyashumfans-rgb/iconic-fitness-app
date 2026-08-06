import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyMembershipQueryKey,
  getGetMyPtProgramQueryKey,
  getListLiveTrainersQueryKey,
  getListMyTrainerBookingsQueryKey,
  useGetMyMembership,
  useGetMyPtProgram,
  useListGyms,
  useListLiveTrainers,
  useListMyTrainerBookings,
  type Gym,
  type LiveTrainer,
} from "@workspace/api-client-react";
import { Redirect, useRouter } from "expo-router";
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
  const { isSignedIn } = useAuth();
  const gymsQuery = useListGyms({});
  const [pickedGymId, setPickedGymId] = useState<number | null>(null);

  // Active members are locked to their home branch: only that branch's
  // coaches are shown, no picker. Everyone else browses all branches.
  const membershipQuery = useGetMyMembership({
    query: { enabled: !!isSignedIn, queryKey: getGetMyMembershipQueryKey() },
  });
  const homeGymId =
    membershipQuery.data?.status === "active"
      ? (membershipQuery.data.homeGymId ?? null)
      : null;
  const locked = homeGymId !== null;
  // Booking (trial, PT sessions, coach enquiry) is for ACTIVE members only —
  // guests and inactive members can still browse the roster.
  const isActiveMember =
    !!isSignedIn && membershipQuery.data?.status === "active";
  const gymId = locked ? homeGymId : pickedGymId;
  // Members with an assigned PT program skip the roster entirely — their
  // trainer is already fixed, so show their PT Details instead.
  const ptProgramQuery = useGetMyPtProgram({
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetMyPtProgramQueryKey(),
    },
  });
  // Don't flash the all-branches picker (or the roster) while checks load.
  const membershipSettled =
    (!isSignedIn || membershipQuery.isSuccess || membershipQuery.isError) &&
    (!isSignedIn || ptProgramQuery.isSuccess || ptProgramQuery.isError);

  // Once a member has sent their free kick-starter trial request, hide the
  // trial CTA (only that button) — one trial per member.
  const myBookingsQuery = useListMyTrainerBookings({
    query: {
      enabled: !!isSignedIn,
      queryKey: getListMyTrainerBookingsQueryKey(),
    },
  });
  const trialRequested = (myBookingsQuery.data ?? []).some(
    (b) => b.status === "enquiry" && b.trainerName === "Trial session",
  );

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

  if (!membershipSettled) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 8 }}>
        <ModalHeader title="Personal Trainers" />
        <LoadingView />
      </Screen>
    );
  }

  // Assigned PT members never see the roster — straight to their PT Details.
  if (ptProgramQuery.data?.active === true) {
    return <Redirect href="/pt-details" />;
  }

  // Step 1 — pick a branch (skipped for active members: home branch only).
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
              <BranchCard key={g.id} gym={g} onPress={() => setPickedGymId(g.id)} />
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
        onPress={locked ? undefined : () => setPickedGymId(null)}
        disabled={locked}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
        }}
      >
        <Feather name="map-pin" size={14} color={colors.primary} />
        <AppText weight="600" size={14} color={colors.primary}>
          {selectedGym?.name ?? membershipQuery.data?.branchName ?? "Branch"}
        </AppText>
        {locked ? (
          <AppText muted size={13}>
            · your branch
          </AppText>
        ) : (
          <AppText muted size={13}>
            · change
          </AppText>
        )}
      </Pressable>

      {/* Booking is members-only: tell guests/inactive users how to unlock it. */}
      {!isActiveMember ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 18,
          }}
        >
          <Feather name="lock" size={16} color={colors.primary} />
          <AppText muted size={13} style={{ flex: 1 }}>
            Personal training booking is for active members. Get a membership
            to book your coach.
          </AppText>
        </View>
      ) : null}

      {/* Prominent kick-starter trial CTA — shown FIRST, no need to pick a
          coach. Hidden once the member has already sent a trial request. */}
      {!isActiveMember || trialRequested ? null : (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/book-trainer",
              params: {
                trial: "1",
                gymId: String(gymId),
                gymName: selectedGym?.name ?? membershipQuery.data?.branchName ?? "",
              },
            })
          }
          style={{ marginBottom: 12 }}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: "#C7F000",
                borderRadius: 16,
                paddingHorizontal: 18,
                paddingVertical: 16,
                opacity: pressed ? 0.85 : 1,
              }}
            >
              <Feather name="zap" size={20} color="#0A0C08" />
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={16} color="#0A0C08">
                  Book your trial session
                </AppText>
                <AppText size={12} color="#0A0C08" style={{ opacity: 0.7 }}>
                  Free kick-starter PT trial — we'll match you with a coach
                </AppText>
              </View>
              <Feather name="arrow-right" size={20} color="#0A0C08" />
            </View>
          )}
        </Pressable>
      )}

      {/* Paid PT packages for this branch — live prices + online payment. */}
      {!isActiveMember ? null : (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/book-pt-sessions",
            params: {
              gymId: String(gymId),
              gymName: selectedGym?.name ?? membershipQuery.data?.branchName ?? "",
            },
          })
        }
        style={{ marginBottom: 18 }}
      >
        {({ pressed }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.primary,
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 16,
              opacity: pressed ? 0.85 : 1,
            }}
          >
            <Feather name="credit-card" size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={16} color="#fff">
                Book your PT sessions
              </AppText>
              <AppText size={12} color="#fff" style={{ opacity: 0.8 }}>
                See this branch's PT prices and pay online
              </AppText>
            </View>
            <Feather name="arrow-right" size={20} color="#fff" />
          </View>
        )}
      </Pressable>
      )}

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
        // Single column: one big photo tile per row, name underneath.
        <View style={{ gap: 14 }}>
          {liveTrainers.map((t) => (
            <LiveTrainerCard
              key={t.id}
              trainer={t}
              onPress={() =>
                !isActiveMember
                  ? router.push("/(tabs)/packages")
                  : router.push({
                  pathname: "/book-trainer",
                  params: {
                    trainerName: t.name,
                    trainerId: t.id,
                    trainerPhotoUrl: t.photoUrl ?? "",
                    gymId: String(gymId),
                    gymName:
                      selectedGym?.name ??
                      membershipQuery.data?.branchName ??
                      "",
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
    <Pressable onPress={onPress}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: "100%", aspectRatio: 4 / 3 }}
          />
        ) : (
          <View
            style={{
              width: "100%",
              aspectRatio: 4 / 3,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.elevated,
            }}
          >
            <AppText weight="700" size={48} color={colors.primary}>
              {initials || "PT"}
            </AppText>
          </View>
        )}
        <View style={{ padding: 16, gap: 2 }}>
          <AppText weight="700" size={17} numberOfLines={1}>
            {trainer.name}
          </AppText>
          <AppText muted size={13}>
            Personal Trainer
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}
