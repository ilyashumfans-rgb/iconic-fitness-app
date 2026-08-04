import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  useGetGym,
  getGetGymQueryKey,
  useGetMyMembership,
  getGetMyMembershipQueryKey,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen, WEB_NOTCH_TOP } from "@/components/Screen";
import { ErrorView, LoadingView } from "@/components/ui-bits";
import { YouTubeInline } from "@/components/YouTubeInline";
import { openExternal } from "@/lib/links";

/** Extract a YouTube video id from a watch/share/embed/shorts URL. */
function youtubeId(url: string): string | undefined {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/,
  );
  const id = m ? m[1] : /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
  return id ?? undefined;
}
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { resolveImageUrl } from "@/lib/images";

function openDirections(name: string, address: string, city: string) {
  const query = encodeURIComponent(
    [name, address, city].filter(Boolean).join(", "),
  );
  const url =
    Platform.OS === "ios"
      ? `maps:0,0?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
  Linking.openURL(url).catch(() => {
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
    );
  });
}

export default function GymDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gymId = Number(id);

  const query = useGetGym(gymId, {
    query: { queryKey: getGetGymQueryKey(gymId), enabled: Number.isFinite(gymId) },
  });
  const gym = query.data;

  // "Book with this branch" is only for people NOT already enrolled with a
  // gym. Guests are never enrolled; signed-in members are checked against
  // their membership. Gate on the settled query (not just missing data) so
  // enrolled members never see the CTA flash while loading.
  const { isGuest } = useGuest();
  const { isLoaded, isSignedIn } = useAuth();
  const membershipQuery = useGetMyMembership({
    query: {
      queryKey: getGetMyMembershipQueryKey(),
      enabled: !isGuest && isLoaded && !!isSignedIn,
    },
  });
  const notEnrolled =
    isGuest ||
    (isLoaded && !isSignedIn) ||
    (membershipQuery.isSuccess && !membershipQuery.data);

  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = useMemo(() => {
    if (!gym) return [] as string[];
    const all = [gym.heroImage, ...(gym.gallery ?? [])]
      .map((u) => resolveImageUrl(u))
      .filter((u): u is string => !!u);
    return Array.from(new Set(all));
  }, [gym]);

  const topPad =
    insets.top > 0 ? insets.top : Platform.OS === "web" ? WEB_NOTCH_TOP : 12;

  const gymVideoId = gym?.videoUrl ? youtubeId(gym.videoUrl) : undefined;

  if (query.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Branch" }} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <LoadingView />
        </View>
      </Screen>
    );
  }

  if (!gym) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Branch" }} />
        <ErrorView onRetry={query.refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: gym.name }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo tour */}
        <View style={styles.heroWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPhotoIndex(
                Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1)),
              )
            }
          >
            {(photos.length > 0 ? photos : [null]).map((uri, i) => (
              <View key={i} style={{ width, height: 300 }}>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.primary + "33", colors.card]}
                    style={StyleSheet.absoluteFill}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          <LinearGradient
            colors={["rgba(10,12,8,0.55)", "transparent", "rgba(10,12,8,0.85)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: topPad }]}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </Pressable>
          {photos.length > 1 ? (
            <View style={styles.dotsRow} pointerEvents="none">
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === photoIndex ? colors.primary : "#FFFFFF66",
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.heroFoot} pointerEvents="none">
            {gym.isPremium ? (
              <View style={[styles.pill, { backgroundColor: colors.primary }]}>
                <AppText weight="700" size={10} color={colors.primaryForeground}>
                  PREMIUM
                </AppText>
              </View>
            ) : null}
            <AppText weight="700" size={24} color="#FFFFFF">
              {gym.name}
            </AppText>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color="#FFFFFFCC" />
              <AppText size={13} color="#FFFFFFCC" numberOfLines={1} style={{ flex: 1 }}>
                {[gym.area, gym.city].filter(Boolean).join(", ")}
              </AppText>
            </View>
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {/* Quick stats */}
          <Card>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <View style={styles.metaRow}>
                  <Feather name="star" size={14} color={colors.primary} />
                  <AppText weight="700" size={16}>
                    {gym.rating.toFixed(1)}
                  </AppText>
                </View>
                <AppText muted size={11}>
                  {gym.reviewsCount} reviews
                </AppText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <AppText
                  weight="700"
                  size={14}
                  color={gym.openNow ? colors.success : colors.mutedForeground}
                >
                  {gym.openNow ? "Open now" : "Closed"}
                </AppText>
                {gym.hours ? (
                  <AppText muted size={11} numberOfLines={1}>
                    {gym.hours}
                  </AppText>
                ) : null}
              </View>
              {Number.isFinite(gym.distanceKm) && gym.distanceKm > 0 ? (
                <>
                  <View
                    style={[styles.statDivider, { backgroundColor: colors.border }]}
                  />
                  <View style={styles.stat}>
                    <AppText weight="700" size={14}>
                      {gym.distanceKm.toFixed(1)} km
                    </AppText>
                    <AppText muted size={11}>
                      from you
                    </AppText>
                  </View>
                </>
              ) : null}
            </View>
          </Card>

          {/* About */}
          {gym.about ? (
            <Card>
              <AppText weight="700" size={16} style={{ marginBottom: 6 }}>
                About this branch
              </AppText>
              <AppText muted size={13} style={{ lineHeight: 20 }}>
                {gym.about}
              </AppText>
            </Card>
          ) : null}

          {/* Branch video (admin-managed YouTube link) */}
          {gymVideoId ? (
            <Card>
              <AppText weight="700" size={16} style={{ marginBottom: 10 }}>
                Branch tour
              </AppText>
              <Pressable
                onPress={() => gym.videoUrl && openExternal(gym.videoUrl)}
                style={{
                  height: 200,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: "#000",
                }}
              >
                <YouTubeInline
                  videoId={gymVideoId}
                  active
                  loop
                  style={StyleSheet.absoluteFill}
                />
              </Pressable>
            </Card>
          ) : null}

          {/* Amenities */}
          {gym.amenities.length > 0 ? (
            <Card>
              <AppText weight="700" size={16} style={{ marginBottom: 10 }}>
                Facilities
              </AppText>
              <View style={styles.chipsWrap}>
                {gym.amenities.map((a) => (
                  <View
                    key={a}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                  >
                    <Feather name="check" size={12} color={colors.primary} />
                    <AppText size={12}>{a}</AppText>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Address + directions */}
          <Card>
            <AppText weight="700" size={16} style={{ marginBottom: 6 }}>
              Location
            </AppText>
            <AppText muted size={13} style={{ lineHeight: 20 }}>
              {[gym.address, gym.area, gym.city].filter(Boolean).join(", ")}
            </AppText>
            <Pressable
              onPress={() => openDirections(gym.name, gym.address, gym.city)}
              style={({ pressed }) => [
                styles.directionsBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="corner-up-right" size={16} color={colors.primaryForeground} />
              <AppText weight="700" size={14} color={colors.primaryForeground}>
                Get directions
              </AppText>
            </Pressable>
          </Card>

          {/* Not enrolled anywhere yet? Jump straight to this branch's
              price list with the branch preselected. */}
          {notEnrolled ? (
            <Card>
              <AppText weight="700" size={16} style={{ marginBottom: 4 }}>
                New to Iconic Fitness?
              </AppText>
              <AppText muted size={13} style={{ lineHeight: 20 }}>
                See this branch's membership prices and join in a couple of
                taps.
              </AppText>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/book-package",
                    params: { gymId: String(gym.id) },
                  })
                }
                style={({ pressed }) => [
                  styles.directionsBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather
                  name="arrow-right-circle"
                  size={16}
                  color={colors.primaryForeground}
                />
                <AppText weight="700" size={14} color={colors.primaryForeground}>
                  Book with this branch
                </AppText>
              </Pressable>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    height: 300,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10,12,8,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroFoot: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    gap: 4,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginHorizontal: 8,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
});
