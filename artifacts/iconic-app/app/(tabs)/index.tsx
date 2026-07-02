import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  getGetTrackingSummaryQueryKey,
  getListGymsQueryKey,
  getListMyBookingsQueryKey,
  useAddWater,
  useCreateBooking,
  useGetMe,
  useGetTrackingSummary,
  useListClasses,
  useListGyms,
  useListMyBookings,
  type ClassSession,
  type Gym,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { LoadingView, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useUserLocation } from "@/hooks/useUserLocation";
import { istToday, formatClock, formatDateLabel } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";
import { exploreUrl, openExternal, storeUrl, websiteUrl } from "@/lib/links";

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

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  // Public, no-auth content — works for guests and members alike.
  const gymsQuery = useListGyms({ sort: "rating" });
  const classesQuery = useListClasses({});

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

  const refetchAll = useCallback(() => {
    void gymsQuery.refetch();
    void classesQuery.refetch();
    if (isSignedIn) {
      void summaryQuery.refetch();
      void meQuery.refetch();
      void bookingsQuery.refetch();
    }
  }, [gymsQuery, classesQuery, isSignedIn, summaryQuery, meQuery, bookingsQuery]);

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
  const firstName = user?.firstName ?? meQuery.data?.name?.split(" ")[0] ?? "";

  const calRatio = summary ? summary.caloriesIn / (summary.calorieGoal || 1) : 0;
  const waterRatio = summary ? summary.waterMl / (summary.waterGoalMl || 1) : 0;
  const stepRatio = summary ? summary.steps / (summary.stepGoal || 1) : 0;

  return (
    <Screen
      refreshing={summaryQuery.isRefetching || gymsQuery.isRefetching}
      onRefresh={refetchAll}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/images/auth-logo-mark.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <AppText muted size={13}>
              {greeting()}
            </AppText>
            <AppText weight="700" size={22}>
              {firstName ? firstName : "Welcome to Iconic"}
            </AppText>
          </View>
        </View>
        {isSignedIn ? (
          <View
            style={[
              styles.streakPill,
              { backgroundColor: colors.accent, borderColor: colors.border },
            ]}
          >
            <Feather name="zap" size={15} color={colors.primary} />
            <AppText weight="700" size={14} color={colors.primary}>
              {summary?.streakDays ?? 0}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* AI Coach — members only */}
      {isSignedIn ? (
        <Pressable onPress={() => router.push("/coach")} style={{ marginTop: 20 }}>
          <Card
            tone="elevated"
            style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Feather
                name="message-circle"
                size={22}
                color={colors.primaryForeground}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700" size={16}>
                {meQuery.data && !meQuery.data.assessmentComplete
                  ? "Start your fitness assessment"
                  : "Ask your AI coach"}
              </AppText>
              <AppText muted size={13} style={{ marginTop: 2 }}>
                {meQuery.data && !meQuery.data.assessmentComplete
                  ? "Answer a few questions and I'll build your plan."
                  : "Personalized tips from your workouts, meals & goals."}
              </AppText>
            </View>
            <Feather
              name="chevron-right"
              size={22}
              color={colors.mutedForeground}
            />
          </Card>
        </Pressable>
      ) : null}

      {/* Gyms near me (location-aware) */}
      <NearbyGyms onOpenGym={() => openExternal(exploreUrl)} />

      {/* Top rated gyms */}
      <SectionHeader
        title="Top rated gyms"
        action="View all"
        onAction={() => openExternal(exploreUrl)}
      />
      {gymsQuery.isLoading ? (
        <View style={{ height: 200, justifyContent: "center", marginBottom: 28 }}>
          <LoadingView />
        </View>
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
          {gyms.slice(0, 8).map((g) => (
            <GymCard
              key={g.id}
              gym={g}
              onPress={() => openExternal(exploreUrl)}
            />
          ))}
        </ScrollView>
      )}

      {/* Watch our story (member testimonials) */}
      <StorySection />

      {/* Shop + Website */}
      <View style={styles.linkRow}>
        <LinkTile
          icon="shopping-bag"
          title="Shop gear"
          sub="Apparel & more"
          onPress={() => openExternal(storeUrl)}
        />
        <LinkTile
          icon="globe"
          title="Our website"
          sub="Explore everything"
          onPress={() => openExternal(exploreUrl)}
        />
      </View>

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
          <Card style={styles.joinCta} tone="elevated">
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

      {/* Hero slider */}
      <HeroSlider gyms={heroGyms} onExplore={() => openExternal(exploreUrl)} />
    </Screen>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function HeroSlider({
  gyms,
  onExplore,
}: {
  gyms: Gym[];
  onExplore: () => void;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const SLIDE_W = width - 40;
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  // The first slide is an always-present brand intro; gyms follow.
  const total = gyms.length + 1;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => {
      const next = (activeRef.current + 1) % total;
      scrollRef.current?.scrollTo({ x: next * SLIDE_W, animated: true });
      setActive(next);
    }, 4000);
    return () => clearInterval(t);
  }, [total, SLIDE_W]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
    setActive(idx);
  };

  return (
    <View style={styles.sliderWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {/* Brand intro slide */}
        <Pressable onPress={onExplore} style={{ width: SLIDE_W }}>
          <View style={[styles.slide, { backgroundColor: colors.card }]}>
            <LinearGradient
              colors={colors.primaryGradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.slideContent}>
              <AppText weight="700" size={12} color={colors.primaryForeground}>
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
                <Feather name="arrow-right" size={14} color={colors.primary} />
              </View>
            </View>
          </View>
        </Pressable>

        {/* Gym slides */}
        {gyms.map((g) => {
          const img = resolveImageUrl(g.heroImage);
          return (
            <Pressable key={g.id} onPress={onExplore} style={{ width: SLIDE_W }}>
              <View style={[styles.slide, { backgroundColor: colors.card }]}>
                {img ? (
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFill} />
                ) : null}
                <LinearGradient
                  colors={["transparent", "rgba(10,12,8,0.92)"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.slideTopRow}>
                  {g.isPremium ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <AppText weight="700" size={10} color={colors.primaryForeground}>
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
                    <Feather name="map-pin" size={13} color={colors.mutedForeground} />
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
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
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
}: {
  gym: Gym;
  onPress: () => void;
  showDistance?: boolean;
}) {
  const colors = useColors();
  const img = resolveImageUrl(gym.heroImage);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gymCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.gymImgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.gymImg} />
        ) : (
          <View style={[styles.gymImg, { backgroundColor: colors.elevated }]} />
        )}
        {showDistance ? (
          <View style={[styles.distancePill, { backgroundColor: colors.primary }]}>
            <Feather name="navigation" size={10} color={colors.primaryForeground} />
            <AppText weight="700" size={11} color={colors.primaryForeground}>
              {Number.isFinite(gym.distanceKm) ? gym.distanceKm.toFixed(1) : "–"} km
            </AppText>
          </View>
        ) : null}
        <View style={styles.gymRating}>
          <Feather name="star" size={10} color={colors.primary} />
          <AppText weight="700" size={11} color={colors.foreground}>
            {gym.rating.toFixed(1)}
          </AppText>
        </View>
      </View>
      <View style={styles.gymBody}>
        <AppText weight="700" size={15} numberOfLines={1}>
          {gym.name}
        </AppText>
        <View style={styles.gymMetaRow}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <AppText muted size={12} numberOfLines={1} style={{ flex: 1 }}>
            {gym.area || gym.city}
          </AppText>
          {gym.openNow ? (
            <View style={[styles.openDot, { backgroundColor: colors.success }]} />
          ) : null}
        </View>
        <AppText weight="700" size={13} color={colors.primary} style={{ marginTop: 6 }}>
          ₹{gym.priceFrom}
          <AppText muted size={11}>
            {" "}
            /mo
          </AppText>
        </AppText>
      </View>
    </Pressable>
  );
}

function NearbyGyms({ onOpenGym }: { onOpenGym: () => void }) {
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
  const nearby = useMemo(
    () => (nearbyQuery.data ?? []).slice(0, 8),
    [nearbyQuery.data],
  );

  // Before the user shares location: a premium call-to-action card.
  if (status === "idle" || status === "denied" || status === "error") {
    const denied = status === "denied" || status === "error";
    return (
      <Pressable onPress={request} style={{ marginBottom: 28 }}>
        <View style={styles.nearCta}>
          <LinearGradient
            colors={colors.primaryGradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.nearCtaIcon}>
            <Feather name="navigation" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={18} color={colors.primaryForeground}>
              {denied ? "Turn on location" : "Gyms near me"}
            </AppText>
            <AppText
              size={13}
              color={colors.primaryForeground}
              style={{ marginTop: 3, opacity: 0.85 }}
            >
              {denied
                ? "Allow location access to see the closest branches."
                : "Find the closest Iconic branches around you."}
            </AppText>
          </View>
          <View style={styles.nearCtaPill}>
            <AppText weight="700" size={13} color={colors.primary}>
              {denied ? "Retry" : "Find"}
            </AppText>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <SectionHeader title="Gyms near me" />
      {status === "loading" || nearbyQuery.isLoading ? (
        <View style={{ height: 200, justifyContent: "center", marginBottom: 28 }}>
          <LoadingView />
        </View>
      ) : nearbyQuery.isError ? (
        <Card style={{ marginBottom: 28 }}>
          <AppText weight="700" size={15}>
            Couldn’t load nearby gyms
          </AppText>
          <AppText muted size={13} style={{ marginTop: 4 }}>
            Something went wrong fetching branches near you. Pull to refresh and try again.
          </AppText>
        </Card>
      ) : nearby.length === 0 ? (
        <Card style={{ marginBottom: 28 }}>
          <AppText weight="700" size={15}>
            No gyms found nearby
          </AppText>
          <AppText muted size={13} style={{ marginTop: 4 }}>
            We couldn’t find branches close to you yet — explore all gyms instead.
          </AppText>
        </Card>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gymRow}
          style={{ marginBottom: 28 }}
        >
          {nearby.map((g) => (
            <GymCard key={g.id} gym={g} showDistance onPress={onOpenGym} />
          ))}
        </ScrollView>
      )}
    </>
  );
}

function LinkTile({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkTile,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.linkIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <AppText weight="700" size={15} style={{ marginTop: 10 }}>
        {title}
      </AppText>
      <AppText muted size={12}>
        {sub}
      </AppText>
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

  // Slider
  sliderWrap: { marginBottom: 28 },
  slide: {
    height: 210,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "flex-end",
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

  // Gym cards
  gymRow: { gap: 14, paddingRight: 8, paddingVertical: 2 },
  gymCard: {
    width: 230,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  gymImgWrap: { height: 130 },
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
  gymBody: { padding: 14 },
  gymMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
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
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 22,
    overflow: "hidden",
  },
  nearCtaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,12,8,0.9)",
  },
  nearCtaPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#0A0C08",
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

  // Link tiles
  linkRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  linkTile: {
    flex: 1,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

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
