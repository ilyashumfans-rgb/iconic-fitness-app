import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { getListReviewsQueryKey, useListReviews } from "@workspace/api-client-react";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";

export function ReviewSection() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const reviewsQuery = useListReviews({
    query: {
      queryKey: getListReviewsQueryKey(),
      enabled: focused,
      staleTime: 30_000,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  });

  useFocusEffect(useCallback(() => {
    // Invalidate before enabling, so even a quick return removes unpublished
    // or deleted records. No polling or background-tab refreshes.
    void queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
    setFocused(true);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
      }
    });
    return () => {
      setFocused(false);
      subscription.remove();
    };
  }, [queryClient]));

  const reviews = (reviewsQuery.data?.reviews ?? [])
    .filter((review) => review.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const visibleReviews = expanded ? reviews : reviews.slice(0, 3);

  return (
    <View style={styles.section}>
      <SectionHeader title="Member reviews" />
      {reviews.some((review) => review.isSample) ? (
        <AppText muted size={13} style={styles.note}>
          Illustrative sample feedback, not verified customer reviews.
        </AppText>
      ) : null}
      {reviewsQuery.isError ? (
        <Card>
          <AppText weight="600" accessibilityRole="alert">
            Unable to load reviews.
          </AppText>
          <AppText muted size={13} style={styles.detail}>
            Please check your connection and try again.
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading reviews"
            disabled={!focused || reviewsQuery.isFetching}
            onPress={() => void reviewsQuery.refetch()}
            style={styles.action}
          >
            <AppText weight="600">{reviewsQuery.isFetching ? "Retrying…" : "Retry"}</AppText>
          </Pressable>
        </Card>
      ) : reviewsQuery.isPending ? (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <AppText muted size={14}>Loading reviews…</AppText>
        </View>
      ) : reviews.length === 0 ? (
        <Card>
          <AppText weight="600">No published reviews yet</AppText>
          <AppText muted size={13} style={styles.detail}>
            Check back soon or pull to refresh.
          </AppText>
        </Card>
      ) : (
        <View style={styles.cards}>
          {visibleReviews.map((review) => (
            <Card key={review.id}>
              {review.isSample ? (
                <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                  <AppText size={11} weight="700" color={colors.secondaryForeground}>
                    SAMPLE REVIEW
                  </AppText>
                </View>
              ) : null}
              <AppText weight="700" size={16}>{review.reviewerName}</AppText>
              <AppText muted size={13} style={styles.detail}>{review.branchName}</AppText>
              <View
                accessible
                accessibilityLabel={`${review.isSample ? "Sample rating" : "Rating"}: ${review.rating} out of 5 stars`}
                style={styles.stars}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= review.rating ? "star" : "star-outline"}
                    size={16}
                    color={colors.foreground}
                  />
                ))}
              </View>
              <AppText size={14}>{review.reviewText}</AppText>
            </Card>
          ))}
          {reviews.length > 3 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((value) => !value)}
              style={[styles.action, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
            >
              <AppText weight="600">{expanded ? "Show fewer reviews" : "Show all reviews"}</AppText>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.foreground} />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  note: { marginBottom: 16 },
  cards: { gap: 12 },
  detail: { marginTop: 4 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, marginBottom: 12 },
  stars: { flexDirection: "row", gap: 3, marginVertical: 12 },
  action: { minHeight: 48, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 12, marginTop: 8 },
  loading: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20 },
});