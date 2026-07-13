import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  getGetMyMembershipQueryKey,
  getGetTrackingSummaryQueryKey,
  getListGymsQueryKey,
  getListMembershipsQueryKey,
  getListMyBookingsQueryKey,
  useAddWater,
  useCreateBooking,
  useGetMe,
  useGetMyMembership,
  useGetTrackingSummary,
  type MyMembership,
  useListClasses,
  useListGyms,
  useListMemberships,
  useListMyBookings,
  useListHomeSlides,
  useListStoreCategories,
  useListStoreProducts,
  type ClassSession,
  type Gym,
  type HomeSlide,
  type StoreCategory,
  type StoreProduct,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from "react-native";

import { AICoachCard } from "@/components/AICoachCard";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { NotificationBell } from "@/components/NotificationBell";
import { PackageCard } from "@/components/PackageCard";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { YouTubeInline } from "@/components/YouTubeInline";
import {
  CategoryCardSkeleton,
  GymCardSkeleton,
} from "@/components/Skeleton";
import { LoadingView, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useUserLocation } from "@/hooks/useUserLocation";
import {
  istToday,
  formatClock,
  formatDateLabel,
  istDateStr,
  istDateLabel,
} from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";
import {
  exploreUrl,
  membershipsUrl,
  openExternal,
  websiteUrl,
} from "@/lib/links";

type StoryVideo = {
  name: string;
  role: string;
  quote: string;
  src: string;
  poster: string;
};

const STORY_VIDEOS: StoryVideo[] = [
  {
    name: "Rikitha",
    role: "Fashion Designer · Entrepreneur",
    quote:
      "One pass, every gym near me — I finally stopped making excuses and started showing up.",
    src: `${websiteUrl}/media/testimonial-rikitha.mp4`,
    poster: `${websiteUrl}/media/testimonial-rikitha-poster.jpg`,
  },
  {
    name: "Suraj",
    role: "Product Manager · IT Services",
    quote:
      "The flexibility is unreal. I train wherever my day takes me and never miss a session.",
    src: `${websiteUrl}/media/testimonial-suraj.mp4`,
    poster: `${websiteUrl}/media/testimonial-suraj-poster.jpg`,
  },
  {
    name: "Albha",
    role: "IT Professional",
    quote:
      "Best decision I made this year. The gyms are world-class and the community keeps me going.",
    src: `${websiteUrl}/media/testimonial-albha.mp4`,
    poster: `${websiteUrl}/media/testimonial-albha-poster.jpg`,
  },
];

