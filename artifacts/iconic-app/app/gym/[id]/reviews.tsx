import { Feather } from "@expo/vector-icons";
import { getGetGymQueryKey, useGetGym } from "@workspace/api-client-react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { BranchReviews } from "@/components/BranchReviews";
import { Screen } from "@/components/Screen";
import { ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

export default function BranchReviewsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gymId = Number(id);
  const gymQuery = useGetGym(gymId, {
    query: {
      queryKey: getGetGymQueryKey(gymId),
      enabled: Number.isFinite(gymId),
    },
  });
  const gym = gymQuery.data;

  if (gymQuery.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Branch reviews" }} />
        <View style={styles.center}>
          <LoadingView />
        </View>
      </Screen>
    );
  }

  if (!gym) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Branch reviews" }} />
        <ErrorView onRetry={gymQuery.refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `${gym.name} reviews` }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to branch"
            onPress={() => router.canGoBack() ? router.back() : router.replace("/gyms")}
            style={[
              styles.backButton,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.title}>
            <AppText weight="700" size={21}>Branch reviews</AppText>
            <AppText muted size={14}>{gym.name}</AppText>
          </View>
        </View>
        <BranchReviews gymId={gym.id} fullList />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    gap: 2,
  },
});