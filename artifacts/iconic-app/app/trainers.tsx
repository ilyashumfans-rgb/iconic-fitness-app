import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyMembershipQueryKey,
  getListCoachCategoriesQueryKey,
  getListMyTrainerBookingsQueryKey,
  useGetMyMembership,
  useListCoachCategories,
  useListGyms,
  useListMyTrainerBookings,
  type Gym,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { CoachCategoryCard } from "@/components/CoachCategoryCard";

export default function TrainersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
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
  // Don't flash the all-branches picker (or the roster) while checks load.
  const membershipSettled =
    isLoaded && (!isSignedIn || membershipQuery.isSuccess || membershipQuery.isError);

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

  // Published coach categories for this branch; counts only include coaches
  // linked to the category at THIS branch (server-side, exact upstream IDs).
  const catParams = { gymId: gymId ?? 0 };
  const liveQuery = useListCoachCategories(catParams, {
    query: {
      enabled: gymId !== null,
      queryKey: getListCoachCategoriesQueryKey(catParams),
    },
  });
  const categories = useMemo(() => liveQuery.data ?? [], [liveQuery.data]);
  const branchLabel = selectedGym?.name ?? membershipQuery.data?.branchName ?? "";
  const openCategory = (id: string) =>
    router.push({ pathname: "/coach-category/[id]", params: { id, gymId: String(gymId), gymName: branchLabel } });

  if (!membershipSettled) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 8 }}>
        <ModalHeader title="Personal Trainers" />
        <LoadingView />
      </Screen>
    );
  }
  if (isSignedIn && membershipQuery.isError) {
    return <Screen><ModalHeader title="Personal Trainers" /><ErrorView onRetry={() => void membershipQuery.refetch()} /></Screen>;
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
        <AppText muted size={13} style={{ marginBottom: 12 }}>
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
          <View style={{ gap: 10 }}>
            {gyms.map((g) => (
              <BranchCard key={g.id} gym={g} onPress={() => setPickedGymId(g.id)} />
            ))}
          </View>
        )}
      </Screen>
    );
  }

  // Step 2 — coach categories at the chosen branch.
  return (
    <Screen
      contentContainerStyle={{ paddingTop: 8 }}
      refreshing={liveQuery.isRefetching}
      onRefresh={() => void liveQuery.refetch()}
    >
      <ModalHeader title="Personal Trainers" />

      {/* Booking is members-only: tell guests/inactive users how to unlock it. */}
      {!isActiveMember ? (
        <View
          style={{
            flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12,
            backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
          }}
        >
          <Feather name="lock" size={14} color={colors.primary} />
          <AppText muted size={12} style={{ flex: 1, lineHeight: 17 }}>
            PT booking is for active members. Get a membership to book your coach.
          </AppText>
        </View>
      ) : null}

      {/* Kick-starter trial CTA — hidden once the member has sent a trial request. */}
      {!isActiveMember || trialRequested ? null : (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/book-trainer",
              params: { trial: "1", gymId: String(gymId), gymName: branchLabel },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Book your free trial session"
          testID="button-book-trial"
          style={{ marginBottom: 16 }}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56,
                backgroundColor: "#0F140C", borderRadius: 14, borderWidth: 1, borderColor: colors.primary,
                paddingHorizontal: 12, paddingVertical: 10, opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Feather name="zap" size={16} color={colors.primaryForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={14} color="#F4F6F0">Book your trial session</AppText>
                <AppText size={12} color="#A9B3A2">Free kick-starter PT trial</AppText>
              </View>
              <Feather name="arrow-right" size={17} color={colors.primary} />
            </View>
          )}
        </Pressable>
      )}

      <AppText weight="700" size={15} style={{ marginBottom: 10 }} accessibilityRole="header">
        Find your kind of coach
      </AppText>
      {liveQuery.isLoading ? (
        <LoadingView />
      ) : liveQuery.isError ? (
        <ErrorView onRetry={() => void liveQuery.refetch()} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon="grid"
          title="Coach categories coming soon"
          message="This branch hasn't listed its coaching categories yet. You can still browse every coach below."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {categories.map((c) => (
            <CoachCategoryCard key={c.id} category={c} onSeeCoaches={() => openCategory(c.id)} />
          ))}
        </View>
      )}
      {/* Branch-wide coach browsing belongs after the coaching categories. */}
      <Pressable
        onPress={() => openCategory("all")}
        accessibilityRole="button"
        accessibilityLabel="Browse all coaches at this branch"
        testID="button-all-coaches"
        style={{ marginTop: 16 }}
      >
        {({ pressed }) => (
          <View
            style={{
              flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52,
              backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 14,
              opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }],
            }}
          >
            <Feather name="users" size={17} color={colors.primaryForeground} />
            <AppText weight="700" size={14} color={colors.primaryForeground} style={{ flex: 1 }}>
              Browse all coaches at this branch
            </AppText>
            <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
          </View>
        )}
      </Pressable>
    </Screen>
  );
}

function BranchCard({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Choose ${gym.name}`} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
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
            <AppText weight="600" size={14}>
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