// Premium floating-card shadow (soft, brand-neutral). Web uses boxShadow to
// avoid the deprecated shadow* warning; native uses shadow*/elevation.
const CARD_SHADOW = Platform.select({
  web: { boxShadow: "0 14px 34px rgba(0,0,0,0.30)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
}) as ViewStyle;

// Number of days before renewal that we start warning the member.
const EXPIRY_SOON_DAYS = 7;

/** Whole IST calendar days from today until `dateIso` (negative = past). */
function daysUntilIst(dateIso: string): number {
  const today = Date.parse(`${istDateStr()}T00:00:00Z`);
  const target = Date.parse(`${istDateStr(new Date(dateIso))}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

/** Plan card pinned to the top of Home for members with a plan. */
function MembershipStatusCard({
  membership,
  onManage,
}: {
  membership: MyMembership;
  onManage: () => void;
}) {
  const colors = useColors();
  const days = daysUntilIst(membership.renewsOn);
  const isExpired = membership.status === "expired" || days < 0;
  const expiringSoon =
    !isExpired &&
    membership.status === "active" &&
    days <= EXPIRY_SOON_DAYS;
  const alert = isExpired || expiringSoon;
  const accent = isExpired ? "#FF6B6B" : expiringSoon ? "#FFB020" : colors.primary;
  const dateLabel = istDateLabel(istDateStr(new Date(membership.renewsOn)));

  const renewText = isExpired
    ? `Expired on ${dateLabel} — renew to keep access`
    : expiringSoon
      ? days <= 0
        ? `Expires today (${dateLabel}) — renew now`
        : `Expiring in ${days} day${days === 1 ? "" : "s"} · ${dateLabel}`
      : `Renews ${dateLabel}`;

  return (
    <Card style={{ gap: 12, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <AppText muted size={11} style={{ letterSpacing: 1 }}>
            YOUR MEMBERSHIP
          </AppText>
          <AppText weight="700" size={20} style={{ marginTop: 2 }}>
            {membership.planName}
          </AppText>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: accent + "22",
          }}
        >
          <AppText
            size={12}
            weight="700"
            color={accent}
            style={{ textTransform: "capitalize" }}
          >
            {membership.status}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather
          name={alert ? "alert-triangle" : "calendar"}
          size={14}
          color={alert ? accent : colors.mutedForeground}
        />
        <AppText
          size={13}
          weight={alert ? "700" : "400"}
          color={alert ? accent : undefined}
        >
          {renewText}
        </AppText>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText muted size={12}>
            Classes this month
          </AppText>
          <AppText weight="700" size={16}>
            {membership.classesUsed} / {membership.classesIncluded}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText muted size={12}>
            Gyms accessed
          </AppText>
          <AppText weight="700" size={16}>
            {membership.gymsAccessed}
          </AppText>
        </View>
      </View>

      <Button
        label={alert ? "Renew plan" : "Manage plan"}
        variant="secondary"
        icon="credit-card"
        onPress={onManage}
      />
    </Card>
  );
}

/** Entry card that opens the member-facing trainers list. */
function PersonalTrainersCard({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 16 }}>
      {({ pressed }) => (
        <Card style={{ opacity: pressed ? 0.92 : 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather
                name="users"
                size={24}
                color={colors.primaryForeground}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={17}>
                Personal Trainers
              </AppText>
              <AppText muted size={13} style={{ marginTop: 2 }}>
                Find a coach & book a 1-on-1 session
              </AppText>
            </View>
            <Feather
              name="chevron-right"
              size={22}
              color={colors.mutedForeground}
            />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const SOFT_SHADOW = Platform.select({
  web: { boxShadow: "0 8px 22px rgba(0,0,0,0.20)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
}) as ViewStyle;

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  // Public, no-auth content — works for guests and members alike.
  const gymsQuery = useListGyms({ sort: "rating" });
  const classesQuery = useListClasses({});
  const membershipsQuery = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });

  // Personal content — only fetched when signed in (guests get 401 otherwise).
  const summaryQuery = useGetTrackingSummary(
    { date: istToday() },
    {
      query: {
        enabled: !!isSignedIn,
        queryKey: getGetTrackingSummaryQueryKey({ date: istToday() }),
      },
    },
  );
  const meQuery = useGetMe({
    query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() },
  });
  // Membership status drives which admin banner slides this viewer sees.
  // Guests can't call this endpoint (401), so it's only fetched when signed in;
  // a signed-in viewer with a non-null active plan counts as a "member".
  const myMembershipQuery = useGetMyMembership({
    query: { enabled: !!isSignedIn, queryKey: getGetMyMembershipQueryKey() },
  });
  // Guests are known non-members immediately. For signed-in viewers we only
  // "know" their status once /memberships/mine resolves — until then (or on a
  // transient error) targeting stays unsettled so we never misclassify a
  // member as a customer while loading.
  const membershipSettled = !isSignedIn || myMembershipQuery.isSuccess;
  const isMember = !!isSignedIn && !!myMembershipQuery.data;
  const membership = myMembershipQuery.data ?? null;
  // An "active member" gets a plan-focused Home: their plan pinned to the top,
  // and the discovery sections (Explore packages / Top rated gyms) hidden.
  const hasActivePlan = isMember && membership?.status === "active";
  // Only reveal the discovery sections once membership status is settled, so a
  // signed-in active member never briefly flashes them while the plan loads.
  const showDiscovery = membershipSettled && !hasActivePlan;
  const bookingsQuery = useListMyBookings(
    { status: "upcoming" },
    {
      query: {
        enabled: !!isSignedIn,
        queryKey: getListMyBookingsQueryKey({ status: "upcoming" }),
      },
    },
  );

  const addWater = useAddWater();
  const createBooking = useCreateBooking();
  const [quickLogging, setQuickLogging] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const bookedClassIds = useMemo(
    () => new Set((bookingsQuery.data ?? []).map((b) => b.classId)),
    [bookingsQuery.data],
  );

  const gyms = useMemo(() => gymsQuery.data ?? [], [gymsQuery.data]);
  const heroGyms = useMemo(() => gyms.slice(0, 5), [gyms]);
  const featured = useMemo(
    () => (classesQuery.data ?? []).slice(0, 6),
    [classesQuery.data],
  );
  const packages = useMemo(
    () =>
      (membershipsQuery.data ?? [])
        .filter((p) => p.billingPeriod === "annual")
        .sort((a, b) => {
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return a.priceInr - b.priceInr;
        })
        .slice(0, 4),
    [membershipsQuery.data],
  );

  const refetchAll = useCallback(() => {
    void gymsQuery.refetch();
    void classesQuery.refetch();
    void membershipsQuery.refetch();
    if (isSignedIn) {
      void summaryQuery.refetch();
      void meQuery.refetch();
      void myMembershipQuery.refetch();
      void bookingsQuery.refetch();
    }
  }, [
    gymsQuery,
    classesQuery,
    membershipsQuery,
    isSignedIn,
    summaryQuery,
    meQuery,
    myMembershipQuery,
    bookingsQuery,
  ]);

  const onQuickWater = useCallback(async () => {
    if (quickLogging) return;
    setQuickLogging(true);
    try {
      await addWater.mutateAsync({ data: { amountMl: 250 } });
      await queryClient.invalidateQueries({
        queryKey: getGetTrackingSummaryQueryKey(),
      });
    } catch {
      // Guests (and any unauthenticated state) can't log data — fail quietly.
    } finally {
      setQuickLogging(false);
    }
  }, [quickLogging, addWater, queryClient]);

  const onBook = useCallback(
    async (session: ClassSession) => {
      if (!isSignedIn) {
        router.push("/(auth)/sign-in");
        return;
      }
      setBookingId(session.id);
      try {
        await createBooking.mutateAsync({ data: { classId: session.id } });
        await queryClient.invalidateQueries({
          queryKey: getListMyBookingsQueryKey(),
        });
        Alert.alert("Booked!", `You're in for ${session.title}.`);
      } catch {
        Alert.alert("Could not book", "This class may be full. Try another.");
      } finally {
        setBookingId(null);
      }
    },
    [isSignedIn, router, createBooking, queryClient],
  );

  const summary = summaryQuery.data;

  const calRatio = summary ? summary.caloriesIn / (summary.calorieGoal || 1) : 0;
  const waterRatio = summary ? summary.waterMl / (summary.waterGoalMl || 1) : 0;
  const stepRatio = summary ? summary.steps / (summary.stepGoal || 1) : 0;

  return (
    <View style={{ flex: 1 }}>
    <Screen
      refreshing={summaryQuery.isRefetching || gymsQuery.isRefetching}
      onRefresh={refetchAll}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      {/* AI Coach — signed-in users reach it as the last slide of the hero
          carousel below (one shared row); guests get the standalone card
          for the public Iconic assistant. */}
      {!isSignedIn ? (
        <AICoachCard
          needsAssessment={false}
          onPress={() => router.push("/coach")}
        />
      ) : null}

      {/* Explore packages (annual plans) — hidden for active members */}
      {showDiscovery && packages.length > 0 ? (
        <>
          <SectionHeader
            title="Explore packages"
            action="View all"
            onAction={() => router.push("/packages")}
          />
          <View style={{ gap: 12, marginBottom: 8 }}>
            {packages.map((plan) => (
              <PackageCard
                key={plan.id}
                plan={plan}
                onPress={() => router.push(`/package/${plan.id}`)}
              />
            ))}
          </View>
        </>
      ) : null}

      {/* Personal Trainers — find a coach & book a 1-on-1 session */}
      <PersonalTrainersCard onPress={() => router.push("/trainers")} />

      {/* Shop by category */}
      <ShopByCategory />

      {/* Home banner slider (admin-managed) */}
      <HeroSlider
        gyms={heroGyms}
        isMember={isMember}
        membershipSettled={membershipSettled}
        onExplore={() =>
          router.push({
            pathname: "/web",
            params: { url: exploreUrl, title: "Explore gyms" },
          })
        }
        onOpenUrl={(url, title) => {
          // Keep the viewer inside the app: internal paths navigate directly,
          // external links open in the in-app browser screen.
          if (url.startsWith("/")) {
            router.push(url as never);
            return;
          }
          router.push({
            pathname: "/web",
            params: { url, title: title ?? "Iconic Fitness" },
          });
        }}
        aiSlide={
          isSignedIn
            ? {
                needsAssessment:
                  !!meQuery.data && !meQuery.data.assessmentComplete,
                onPress: () => router.push("/coach"),
              }
            : undefined
        }
        nearSlide={{ onOpenGym: () => openExternal(exploreUrl) }}
      />

      {/* Current membership — for members with a plan */}
      {membership ? (
        <MembershipStatusCard
          membership={membership}
          onManage={() => openExternal(membershipsUrl)}
        />
      ) : null}

      {/* Watch our story (member testimonials) */}
      <StorySection />

      {/* Top rated gyms — hidden for active members */}
      {showDiscovery ? (
        <>
          <SectionHeader
            title="Top rated gyms"
            action="View all"
            onAction={() => openExternal(exploreUrl)}
          />
          {gymsQuery.isLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gymRow}
              style={{ marginBottom: 28 }}
            >
              {[0, 1, 2].map((k) => (
                <GymCardSkeleton key={k} />
              ))}
            </ScrollView>
          ) : gyms.length === 0 ? (
            <Card style={{ marginBottom: 28 }}>
              <AppText weight="700" size={15}>
                No gyms to show yet
              </AppText>
              <AppText muted size={13} style={{ marginTop: 4 }}>
                Pull to refresh or explore on our website.
              </AppText>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gymRow}
              style={{ marginBottom: 28 }}
            >
              {gyms.slice(0, 8).map((g, i) => (
                <GymCard
                  key={g.id}
                  gym={g}
                  index={i}
                  onPress={() => openExternal(exploreUrl)}
                />
              ))}
            </ScrollView>
          )}
        </>
      ) : null}

      {/* Book a class */}
      <SectionHeader
        title="Book your next session"
        action="See all"
        onAction={() => router.push("/classes")}
      />
      {classesQuery.isLoading ? (
        <View style={{ height: 150, justifyContent: "center" }}>
          <LoadingView />
        </View>
      ) : featured.length === 0 ? (
        <Card style={{ marginBottom: 28 }}>
          <AppText weight="700" size={15}>
            No classes scheduled
          </AppText>
          <AppText muted size={13} style={{ marginTop: 4 }}>
            New sessions drop soon — pull to refresh.
          </AppText>
        </Card>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classRow}
          style={{ marginBottom: 28 }}
        >
          {featured.map((s) => (
            <ClassCard
              key={s.id}
              session={s}
              booked={bookedClassIds.has(s.id)}
              loading={bookingId === s.id}
              onBook={() => onBook(s)}
              onOpen={() => router.push("/classes")}
            />
          ))}
        </ScrollView>
      )}

      {/* Personal tracking — members only */}
      {isSignedIn ? (
        <>
          <SectionHeader title="Your progress today" />
          <View style={styles.heroWrap}>
            <LinearGradient
              colors={[colors.primary + "26", "transparent"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[styles.heroGlow, { pointerEvents: "none" }]}
            />
            <Card style={styles.hero} tone="elevated">
              <View style={styles.ringWrap}>
                <ProgressRing
                  progress={calRatio}
                  size={150}
                  stroke={14}
                  color={colors.calorie}
                >
                  <ProgressRing
                    progress={waterRatio}
                    size={116}
                    stroke={12}
                    color={colors.water}
                  >
                    <ProgressRing
                      progress={stepRatio}
                      size={84}
                      stroke={11}
                      color={colors.steps}
                    >
                      <Feather
                        name="activity"
                        size={26}
                        color={colors.foreground}
                      />
                    </ProgressRing>
                  </ProgressRing>
                </ProgressRing>
              </View>

              <View style={styles.legend}>
                <LegendRow
                  color={colors.calorie}
                  label="Calories"
                  value={`${summary?.caloriesIn ?? 0}`}
                  goal={`${summary?.calorieGoal ?? 0} kcal`}
                />
                <LegendRow
                  color={colors.water}
                  label="Water"
                  value={`${((summary?.waterMl ?? 0) / 1000).toFixed(1)}L`}
                  goal={`${((summary?.waterGoalMl ?? 0) / 1000).toFixed(1)}L`}
                />
                <LegendRow
                  color={colors.steps}
                  label="Steps"
                  value={`${summary?.steps ?? 0}`}
                  goal={`${summary?.stepGoal ?? 0}`}
                />
              </View>
            </Card>
          </View>

          <SectionHeader title="Quick log" />
          <View style={styles.quickRow}>
            <QuickTile
              icon="droplet"
              label="+250ml"
              sub="Water"
              color={colors.water}
              onPress={onQuickWater}
              loading={quickLogging}
            />
            <QuickTile
              icon="coffee"
              label="Log meal"
              sub="Diet"
              color={colors.calorie}
              onPress={() => router.push("/diet")}
            />
            <QuickTile
              icon="activity"
              label="Workout"
              sub="Move"
              color={colors.primary}
              onPress={() => router.push("/workouts")}
            />
          </View>

          <SectionHeader title="Today" />
          <View style={styles.statGrid}>
            <StatCard
              icon="zap"
              tint={colors.primary}
              value={`${summary?.caloriesOut ?? 0}`}
              label="kcal burned"
            />
            <StatCard
              icon="award"
              tint={colors.protein}
              value={`${summary?.proteinG ?? 0}g`}
              label={`of ${summary?.proteinGoalG ?? 0}g protein`}
            />
            <StatCard
              icon="repeat"
              tint={colors.water}
              value={`${summary?.workouts ?? 0}`}
              label="workouts today"
            />
            <StatCard
              icon="target"
              tint={colors.calorie}
              value={`${summary?.weeklyWorkouts ?? 0}/${summary?.weeklyGoal ?? 0}`}
              label="weekly goal"
            />
          </View>

          <Pressable onPress={() => router.push("/water")}>
            <Card style={styles.waterCta}>
              <View style={{ flex: 1 }}>
                <AppText weight="700" size={16}>
                  Hydration log
                </AppText>
                <AppText muted size={13}>
                  Track every glass, hit your daily target.
                </AppText>
              </View>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.mutedForeground}
              />
            </Card>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => router.push("/(auth)/sign-in")}>
          <Card style={[styles.joinCta, SOFT_SHADOW]} tone="elevated">
            <View style={[styles.joinIcon, { backgroundColor: colors.primary }]}>
              <Feather name="user-plus" size={22} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={16}>
                Track your fitness
              </AppText>
              <AppText muted size={13} style={{ marginTop: 2 }}>
                Log in to book classes and track workouts, water & meals.
              </AppText>
            </View>
            <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
          </Card>
        </Pressable>
      )}
    </Screen>
      <NotificationBell />
    </View>
  );
}

