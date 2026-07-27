import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMyEngagementQueryKey,
  useGetMyEngagement,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";

export function EngagementPlanCard() {
  const colors = useColors();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  const query = useGetMyEngagement({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyEngagementQueryKey(),
    },
  });

  if (!query.isSuccess && !query.isError) {
    return null;
  }

  const engagement = query.data;
  if (!engagement || !engagement.active) {
    return null;
  }

  const progress = Math.min(
    100,
    Math.round((engagement.dayNumber / engagement.totalDays) * 100)
  );

  const getBadgeColor = (band?: string) => {
    switch (band) {
      case "green":
        return "#22C55E";
      case "yellow":
        return "#F5C842";
      case "red":
        return "#EF4444";
      default:
        return colors.border;
    }
  };

  return (
    <Pressable
      onPress={() => router.push("/engagement-plan")}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.container]}
    >
      <Card>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText weight="700" size={16}>
              45-day plan
            </AppText>
            <AppText size={13} color={colors.mutedForeground} style={{ marginTop: 2 }}>
              Day {engagement.dayNumber} of {engagement.totalDays}
            </AppText>
          </View>

          {engagement.scoreBand && (
            <View
              style={[
                styles.badge,
                { backgroundColor: getBadgeColor(engagement.scoreBand) + "22" },
              ]}
            >
              <AppText
                size={12}
                weight="700"
                style={{ color: getBadgeColor(engagement.scoreBand) }}
              >
                Score {engagement.score}
              </AppText>
            </View>
          )}

          <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
        </View>
        <View
          style={[
            styles.track,
            { backgroundColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: `${progress}%`,
                backgroundColor: "#C7F000",
              },
            ]}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  track: {
    height: 6,
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
