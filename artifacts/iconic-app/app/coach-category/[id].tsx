import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyMembershipQueryKey,
  getListCoachCategoriesQueryKey,
  getListCoachCategoryTrainersQueryKey,
  getListLiveTrainersQueryKey,
  useGetMyMembership,
  useListCoachCategories,
  useListCoachCategoryTrainers,
  useListLiveTrainers,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { LiveTrainerCard } from "@/components/LiveTrainerCard";
import { NetworkCoachBrowser } from "@/components/network-coach/NetworkCoachBrowser";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

/** Coaches for one category at one branch. id === "all" shows the full branch roster. */
export default function CoachCategoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id, gymId: gymParam, gymName } = useLocalSearchParams<{ id: string; gymId: string; gymName?: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  // Same lock as /trainers: active members only ever see their home branch,
  // even if this screen is opened via a direct URL with another gymId.
  const membershipQuery = useGetMyMembership({
    query: { enabled: !!isSignedIn, queryKey: getGetMyMembershipQueryKey() },
  });
  const homeGymId = membershipQuery.data?.status === "active" ? (membershipQuery.data.homeGymId ?? null) : null;
  const membershipSettled = isLoaded && (!isSignedIn || membershipQuery.isSuccess || membershipQuery.isError);
  const membershipFailed = !!isSignedIn && membershipQuery.isError;
  const requestedGymId = Number(gymParam);
  const gymId = homeGymId ?? requestedGymId;
  const branchLabel = homeGymId !== null ? (membershipQuery.data?.branchName || "Your branch") : (gymName || "Selected branch");
  const validGym = membershipSettled && !membershipFailed && Number.isInteger(gymId) && gymId > 0;
  const isAll = id === "all";
  const params = { gymId };

  const categoriesQuery = useListCoachCategories(params, {
    query: { enabled: validGym && !isAll, queryKey: getListCoachCategoriesQueryKey(params) },
  });
  const categoryQuery = useListCoachCategoryTrainers(String(id), params, {
    query: { enabled: validGym && !isAll, queryKey: getListCoachCategoryTrainersQueryKey(String(id), params) },
  });
  const allQuery = useListLiveTrainers(params, {
    query: { enabled: validGym && isAll, queryKey: getListLiveTrainersQueryKey(params) },
  });
  const query = isAll ? allQuery : categoryQuery;
  const trainers = useMemo(() => query.data ?? [], [query.data]);
  const category = categoriesQuery.data?.find(c => c.id === id);
  const title = isAll ? "All coaches" : category?.title ?? "Coaches";
  const notFound = !isAll && (query.error as { status?: number } | null)?.status === 404;

  const back = () => (router.canGoBack() ? router.back() : router.replace("/trainers"));

  // Iconic Network Coach (explicit capability flag, not title): all branches + online booking.
  // Other categories keep their branch-scoped roster below unchanged.
  if (category?.networkCoach === true) return <NetworkCoachBrowser key={category.id} title={category.title} initialCategoryId={category.id} />;

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Back to coach categories"
          testID="button-back-categories"
          hitSlop={10}
          style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border }}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="700" size={22} style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">{title}</AppText>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18, marginLeft: 50 }}>
        <Feather name="map-pin" size={13} color={colors.primary} />
        <AppText muted size={13}>{branchLabel}{homeGymId !== null ? " · your branch" : ""}</AppText>
      </View>

      {!membershipSettled ? (
        <LoadingView />
      ) : membershipFailed ? (
        <ErrorView onRetry={() => void membershipQuery.refetch()} />
      ) : !validGym ? (
        <EmptyState icon="map-pin" title="Pick a branch first" message="Go back and choose a branch to see its coaches." />
      ) : query.isLoading ? (
        <LoadingView />
      ) : notFound ? (
        <EmptyState icon="eye-off" title="Category unavailable" message="This category is no longer listed. Go back to see the current ones." />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : trainers.length === 0 ? (
        <EmptyState
          icon="users"
          title="No coaches here yet"
          message={isAll
            ? "This branch hasn't published its trainer roster yet — check back soon or ask at the front desk."
            : "No coaches at this branch are linked to this category yet. Check another category or ask at the front desk."}
        />
      ) : (
        <View style={{ gap: 14 }}>
          {trainers.map((t) => (
            <LiveTrainerCard
              key={t.id}
              trainer={t}
              onPress={() => router.push({ pathname: "/live-trainer/[id]", params: { id: t.id, gymId: String(gymId) } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