type RenderSlide =
  | { key: string; type: "brand" }
  | { key: string; type: "gym"; gym: Gym }
  | { key: string; type: "admin"; slide: HomeSlide }
  | { key: string; type: "near" }
  | { key: string; type: "ai" };

function youtubeId(url: string): string | undefined {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  const id = m ? m[1] : /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
  return id ?? undefined;
}

function youtubeThumb(url: string): string | undefined {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
}

function isVideoSlide(item: RenderSlide): boolean {
  return (
    item.type === "admin" &&
    item.slide.kind === "youtube" &&
    !!youtubeId(item.slide.mediaUrl)
  );
}

function HeroSlider({
  gyms,
  isMember,
  membershipSettled,
  onExplore,
  onOpenUrl,
  aiSlide,
  nearSlide,
}: {
  gyms: Gym[];
  isMember: boolean;
  membershipSettled: boolean;
  onExplore: () => void;
  onOpenUrl: (url: string, title?: string) => void;
  /** When set, an AI coach slide is appended to the carousel (signed-in users). */
  aiSlide?: { needsAssessment: boolean; onPress: () => void };
  /** When set, a "Gyms near me" slide is appended to the carousel. */
  nearSlide?: { onOpenGym: () => void };
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  // Card-style slider sized like the AI Coach card: inset within the
  // Screen's 20px horizontal padding instead of full-bleed.
  const SLIDE_W = width - 40;
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const slidesQuery = useListHomeSlides();
  const adminSlides = slidesQuery.data ?? [];

  // Show only slides targeted at this viewer: "all" for everyone, "members"
  // for viewers with an active plan, "customers" for viewers without one.
  // Until membership status is settled we show only "all" slides so a member
  // is never briefly shown customer-only content (and vice versa).
  const visibleAdminSlides = useMemo(
    () =>
      adminSlides.filter((s) => {
        if (s.audience === "all") return true;
        if (!membershipSettled) return false;
        if (s.audience === "members") return isMember;
        return !isMember; // "customers"
      }),
    [adminSlides, isMember, membershipSettled],
  );

  // Admin-managed slides take over the banner entirely. When none are visible
  // to this viewer (fresh install / prod before setup, or every slide is
  // targeted at the other audience) we fall back to a code default so the
  // banner is never empty: a brand intro followed by the top gyms.
  const slides: RenderSlide[] = useMemo(() => {
    const base: RenderSlide[] =
      visibleAdminSlides.length > 0
        ? visibleAdminSlides.map((s) => ({
            key: `a${s.id}`,
            type: "admin" as const,
            slide: s,
          }))
        : [
            { key: "brand", type: "brand" as const },
            ...gyms.map((g) => ({
              key: `g${g.id}`,
              type: "gym" as const,
              gym: g,
            })),
          ];
    // "Gyms near me" rides in the same carousel — swipe to find the closest
    // branches (or enable location if it's off).
    if (nearSlide) base.push({ key: "near", type: "near" as const });
    // Signed-in users get the AI coach as the last slide of the same carousel
    // so the banner and AI share one row — swipe to reach the coach.
    if (aiSlide) base.push({ key: "ai", type: "ai" as const });
    return base;
  }, [visibleAdminSlides, gyms, aiSlide, nearSlide]);

  const total = slides.length;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Keep the active index valid if the slide count shrinks.
  useEffect(() => {
    if (active > total - 1) {
      setActive(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [total, active]);

  const goToNext = useCallback(() => {
    if (total <= 1) return;
    const next = (activeRef.current + 1) % total;
    scrollRef.current?.scrollTo({ x: next * SLIDE_W, animated: true });
    setActive(next);
  }, [total, SLIDE_W]);

  // Auto-advance: image/gif/gym/brand slides advance on a timer. Video slides
  // do NOT — they advance via `onEnded` once the video finishes playing.
  useEffect(() => {
    if (total <= 1) return;
    const current = slides[active];
    if (current && isVideoSlide(current)) return;
    const t = setTimeout(goToNext, 4500);
    return () => clearTimeout(t);
  }, [active, total, slides, goToNext]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
    setActive(idx);
  };

  const onAdminPress = (s: HomeSlide) => {
    if (s.kind === "youtube") {
      onOpenUrl(s.mediaUrl, s.title || "Video");
      return;
    }
    if (s.ctaUrl) {
      onOpenUrl(s.ctaUrl, s.title || undefined);
      return;
    }
    onExplore();
  };

  if (total === 0) return null;

  return (
    <View style={styles.sliderWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {slides.map((item, index) => {
          if (item.type === "near") {
            return (
              <View key={item.key} style={{ width: SLIDE_W }}>
                <NearbyGymsSlide onOpenGym={() => nearSlide?.onOpenGym()} />
              </View>
            );
          }

          if (item.type === "ai") {
            return (
              <View key={item.key} style={{ width: SLIDE_W }}>
                <AICoachCard
                  embedded
                  needsAssessment={aiSlide?.needsAssessment ?? false}
                  onPress={() => aiSlide?.onPress()}
                />
              </View>
            );
          }

          if (item.type === "brand") {
            return (
              <Pressable
                key={item.key}
                onPress={onExplore}
                style={{ width: SLIDE_W }}
              >
                <View style={[styles.slide, { backgroundColor: colors.card }]}>
                  <LinearGradient
                    colors={colors.primaryGradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.slideContent}>
                    <AppText
                      weight="700"
                      size={12}
                      color={colors.primaryForeground}
                    >
                      ICONIC FITNESS
                    </AppText>
                    <AppText
                      weight="700"
                      size={26}
                      color={colors.primaryForeground}
                      style={{ marginTop: 6 }}
                    >
                      Train like you mean it.
                    </AppText>
                    <View style={styles.sliderCtaPill}>
                      <AppText weight="700" size={13} color={colors.primary}>
                        Explore gyms
                      </AppText>
                      <Feather
                        name="arrow-right"
                        size={14}
                        color={colors.primary}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }

          if (item.type === "gym") {
            const g = item.gym;
            const img = resolveImageUrl(g.heroImage);
            return (
              <Pressable
                key={item.key}
                onPress={onExplore}
                style={{ width: SLIDE_W }}
              >
                <View style={[styles.slide, { backgroundColor: colors.card }]}>
                  {img ? (
                    <Image
                      source={{ uri: img }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <LinearGradient
                    colors={["transparent", "rgba(10,12,8,0.92)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.slideTopRow}>
                    {g.isPremium ? (
                      <View
                        style={[styles.badge, { backgroundColor: colors.primary }]}
                      >
                        <AppText
                          weight="700"
                          size={10}
                          color={colors.primaryForeground}
                        >
                          PREMIUM
                        </AppText>
                      </View>
                    ) : (
                      <View />
                    )}
                    <View style={styles.ratingPill}>
                      <Feather name="star" size={11} color={colors.primary} />
                      <AppText weight="700" size={11} color={colors.foreground}>
                        {g.rating.toFixed(1)}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.slideContent}>
                    <AppText weight="700" size={22} color={colors.foreground}>
                      {g.name}
                    </AppText>
                    <View style={styles.slideMetaRow}>
                      <Feather
                        name="map-pin"
                        size={13}
                        color={colors.mutedForeground}
                      />
                      <AppText size={13} color={colors.mutedForeground}>
                        {g.area || g.city}
                      </AppText>
                      <AppText size={13} color={colors.primary} weight="700">
                        {"  ₹"}
                        {g.priceFrom}/mo
                      </AppText>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }

          // Admin-managed slide (image / gif / youtube)
          const s = item.slide;
          const isYt = s.kind === "youtube";
          const ytId = isYt ? youtubeId(s.mediaUrl) : undefined;
          const mediaUri = isYt
            ? youtubeThumb(s.mediaUrl)
            : resolveImageUrl(s.mediaUrl);
          const hasText = !!(s.title || s.subtitle || s.ctaLabel);
          return (
            <Pressable
              key={item.key}
              onPress={() => onAdminPress(s)}
              style={{ width: SLIDE_W }}
            >
              <View style={[styles.slide, { backgroundColor: colors.card }]}>
                {isYt && ytId ? (
                  // Auto-playing muted inline video. Plays only while this slide
                  // is active; when it ends the carousel advances (onEnded). A
                  // lone video loops. Non-interactive so taps open the full video
                  // and swipes still page the slider.
                  <YouTubeInline
                    videoId={ytId}
                    active={active === index}
                    loop={total <= 1}
                    onEnded={goToNext}
                    style={StyleSheet.absoluteFill}
                  />
                ) : mediaUri ? (
                  <Image
                    source={{ uri: mediaUri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                ) : null}
                <LinearGradient
                  colors={[
                    "rgba(10,12,8,0.10)",
                    "rgba(10,12,8,0.45)",
                    "rgba(10,12,8,0.92)",
                  ]}
                  locations={[0, 0.55, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                {isYt ? (
                  <View style={styles.slideBadge} pointerEvents="none">
                    <Feather
                      name="maximize-2"
                      size={13}
                      color={colors.primaryForeground}
                    />
                  </View>
                ) : null}
                {hasText ? (
                  <View style={styles.slideContent}>
                    {s.title ? (
                      <AppText weight="700" size={24} color="#FFFFFF">
                        {s.title}
                      </AppText>
                    ) : null}
                    {s.subtitle ? (
                      <AppText
                        size={14}
                        color="rgba(255,255,255,0.85)"
                        style={{ marginTop: 4 }}
                      >
                        {s.subtitle}
                      </AppText>
                    ) : null}
                    {s.ctaLabel ? (
                      <View
                        style={[
                          styles.sliderCtaPill,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <AppText
                          weight="700"
                          size={13}
                          color={colors.primaryForeground}
                        >
                          {s.ctaLabel}
                        </AppText>
                        <Feather
                          name="arrow-right"
                          size={14}
                          color={colors.primaryForeground}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Dots */}
      {total > 1 ? (
        <View style={styles.dots}>
          {slides.map((item, i) => (
            <View
              key={item.key}
              style={[
                styles.dot,
                {
                  backgroundColor: i === active ? colors.primary : colors.border,
                  width: i === active ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StorySection() {
  const colors = useColors();
  const [active, setActive] = useState<StoryVideo | null>(null);

  return (
    <>
      <SectionHeader title="Watch our story" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gymRow}
        style={{ marginBottom: 28 }}
      >
        {STORY_VIDEOS.map((s) => (
          <Pressable
            key={s.name}
            onPress={() => setActive(s)}
            style={({ pressed }) => [
              styles.storyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={styles.storyPosterWrap}>
              <Image source={{ uri: s.poster }} style={styles.storyPoster} />
              <LinearGradient
                colors={["transparent", "rgba(10,12,8,0.85)"]}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[styles.storyPlayBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="play" size={24} color={colors.primaryForeground} />
              </View>
            </View>
            <View style={styles.storyBody}>
              <AppText weight="700" size={16}>
                {s.name}
              </AppText>
              <AppText size={12} color={colors.primary} style={{ marginTop: 2 }}>
                {s.role}
              </AppText>
              <AppText muted size={13} style={{ marginTop: 8 }} numberOfLines={3}>
                “{s.quote}”
              </AppText>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {active ? (
        <StoryVideoModal story={active} onClose={() => setActive(null)} />
      ) : null}
    </>
  );
}

function StoryVideoModal({
  story,
  onClose,
}: {
  story: StoryVideo;
  onClose: () => void;
}) {
  const player = useVideoPlayer(story.src, (p) => {
    p.play();
  });

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <View style={styles.storyModalRoot}>
        <VideoView
          player={player}
          style={styles.storyModalVideo}
          contentFit="contain"
          allowsFullscreen
          nativeControls
        />
        <View style={styles.storyModalCaption} pointerEvents="none">
          <AppText weight="700" size={18} color="#FFFFFF">
            {story.name}
          </AppText>
          <AppText size={13} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>
            {story.role}
          </AppText>
        </View>
        <Pressable
          onPress={onClose}
          style={styles.storyModalClose}
          hitSlop={10}
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

function GymCard({
  gym,
  onPress,
  showDistance,
  index = 0,
}: {
  gym: Gym;
  onPress: () => void;
  showDistance?: boolean;
  index?: number;
}) {
  const colors = useColors();
  const img = resolveImageUrl(gym.heroImage);
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(16)}
      style={[CARD_SHADOW, { borderRadius: 26, backgroundColor: colors.card }]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.gymCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <View style={styles.gymImgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.gymImg} resizeMode="cover" />
          ) : (
            <View style={[styles.gymImg, { backgroundColor: colors.elevated }]} />
          )}
          {/* Bottom scrim so the floating badges always read cleanly. */}
          <LinearGradient
            colors={["transparent", "rgba(10,12,8,0.55)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {showDistance ? (
            <View style={[styles.distancePill, { backgroundColor: colors.primary }]}>
              <Feather name="navigation" size={10} color={colors.primaryForeground} />
              <AppText weight="700" size={11} color={colors.primaryForeground}>
                {Number.isFinite(gym.distanceKm) ? gym.distanceKm.toFixed(1) : "–"} km
              </AppText>
            </View>
          ) : gym.isPremium ? (
            <View style={[styles.gymPremium, { backgroundColor: colors.primary }]}>
              <AppText weight="700" size={10} color={colors.primaryForeground}>
                PREMIUM
              </AppText>
            </View>
          ) : null}
          <View style={styles.gymRating}>
            <Feather name="star" size={11} color={colors.primary} />
            <AppText weight="700" size={12} color="#FFFFFF">
              {gym.rating.toFixed(1)}
            </AppText>
          </View>
        </View>
        <View style={styles.gymBody}>
          <AppText weight="700" size={16} numberOfLines={1}>
            {gym.name}
          </AppText>
          <View style={styles.gymMetaRow}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <AppText muted size={12} numberOfLines={1} style={{ flex: 1 }}>
              {gym.area || gym.city}
            </AppText>
          </View>
          <View style={styles.gymFooter}>
            <AppText weight="700" size={15} color={colors.foreground}>
              ₹{gym.priceFrom}
              <AppText muted size={11}>
                {" "}
                /mo
              </AppText>
            </AppText>
            {gym.openNow ? (
              <View style={styles.openBadge}>
                <View style={[styles.openDot, { backgroundColor: colors.success }]} />
                <AppText weight="600" size={11} color={colors.success}>
                  Open now
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Fallback gradient palettes + icons keyed by category slug so a category with
// no product imagery still renders a rich, on-brand tile.
const CATEGORY_META: Record<
  string,
  { icon: keyof typeof Feather.glyphMap; colors: [string, string] }
> = {
  apparel: { icon: "shopping-bag", colors: ["#1E3A2F", "#0A0C08"] },
  equipment: { icon: "activity", colors: ["#2A2352", "#0A0C08"] },
  supplements: { icon: "droplet", colors: ["#123A44", "#0A0C08"] },
  accessories: { icon: "watch", colors: ["#402438", "#0A0C08"] },
  wellness: { icon: "heart", colors: ["#3A2A12", "#0A0C08"] },
};
const CATEGORY_FALLBACK_GRADIENTS: [string, string][] = [
  ["#1E3A2F", "#0A0C08"],
  ["#2A2352", "#0A0C08"],
  ["#123A44", "#0A0C08"],
  ["#402438", "#0A0C08"],
];

function ShopByCategory() {
  const router = useRouter();
  const catsQuery = useListStoreCategories();
  const productsQuery = useListStoreProducts();

  const cats = catsQuery.data ?? [];
  const products = useMemo(
    () => productsQuery.data ?? [],
    [productsQuery.data],
  );

  // First active product image + item count per category slug.
  const byCategory = useMemo(() => {
    const map = new Map<string, { image?: string; count: number }>();
    for (const p of products) {
      const entry = map.get(p.category) ?? { image: undefined, count: 0 };
      entry.count += 1;
      if (!entry.image && p.imageUrl) entry.image = p.imageUrl;
      map.set(p.category, entry);
    }
    return map;
  }, [products]);

  if (catsQuery.isLoading) {
    return (
      <>
        <SectionHeader title="Shop by category" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          style={{ marginBottom: 28 }}
        >
          {[0, 1, 2, 3].map((k) => (
            <CategoryCardSkeleton key={k} />
          ))}
        </ScrollView>
      </>
    );
  }
  if (cats.length === 0) return null;

  return (
    <>
      <SectionHeader
        title="Shop by category"
        action="Shop all"
        onAction={() => router.push("/store")}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        style={{ marginBottom: 28 }}
      >
        {cats.map((c, i) => (
          <CategoryCard
            key={c.slug}
            category={c}
            index={i}
            image={byCategory.get(c.slug)?.image}
            count={byCategory.get(c.slug)?.count ?? 0}
          />
        ))}
      </ScrollView>
    </>
  );
}

function CategoryCard({
  category,
  index,
  image,
  count,
}: {
  category: StoreCategory;
  index: number;
  image?: string;
  count: number;
}) {
  const router = useRouter();
  const colors = useColors();
  const meta = CATEGORY_META[category.slug];
  const gradient =
    meta?.colors ??
    CATEGORY_FALLBACK_GRADIENTS[index % CATEGORY_FALLBACK_GRADIENTS.length];
  const icon = meta?.icon ?? "tag";
  const uri = resolveImageUrl(image);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(16)}
      style={[CARD_SHADOW, { borderRadius: 22, backgroundColor: "#0A0C08" }]}
    >
      <Pressable
        onPress={() =>
          router.push(`/store?category=${encodeURIComponent(category.slug)}`)
        }
        style={({ pressed }) => [
          styles.catCard,
          { transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
      >
        {/* Base gradient — always present (also the fallback when no image). */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.catIconWrap}>
            <Feather name={icon} size={30} color={colors.primary} />
          </View>
        )}
        {/* Bottom scrim so the label always reads. */}
        <LinearGradient
          colors={["transparent", "rgba(10,12,8,0.15)", "rgba(10,12,8,0.92)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Lime arrow badge. */}
        <View style={[styles.catArrow, { backgroundColor: colors.primary }]}>
          <Feather name="arrow-up-right" size={16} color={colors.primaryForeground} />
        </View>
        <View style={styles.catLabel}>
          <AppText weight="700" size={16} color="#FFFFFF">
            {category.name}
          </AppText>
          {count > 0 ? (
            <AppText size={12} color="#FFFFFF" style={{ opacity: 0.8, marginTop: 2 }}>
              {count} {count === 1 ? "item" : "items"}
            </AppText>
          ) : (
            <AppText size={12} color="#FFFFFF" style={{ opacity: 0.8, marginTop: 2 }}>
              Shop now
            </AppText>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * "Gyms near me" as a carousel slide. Before location is granted it's a
 * gradient call-to-action (tap → request permission); once granted it shows
 * the closest branch with its photo and distance (tap → explore gyms).
 */
function NearbyGymsSlide({ onOpenGym }: { onOpenGym: () => void }) {
  const colors = useColors();
  const { coords, status, request } = useUserLocation();

  const nearbyQuery = useListGyms(
    { lat: coords?.lat, lng: coords?.lng, sort: "distance" },
    {
      query: {
        enabled: !!coords,
        queryKey: getListGymsQueryKey({
          lat: coords?.lat,
          lng: coords?.lng,
          sort: "distance",
        }),
      },
    },
  );
  const nearby = nearbyQuery.data ?? [];
  const nearest = nearby[0];
  const moreCount = Math.max(0, nearby.length - 1);

  const needsLocation =
    status === "idle" || status === "denied" || status === "error";
  const denied = status === "denied" || status === "error";
  const loading =
    !needsLocation && (status === "loading" || nearbyQuery.isLoading);
  const img = nearest ? resolveImageUrl(nearest.heroImage) : undefined;

  const title = needsLocation
    ? denied
      ? "Turn on location"
      : "Find gyms near you"
    : loading
      ? "Finding gyms near you…"
      : nearbyQuery.isError
        ? "Couldn’t load nearby gyms"
        : nearest
          ? nearest.name
          : "No branches nearby yet";
  const subtitle = needsLocation
    ? denied
      ? "Allow location access to see the closest branches."
      : "See the closest Iconic branches around you."
    : loading
      ? "Hang tight — locating the closest branches."
      : nearbyQuery.isError
        ? "Something went wrong — explore all gyms instead."
        : nearest
          ? [
            Number.isFinite(nearest.distanceKm)
              ? `${nearest.distanceKm.toFixed(1)} km away`
              : null,
            moreCount > 0 ? `+${moreCount} more nearby` : null,
          ]
            .filter(Boolean)
            .join(" · ") ||
          nearest.area ||
          nearest.city
        : "Explore all gyms instead.";
  const pill = needsLocation
    ? denied
      ? "Retry"
      : "Enable location"
    : "Explore gyms";

  return (
    <Pressable onPress={needsLocation ? request : onOpenGym}>
      <View style={[styles.slide, { backgroundColor: colors.card }]}>
        {img ? (
          <>
            <Image source={{ uri: img }} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={["transparent", "rgba(10,12,8,0.92)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <LinearGradient
            colors={colors.primaryGradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.slideContent}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather
              name="navigation"
              size={12}
              color={colors.primaryForeground}
            />
            <AppText weight="700" size={12} color={colors.primaryForeground}>
              GYMS NEAR ME
            </AppText>
          </View>
          <AppText
            weight="700"
            size={24}
            color={colors.primaryForeground}
            style={{ marginTop: 6 }}
            numberOfLines={1}
          >
            {title}
          </AppText>
          <AppText
            size={13}
            color={colors.primaryForeground}
            style={{ marginTop: 4, opacity: 0.9 }}
            numberOfLines={2}
          >
            {subtitle}
          </AppText>
          {!loading ? (
            <View style={styles.sliderCtaPill}>
              <AppText weight="700" size={13} color={colors.primary}>
                {pill}
              </AppText>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function ClassCard({
  session,
  booked,
  loading,
  onBook,
  onOpen,
}: {
  session: ClassSession;
  booked: boolean;
  loading: boolean;
  onBook: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  const full = session.booked >= session.capacity;
  const tint = intensityColor(session.intensity, colors);

  return (
    <View
      style={[
        styles.classCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      {/* Tapping the card body opens the full Classes screen. The Book button
          below is a sibling (not nested) so its press can't double-fire. */}
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <LinearGradient
          colors={[tint + "33", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.classBanner}
        >
          <View style={[styles.intensity, { backgroundColor: tint + "33" }]}>
            <AppText weight="700" size={10} color={tint}>
              {session.intensity.toUpperCase()}
            </AppText>
          </View>
          <Feather name="activity" size={20} color={tint} />
        </LinearGradient>

        <View style={styles.classBody}>
          <AppText weight="700" size={16} numberOfLines={1}>
            {session.title}
          </AppText>
          <AppText muted size={12} numberOfLines={1} style={{ marginTop: 2 }}>
            {session.gymName}
          </AppText>

          <View style={styles.classMetaRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <AppText muted size={12}>
              {formatClock(session.startsAt)}
            </AppText>
            <AppText muted size={12}>
              ·
            </AppText>
            <AppText muted size={12}>
              {formatDateLabel(session.startsAt)}
            </AppText>
          </View>
        </View>
      </Pressable>

      <View style={styles.bookWrap}>
        <Pressable
          onPress={onBook}
          disabled={booked || full || loading}
          style={({ pressed }) => [
            styles.bookBtn,
            {
              backgroundColor: booked || full ? colors.elevated : "transparent",
              borderRadius: colors.radius - 6,
              opacity: pressed ? 0.85 : 1,
              overflow: "hidden",
            },
          ]}
        >
          {!booked && !full ? (
            <LinearGradient
              colors={colors.primaryGradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <AppText
            weight="700"
            size={13}
            color={booked || full ? colors.mutedForeground : "#FFFFFF"}
          >
            {loading ? "Booking…" : booked ? "Booked ✓" : full ? "Full" : "Book now"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function intensityColor(
  intensity: string,
  colors: ReturnType<typeof useColors>,
): string {
  if (intensity === "high") return colors.destructive;
  if (intensity === "medium") return colors.calorie;
  return colors.success;
}

function LegendRow({
  color,
  label,
  value,
  goal,
}: {
  color: string;
  label: string;
  value: string;
  goal: string;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText size={13} muted style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText weight="700" size={14}>
        {value}
      </AppText>
      <AppText size={12} muted>
        {" "}
        / {goal}
      </AppText>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  sub,
  color,
  onPress,
  loading,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.quickTile,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed || loading ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <AppText weight="700" size={14}>
        {label}
      </AppText>
      <AppText muted size={11}>
        {sub}
      </AppText>
    </Pressable>
  );
}

function StatCard({
  icon,
  tint,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  value: string;
  label: string;
}) {
  const colors = useColors();
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint + "22" }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <AppText weight="700" size={22}>
        {value}
      </AppText>
      <AppText muted size={12}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Slider — rounded card matching the AI Coach card's footprint (inset
  // within the Screen's horizontal padding, ~226 tall, 30px corners).
  // Shadow lives on the wrapper, clipping on the inner slide (iOS clips a
  // view's own shadow when it also has overflow:hidden).
  sliderWrap: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 30,
    ...SOFT_SHADOW,
  },
  slide: {
    height: 226,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderRadius: 30,
  },
  slideBadge: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,12,8,0.55)",
  },
  slideTopRow: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slideContent: { padding: 18 },
  slideMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  sliderCtaPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A0C08",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 16,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,12,8,0.7)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: { height: 7, borderRadius: 4 },

  // Shop by category
  catRow: { gap: 14, paddingRight: 8, paddingVertical: 2 },
  catCard: {
    width: 150,
    height: 190,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  catIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  catArrow: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: { padding: 14 },

  // Gym cards
  gymRow: { gap: 14, paddingRight: 8, paddingVertical: 2 },
  gymCard: {
    width: 250,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  gymImgWrap: { height: 172 },
  gymImg: { width: "100%", height: "100%" },
  gymRating: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,12,8,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  gymBody: { padding: 16 },
  gymMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  gymPremium: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gymFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  openBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  distancePill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  openDot: { width: 8, height: 8, borderRadius: 4 },

  // Near-me CTA
  nearCta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 22,
    borderRadius: 26,
    overflow: "hidden",
  },
  nearGlow: {
    position: "absolute",
    top: -46,
    right: -34,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  nearCtaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  nearCtaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    marginTop: 16,
  },

  // Story testimonial cards
  storyCard: {
    width: 230,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  storyPosterWrap: { height: 300, width: "100%" },
  storyPoster: { width: "100%", height: "100%" },
  storyPlayBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -27,
    marginLeft: -27,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  storyBody: { padding: 14 },
  // Story video player modal
  storyModalRoot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  storyModalVideo: { width: "100%", height: "78%" },
  storyModalClose: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  storyModalCaption: { position: "absolute", bottom: 64, left: 24, right: 24 },

  // Join CTA (guests)
  joinCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  joinIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  // Personal tracking
  heroWrap: { marginBottom: 28 },
  heroGlow: {
    position: "absolute",
    top: -10,
    left: 20,
    right: 20,
    height: 120,
    borderRadius: 80,
  },
  hero: { alignItems: "center", gap: 22, paddingVertical: 24 },
  ringWrap: { alignItems: "center", justifyContent: "center" },
  legend: { alignSelf: "stretch", gap: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },

  classRow: { gap: 14, paddingRight: 8, paddingVertical: 2 },
  classCard: {
    width: 200,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  classBanner: {
    height: 70,
    paddingHorizontal: 14,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  intensity: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classBody: { paddingHorizontal: 14, paddingTop: 12 },
  classMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  bookWrap: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 },
  bookBtn: {
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  quickTile: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: { width: "47.5%", gap: 8 },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  waterCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
