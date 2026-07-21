import { Feather } from "@expo/vector-icons";
import {
  getListGymsQueryKey,
  useListGyms,
  type Gym,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useUserLocation } from "@/hooks/useUserLocation";
import { resolveImageUrl } from "@/lib/images";

function openDirections(gym: Gym) {
  const query = encodeURIComponent(
    [gym.name, gym.address || gym.area, gym.city].filter(Boolean).join(", "),
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

function BranchCard({ gym, index, near }: { gym: Gym; index: number; near: boolean }) {
  const colors = useColors();
  const img = resolveImageUrl(gym.heroImage);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 60)
        .springify()
        .damping(16)}
    >
      <Pressable
        onPress={() => openDirections(gym)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={styles.media}>
          {img ? (
            <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.primary + "33", colors.card]}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={["transparent", "rgba(10,12,8,0.75)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {near && Number.isFinite(gym.distanceKm) ? (
            <View style={[styles.pill, { backgroundColor: colors.primary }]}>
              <Feather name="navigation" size={11} color={colors.primaryForeground} />
              <AppText weight="700" size={11} color={colors.primaryForeground}>
                {gym.distanceKm.toFixed(1)} km
              </AppText>
            </View>
          ) : gym.isPremium ? (
            <View style={[styles.pill, { backgroundColor: colors.primary }]}>
              <AppText weight="700" size={10} color={colors.primaryForeground}>
                PREMIUM
              </AppText>
            </View>
          ) : null}
          <View style={styles.mediaFoot}>
            <AppText weight="700" size={18} color="#FFFFFF" numberOfLines={1}>
              {gym.name}
            </AppText>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={12} color="#FFFFFFCC" />
              <AppText size={12} color="#FFFFFFCC" numberOfLines={1} style={{ flex: 1 }}>
                {[gym.area, gym.city].filter(Boolean).join(", ")}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Feather name="star" size={13} color={colors.primary} />
            <AppText weight="700" size={13}>
              {gym.rating.toFixed(1)}
            </AppText>
            {gym.openNow ? (
              <>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <AppText weight="600" size={12} color={colors.success}>
                  Open now
                </AppText>
              </>
            ) : null}
            <View style={{ flex: 1 }} />
            <View style={[styles.directions, { borderColor: colors.primary + "66" }]}>
              <Feather name="corner-up-right" size={13} color={colors.primary} />
              <AppText weight="700" size={12} color={colors.primary}>
                Directions
              </AppText>
            </View>
          </View>
          {gym.address ? (
            <AppText muted size={12} numberOfLines={2} style={{ marginTop: 6 }}>
              {gym.address}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function BranchesContent({ showBack = true }: { showBack?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const { coords, status, request } = useUserLocation();
  const [search, setSearch] = useState("");

  // Ask for location right away so the list can sort by distance.
  useEffect(() => {
    if (status === "idle") void request();
  }, [status, request]);

  const near = !!coords;
  const params = near
    ? ({ lat: coords.lat, lng: coords.lng, sort: "distance" } as const)
    : ({ sort: "rating" } as const);
  const gymsQuery = useListGyms(params, {
    query: { queryKey: getListGymsQueryKey(params) },
  });

  const gyms = useMemo(() => {
    const all = gymsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((g) =>
      [g.name, g.area, g.city, g.address].join(" ").toLowerCase().includes(q),
    );
  }, [gymsQuery.data, search]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { borderColor: colors.border, marginRight: 12 },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={22}>
            Our branches
          </AppText>
          <AppText muted size={13}>
            {near
              ? "Sorted by distance from you"
              : "All Iconic Fitness branches"}
          </AppText>
        </View>
      </View>

          <View
            style={[
              styles.search,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or area"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>

          {!near && (status === "denied" || status === "error") ? (
            <Pressable onPress={request}>
              <Card style={{ marginBottom: 16 }}>
                <View style={styles.metaRow}>
                  <Feather name="navigation" size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <AppText weight="700" size={14}>
                      Find gyms near you
                    </AppText>
                    <AppText muted size={12}>
                      Allow location to sort branches by distance. Tap to retry.
                    </AppText>
                  </View>
                </View>
              </Card>
            </Pressable>
          ) : null}

          {gymsQuery.isLoading ? (
            <View style={{ height: 200, justifyContent: "center" }}>
              <LoadingView />
            </View>
          ) : gyms.length === 0 ? (
            <Card>
              <AppText weight="700" size={15}>
                No branches found
              </AppText>
              <AppText muted size={13} style={{ marginTop: 4 }}>
                Try a different search.
              </AppText>
            </Card>
          ) : (
            gyms.map((g, i) => (
              <BranchCard key={g.id} gym={g} index={i} near={near} />
            ))
          )}
    </ScrollView>
  );
}

export default function BranchesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Our branches" }} />
      <Screen>
        <BranchesContent />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 16,
  },
  media: {
    height: 170,
    justifyContent: "flex-end",
  },
  mediaFoot: {
    padding: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  pill: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  body: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  directions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
