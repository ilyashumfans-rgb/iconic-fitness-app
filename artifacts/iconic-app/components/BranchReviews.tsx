import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGymQueryKey,
  getGetOwnGymReviewQueryKey,
  getGetMyMembershipQueryKey,
  getListGymReviewsQueryKey,
  useDeleteOwnGymReview,
  useGetOwnGymReview,
  useGetMyMembership,
  useListGymReviews,
  useSaveOwnGymReview,
} from "@workspace/api-client-react";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, AppState, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { memberAuthHref } from "@/lib/memberAuth";

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "status" in error && error.status === 403) {
    return "Only active members of this home branch can review it.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function BranchReviews({
  gymId,
  fullList = false,
}: {
  gymId: number;
  fullList?: boolean;
}) {
  const { userId } = useAuth();
  const { isGuest } = useGuest();
  // Remount private draft and mutation state when the account or branch changes.
  return <BranchReviewsContent key={`${userId ?? "guest"}:${isGuest}:${gymId}`} gymId={gymId} fullList={fullList} />;
}

function BranchReviewsContent({ gymId, fullList }: { gymId: number; fullList: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isGuest, exitGuest } = useGuest();
  const signedIn = isLoaded && !!isSignedIn && !isGuest;
  const membership = useGetMyMembership({
    query: { queryKey: getGetMyMembershipQueryKey(), enabled: signedIn },
  });
  const eligible = signedIn && membership.data?.status === "active" && membership.data.homeGymId === gymId;
  const publicKey = getListGymReviewsQueryKey(gymId);
  const mineKey = [...getGetOwnGymReviewQueryKey(gymId), userId];
  const publicReviews = useListGymReviews(gymId, {
    query: { queryKey: publicKey, staleTime: 30_000 },
  });
  const mine = useGetOwnGymReview(gymId, {
    query: { queryKey: mineKey, enabled: signedIn, staleTime: 0, gcTime: 0 },
  });
  useFocusEffect(useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getListGymReviewsQueryKey(gymId) });
    if (signedIn) void queryClient.invalidateQueries({ queryKey: getGetOwnGymReviewQueryKey(gymId) });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void queryClient.invalidateQueries({ queryKey: getListGymReviewsQueryKey(gymId) });
        if (signedIn) void queryClient.invalidateQueries({ queryKey: getGetOwnGymReviewQueryKey(gymId) });
      }
    });
    return () => subscription.remove();
  }, [gymId, queryClient, signedIn]));
  const [expanded, setExpanded] = useState(fullList);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [validation, setValidation] = useState("");

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: publicKey }),
      queryClient.invalidateQueries({ queryKey: mineKey }),
      queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(gymId) }),
    ]);
  };
  const save = useSaveOwnGymReview({
    mutation: { onSuccess: async () => {
      setEditing(false);
      setRating(0);
      setText("");
      setValidation("");
      await refresh();
    } },
  });
  const remove = useDeleteOwnGymReview({
    mutation: { onSuccess: async () => {
      setEditing(false);
      setRating(0);
      setText("");
      setValidation("");
      await refresh();
    } },
  });
  const busy = save.isPending || remove.isPending;
  const own = mine.data?.review;
  const startEdit = () => {
    setRating(own?.rating ?? 0);
    setText(own?.reviewText ?? "");
    setValidation("");
    save.reset();
    remove.reset();
    setEditing(true);
  };
  const submit = () => {
    if (!eligible || busy) return;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text.trim() || text.trim().length > 2000) {
      setValidation("Choose 1–5 stars and write a review of up to 2,000 characters.");
      return;
    }
    setValidation("");
    save.mutate({ id: gymId, data: { rating, text: text.trim() } });
  };
  const confirmDelete = () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Delete your branch review?")) remove.mutate({ id: gymId });
      return;
    }
    Alert.alert("Delete review?", "This will remove your review from this branch.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate({ id: gymId }) },
    ]);
  };
  const reviews = publicReviews.data?.reviews ?? [];
  const visible = expanded ? reviews : reviews.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View>
          <AppText weight="700" size={20}>Branch reviews</AppText>
          <AppText muted size={13}>Experiences at this location</AppText>
        </View>
        {publicReviews.data && publicReviews.data.reviewCount > 0 && publicReviews.data.averageRating !== null ? (
          <View style={styles.aggregate}>
            <Ionicons name="star" size={17} color={colors.primary} />
            <AppText weight="700" size={18}>{publicReviews.data.averageRating.toFixed(1)}</AppText>
            <AppText muted size={12}>({publicReviews.data.reviewCount} real)</AppText>
          </View>
        ) : null}
      </View>
      {publicReviews.isPending ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : publicReviews.isError ? (
        <Card>
          <AppText color={colors.destructive}>Could not load branch reviews: {errorMessage(publicReviews.error)}</AppText>
          <Button label="Retry" size="sm" variant="ghost" onPress={() => void publicReviews.refetch()} />
        </Card>
      ) : (
        <>
          {publicReviews.data?.reviewCount === 0 ? (
            <AppText muted size={13}>No genuine member ratings yet.</AppText>
          ) : null}
          {reviews.some((review) => review.isSample) ? (
            <AppText muted size={12}>Sample reviews below are illustrative, not verified customer feedback. They do not affect the rating.</AppText>
          ) : null}
          {visible.length === 0 ? (
            <Card><AppText muted size={14}>No published reviews yet.</AppText></Card>
          ) : visible.map((review) => (
            <Card key={review.id}>
              <View style={styles.cardHead}>
                <AppText weight="700" size={15} style={styles.name}>{review.reviewerName}</AppText>
                {review.isSample ? (
                  <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                    <AppText size={10} weight="700" color={colors.secondaryForeground}>SAMPLE REVIEW</AppText>
                  </View>
                ) : null}
              </View>
              <AppText muted size={12}>{review.branchName}{review.createdAt ? ` · ${new Date(review.createdAt).toLocaleDateString()}` : ""}</AppText>
              <View style={styles.stars} accessibilityLabel={`${review.isSample ? "Sample rating" : "Rating"}: ${review.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name={star <= review.rating ? "star" : "star-outline"} size={16} color={colors.primary} />
                ))}
              </View>
              <AppText size={14} style={styles.body}>{review.reviewText}</AppText>
            </Card>
          ))}
          {reviews.length > 3 ? (
            <Button label={expanded ? "Show fewer reviews" : `Show all ${reviews.length} reviews`} variant="secondary" size="sm" onPress={() => setExpanded(!expanded)} />
          ) : null}
        </>
      )}

      {isLoaded && (!isSignedIn || isGuest) ? (
        <Card>
          <AppText weight="700" size={16}>Share your experience</AppText>
          <AppText muted size={13} style={styles.note}>Sign in as a member to review your home branch.</AppText>
          <Button label="Sign in to review" variant="secondary" onPress={() => {
            if (isGuest) exitGuest();
            router.push(memberAuthHref(`/gym/${gymId}`));
          }} />
        </Card>
      ) : !isLoaded ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : mine.isPending ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : mine.isError ? (
        <Card>
          <AppText color={colors.destructive}>Could not load your review: {errorMessage(mine.error)}</AppText>
          <Button label="Retry" variant="ghost" size="sm" onPress={() => void mine.refetch()} />
        </Card>
      ) : !own && membership.isPending ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : !own && membership.isError ? (
        <Card>
          <AppText color={colors.destructive}>Could not check membership: {errorMessage(membership.error)}</AppText>
          <Button label="Retry" variant="ghost" size="sm" onPress={() => void membership.refetch()} />
        </Card>
      ) : !own && !eligible ? (
        <Card><AppText muted size={13}>Only active members can review their home branch.</AppText></Card>
      ) : (
        <Card>
          <AppText weight="700" size={16}>{own ? "Your branch review" : "Review this branch"}</AppText>
          {own ? (
            <AppText size={13} color={own.moderationStatus === "rejected" ? colors.destructive : colors.mutedForeground} style={styles.note}>
              {own.moderationStatus === "pending"
                ? "Pending approval — your review is not public yet."
                : own.moderationStatus === "rejected"
                  ? "Not approved — edit and resubmit your review."
                  : "Approved and published."}
            </AppText>
          ) : (
            <AppText muted size={13} style={styles.note}>Submissions are reviewed before publication.</AppText>
          )}
          {own && !eligible ? (
            <AppText muted size={13} style={styles.note}>You can delete this review, but only active members of this home branch can edit or submit reviews.</AppText>
          ) : null}
          {own && membership.isError ? (
            <Button label="Retry membership check" variant="ghost" size="sm" onPress={() => void membership.refetch()} />
          ) : null}
          {(!editing || !eligible) && own ? (
            <>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name={star <= own.rating ? "star" : "star-outline"} size={17} color={colors.primary} />)}
              </View>
              <AppText size={14} style={styles.body}>{own.reviewText}</AppText>
              <View style={styles.actions}>
                {eligible ? <Button label="Edit review" variant="secondary" size="sm" onPress={startEdit} /> : null}
                <Button label="Delete review" variant="ghost" size="sm" disabled={busy} onPress={confirmDelete} />
              </View>
            </>
          ) : (
            <>
              <AppText weight="600" size={13} style={styles.label}>Your rating</AppText>
              <View style={styles.picker}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} testID={`branch-rating-${star}`} accessibilityRole="button" accessibilityLabel={`Rate ${star} stars`} accessibilityState={{ selected: rating === star }} disabled={busy} onPress={() => setRating(star)} hitSlop={8}>
                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={30} color={star <= rating ? colors.primary : colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
              <TextInput
                testID="branch-review-text"
                accessibilityLabel="Your branch review"
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius }]}
                placeholder="What was your experience like?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={2000}
                editable={!busy}
                value={text}
                onChangeText={setText}
              />
              <AppText muted size={11} style={styles.count}>{text.length}/2000</AppText>
              {validation || save.isError ? (
                <AppText color={colors.destructive} size={13} style={styles.note}>{validation || errorMessage(save.error)}</AppText>
              ) : null}
              <View style={styles.actions}>
                <Button label={own ? "Resubmit review" : "Submit for approval"} size="sm" loading={save.isPending} disabled={busy || !rating || !text.trim()} onPress={submit} />
                {own ? <Button label="Cancel" variant="ghost" size="sm" disabled={busy} onPress={() => setEditing(false)} /> : null}
              </View>
            </>
          )}
          {remove.isError ? <AppText color={colors.destructive} size={13}>Could not delete review: {errorMessage(remove.error)}</AppText> : null}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  aggregate: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", flex: 1 },
  loading: { marginVertical: 18 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stars: { flexDirection: "row", gap: 3, marginVertical: 8 },
  body: { lineHeight: 21 },
  note: { marginTop: 6, marginBottom: 12, lineHeight: 19 },
  label: { marginTop: 12 },
  picker: { flexDirection: "row", gap: 12, marginVertical: 12 },
  input: { borderWidth: 1, minHeight: 110, padding: 12, textAlignVertical: "top", fontSize: 14 },
  count: { textAlign: "right", marginTop: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 },
});