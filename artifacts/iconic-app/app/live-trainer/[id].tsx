import { useAuth } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch, useGetMyMembership, getGetMyMembershipQueryKey } from "@workspace/api-client-react";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen, WEB_NOTCH_TOP } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { resolveImageUrl } from "@/lib/images";
import { memberAuthHref } from "@/lib/memberAuth";

type LiveTrainerReview = {
  id: number;
  reviewerName: string;
  branchName: string;
  reviewText: string;
  rating: number;
  isSample: boolean;
  isPublished: boolean;
  sortOrder: number;
  trainerId: string;
  gymId: number;
};

type LiveTrainerProfile = {
  id: string;
  name: string;
  photoUrl: string | null;
  gymId: number;
  branchName: string;
  reviews: LiveTrainerReview[];
  rating: number | null;
  reviewCount: number;
  profile?: {
    coverPhotoUrl?: string | null;
    photoUrl?: string | null;
    bio?: string;
    qualifications?: string[];
    specialties?: string[];
    interests?: string[];
    certificates?: { title: string; url: string }[];
  };
};

type MemberReview = {
  id: number;
  rating: number;
  reviewText: string;
  status: "pending" | "approved" | "rejected";
  isPublished: boolean;
};

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function MemberReviewSection({ trainerId, gymId, afterTrial }: { trainerId: string; gymId: number; afterTrial?: string }) {
  const colors = useColors();
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isGuest } = useGuest();
  
  const { exitGuest } = useGuest();
  
  const membershipQuery = useGetMyMembership({
    query: { enabled: !!(isLoaded && isSignedIn && !isGuest), queryKey: getGetMyMembershipQueryKey() },
  });

  const canReview = !!(
    isLoaded && 
    isSignedIn && 
    !isGuest && 
    membershipQuery.data?.status === "active" && 
    membershipQuery.data.homeGymId === gymId
  );
  
  const queryClient = useQueryClient();
  
  const reviewQuery = useQuery({
    queryKey: ["live-trainer-review", userId, gymId, trainerId],
    queryFn: async () => {
      const res = await customFetch<{ review: MemberReview | null }>(
        `/api/trainers/live/${encodeURIComponent(trainerId)}/review?gymId=${encodeURIComponent(String(gymId))}`,
        { responseType: "json" }
      );
      return res.review;
    },
    enabled: !!(canReview && trainerId && gymId),
    staleTime: 0,
    gcTime: 0,
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: { rating: number; reviewText: string }) => {
      return customFetch(
        `/api/trainers/live/${encodeURIComponent(trainerId)}/review?gymId=${encodeURIComponent(String(gymId))}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-trainer-review", userId, gymId, trainerId] });
      queryClient.invalidateQueries({ queryKey: ["live-trainer-profile", gymId, trainerId] });
      setIsEditing(false);
      reviewMutation.reset();
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  const existingReview = reviewQuery.data;

  // Clear draft on user/trainer change or when entering/exiting edit mode
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setText(existingReview.reviewText);
    } else {
      setRating(0);
      setText("");
    }
    reviewMutation.reset();
  }, [existingReview, userId, trainerId, gymId, isEditing]);

  if (!isLoaded || (isSignedIn && !isGuest && membershipQuery.isPending)) {
    return (
      <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isSignedIn || isGuest) {
    return (
      <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
        <AppText weight="600" style={{ marginBottom: 12 }}>Leave a Review</AppText>
        <Button 
          label="Sign in to review" 
          variant="secondary" 
          onPress={() => {
            const redirectUrl = `/live-trainer/${trainerId}?gymId=${gymId}${afterTrial ? `&afterTrial=${afterTrial}` : ''}`;
            if (isGuest) {
              exitGuest();
              router.push(memberAuthHref(redirectUrl));
            } else {
              router.push(memberAuthHref(redirectUrl));
            }
          }} 
        />
      </View>
    );
  }

  if (membershipQuery.isError) {
    return (
      <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
        <AppText weight="600">Could not check your membership.</AppText>
        <Button label="Retry" variant="ghost" onPress={() => void membershipQuery.refetch()} size="sm" />
      </View>
    );
  }

  if (membershipQuery.data?.status !== "active") {
    return (
      <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
        <AppText weight="600">Leave a Review</AppText>
        <AppText muted size={14} style={{ marginTop: 4 }}>
          You must have an active membership to leave a review.
        </AppText>
      </View>
    );
  }
  
  if (membershipQuery.data.homeGymId !== gymId) {
    return (
      <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
        <AppText weight="600">Leave a Review</AppText>
        <AppText muted size={14} style={{ marginTop: 4 }}>
          You can only review trainers at your home branch.
        </AppText>
      </View>
    );
  }

  if (reviewQuery.isError) {
    return (
      <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
        <AppText color={colors.destructive} weight="600">Could not load your review.</AppText>
        <Button label="Retry" variant="ghost" onPress={() => reviewQuery.refetch()} size="sm" />
      </View>
    );
  }

  if (reviewQuery.isPending) {
    return (
      <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
         <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isRejected = existingReview?.status === "rejected";
  const isPending = existingReview?.status === "pending";
  
  const showForm = isEditing || !existingReview || isRejected;

  return (
    <View style={[styles.memberReviewCard, { backgroundColor: colors.elevated }]}>
      <AppText weight="700" size={16} style={{ marginBottom: 12 }}>
        {existingReview ? "Your Review" : "Leave a Review"}
      </AppText>
      
      {!showForm && existingReview && (
        <View>
          {isPending && (
            <View style={[styles.statusBanner, { backgroundColor: colors.secondary }]}>
              <AppText weight="600" color={colors.secondaryForeground}>Pending Approval</AppText>
              <AppText size={13} color={colors.secondaryForeground}>Your review will be visible once approved.</AppText>
            </View>
          )}
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= existingReview.rating ? "star" : "star-outline"}
                size={16}
                color={colors.foreground}
              />
            ))}
          </View>
          <AppText size={14} style={{ marginBottom: 12 }}>{existingReview.reviewText}</AppText>
          <Button label="Edit Review" variant="secondary" size="sm" onPress={() => setIsEditing(true)} />
        </View>
      )}

      {showForm && (
        <View>
          {isRejected && !isEditing && (
            <View style={[styles.statusBanner, { backgroundColor: colors.destructive + '20' }]}>
              <AppText weight="600" color={colors.destructive}>Review Not Approved</AppText>
              <AppText size={13} color={colors.destructive}>Please edit your review and submit it again.</AppText>
            </View>
          )}
          
          <AppText weight="600" size={14} style={{ marginBottom: 8 }}>Rating</AppText>
          <View style={styles.starPicker}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={32}
                  color={star <= rating ? colors.primary : colors.muted}
                />
              </Pressable>
            ))}
          </View>

          <AppText weight="600" size={14} style={{ marginBottom: 8 }}>Review</AppText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="Share your experience..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            value={text}
            onChangeText={setText}
          />

          {reviewMutation.isError && (
             <AppText color={colors.destructive} size={13} style={{ marginBottom: 12 }}>
                Failed to save review. Please try again.
             </AppText>
          )}

          <View style={styles.formActions}>
            <View style={styles.flex}>
              <Button
                label={existingReview ? "Update Review" : "Submit Review"}
                onPress={() => reviewMutation.mutate({ rating, reviewText: text })}
                loading={reviewMutation.isPending}
                disabled={rating === 0 || text.trim().length === 0}
              />
            </View>
            {existingReview && (
              <View style={styles.flex}>
                <Button label="Cancel" variant="secondary" onPress={() => setIsEditing(false)} />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function BioSection({ text }: { text: string }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);

  return (
    <View style={styles.section}>
      <AppText
        size={15}
        style={styles.bioText}
        numberOfLines={expanded ? undefined : 4}
        onTextLayout={(e) => {
          if (!showButton && e.nativeEvent.lines.length > 4) {
            setShowButton(true);
          }
        }}
      >
        {text}
      </AppText>
      {showButton && !expanded && (
        <Pressable onPress={() => setExpanded(true)} style={{ marginTop: 4 }}>
          <AppText weight="600" color={colors.primary}>Read more</AppText>
        </Pressable>
      )}
    </View>
  );
}

export default function LiveTrainerProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id?: string;
    gymId?: string;
    afterTrial?: string;
  }>();
  
  const trainerId = typeof params.id === "string" ? params.id.trim() : "";
  const gymId = Number(params.gymId);
  const validParams = trainerId.length > 0 && Number.isInteger(gymId) && gymId > 0;
  
  const profileQuery = useQuery({
    queryKey: ["live-trainer-profile", gymId, trainerId],
    queryFn: () =>
      customFetch<LiveTrainerProfile>(
        `/api/trainers/live/${encodeURIComponent(trainerId)}?gymId=${encodeURIComponent(String(gymId))}`,
        { responseType: "json" },
      ),
    enabled: validParams,
    staleTime: 30_000,
    refetchOnMount: "always",
  });
  
  const profile =
    profileQuery.data?.id === trainerId && profileQuery.data.gymId === gymId
      ? profileQuery.data
      : null;
      
  if (!validParams) {
    return (
      <Screen>
        <ModalHeader title="Trainer profile" />
        <EmptyState
          icon="user-x"
          title="Trainer not found"
          message="This trainer profile link is invalid."
        />
      </Screen>
    );
  }

  if (profileQuery.isPending) {
    return (
      <Screen>
        <ModalHeader title="Trainer profile" />
        <LoadingView />
      </Screen>
    );
  }

  if (profileQuery.isError || !profile) {
    const notFound = errorStatus(profileQuery.error) === 404 || !profile;
    return (
      <Screen>
        <ModalHeader title="Trainer profile" />
        {notFound ? (
          <EmptyState
            icon="user-x"
            title="Trainer unavailable"
            message="This trainer is not currently available at the selected branch."
          />
        ) : (
          <ErrorView onRetry={() => void profileQuery.refetch()} />
        )}
      </Screen>
    );
  }

  const reviews = (profile.reviews ?? [])
    .filter(
      (review) =>
        review.isPublished &&
        review.trainerId === trainerId &&
        review.gymId === gymId,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
    
  const rawCover = profile.profile?.coverPhotoUrl;
  const coverPhoto = resolveImageUrl(rawCover);
  const rawAvatar = profile.profile?.photoUrl || profile.photoUrl;
  const avatarPhoto = resolveImageUrl(rawAvatar);
  
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  const handleRefresh = async () => {
    await Promise.all([
      profileQuery.refetch(),
      isSignedIn && userId ? queryClient.invalidateQueries({ queryKey: ["live-trainer-review", userId, gymId, trainerId] }) : Promise.resolve(),
    ]);
  };

  const fallbackTop = insets.top === 0 ? (Platform.OS === "web" ? WEB_NOTCH_TOP : 16) : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
           style={styles.flex}
           contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 100 }}
           showsVerticalScrollIndicator={false}
           keyboardShouldPersistTaps="handled"
           bounces={true}
           refreshControl={
             <RefreshControl 
               refreshing={profileQuery.isRefetching} 
               onRefresh={handleRefresh} 
               tintColor={colors.primary} 
               colors={[colors.primary]} 
             />
           }
        >
          {/* Cover Photo */}
          <View style={[styles.coverContainer, { backgroundColor: colors.elevated }]}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient 
                colors={[colors.primary + '80', colors.background]} 
                style={StyleSheet.absoluteFill} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} 
              />
            )}
          </View>

          <View style={styles.profileDetails}>
             {/* Overlapping Avatar */}
             <View style={styles.avatarRow}>
               <View style={[styles.avatarWrapper, { borderColor: colors.background, backgroundColor: colors.elevated }]}>
                 {avatarPhoto ? (
                   <Image source={{ uri: avatarPhoto }} style={styles.avatarImage} contentFit="cover" />
                 ) : (
                   <View style={styles.avatarPlaceholder}>
                     <AppText size={32} weight="700" color={colors.primary}>{initials}</AppText>
                   </View>
                 )}
               </View>
             </View>
             
             {/* Name & Badges */}
             <View style={styles.nameRow}>
                <AppText weight="700" size={28}>{profile.name}</AppText>
             </View>
             <View style={styles.badgeRow}>
                <View style={[styles.ptBadge, { backgroundColor: colors.primary }]}>
                  <AppText size={12} weight="700" color="#fff">PT COACH</AppText>
                </View>
                <AppText muted size={14}>{profile.branchName}</AppText>
             </View>
             
             {/* Rating Summary Card */}
             <View style={[styles.ratingCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                 <View style={[styles.ratingIcon, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="star" color={colors.primary} size={20} />
                 </View>
                 <View style={styles.ratingTextWrapper}>
                    <AppText weight="700" size={16}>
                       {profile.rating ? `${profile.rating.toFixed(1)} Rating` : "No ratings yet"}
                    </AppText>
                    <AppText muted size={13}>
                       {profile.reviewCount > 0 ? `${profile.reviewCount} ${profile.reviewCount === 1 ? "review" : "reviews"}` : "Be the first to review"}
                    </AppText>
                 </View>
             </View>

             {/* Bio */}
             {profile.profile?.bio ? (
               <BioSection text={profile.profile.bio} />
             ) : null}

             {/* Qualifications */}
             {profile.profile?.qualifications && profile.profile.qualifications.length > 0 ? (
               <View style={styles.section}>
                 <AppText weight="700" size={18} style={styles.sectionTitle}>Qualifications</AppText>
                 {profile.profile.qualifications.map((q, i) => (
                   <View key={i} style={styles.listItem}>
                     <View style={styles.checkIcon}>
                       <Feather name="check" size={12} color="#fff" />
                     </View>
                     <AppText size={15} style={styles.listText}>{q}</AppText>
                   </View>
                 ))}
               </View>
             ) : null}

             {/* Specialties */}
             {profile.profile?.specialties && profile.profile.specialties.length > 0 ? (
               <View style={styles.section}>
                 <AppText weight="700" size={18} style={styles.sectionTitle}>Specialties</AppText>
                 <View style={styles.pillContainer}>
                   {profile.profile.specialties.map((s, i) => (
                     <View key={i} style={[styles.solidPill, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                       <AppText weight="600" size={14}>{s}</AppText>
                     </View>
                   ))}
                 </View>
               </View>
             ) : null}

             {/* Interests */}
             {profile.profile?.interests && profile.profile.interests.length > 0 ? (
               <View style={styles.section}>
                 <AppText weight="700" size={18} style={styles.sectionTitle}>Interested In</AppText>
                 <View style={styles.pillContainer}>
                   {profile.profile.interests.map((s, i) => (
                     <View key={i} style={[styles.outlinePill, { borderColor: colors.border }]}>
                       <AppText size={14}>{s}</AppText>
                     </View>
                   ))}
                 </View>
               </View>
             ) : null}

             {/* Certificates */}
             {profile.profile?.certificates && profile.profile.certificates.length > 0 ? (
               <View style={styles.section}>
                 <AppText weight="700" size={18} style={styles.sectionTitle}>Certificates</AppText>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.certScroll}>
                    {profile.profile.certificates.map((cert, i) => (
                      <Pressable 
                        key={i} 
                        onPress={() => void WebBrowser.openBrowserAsync(cert.url)} 
                        style={[styles.certCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}
                      >
                         <View style={styles.flex}>
                           <AppText weight="600" size={14} numberOfLines={2}>{cert.title}</AppText>
                         </View>
                         <Feather name="external-link" size={16} color={colors.muted} style={styles.certIcon} />
                      </Pressable>
                    ))}
                 </ScrollView>
               </View>
             ) : null}

             {/* Public Reviews */}
             <View style={styles.reviewsSection}>
               <AppText weight="700" size={20} style={styles.reviewsTitle}>Reviews</AppText>
               {reviews.some((review) => review.isSample) ? (
                 <AppText muted size={13} style={styles.sampleDisclaimer}>
                   Sample reviews are illustrative and are not included in the member rating.
                 </AppText>
               ) : null}
               
               {reviews.length === 0 ? (
                 <Card>
                   <AppText weight="600">No published reviews yet</AppText>
                   <AppText muted size={13} style={styles.reviewMeta}>
                     Check back soon for member feedback.
                   </AppText>
                 </Card>
               ) : (
                 <View style={styles.reviewList}>
                   {reviews.map((review) => (
                     <Card key={review.id}>
                       {review.isSample ? (
                         <View style={[styles.sampleBadge, { backgroundColor: colors.secondary }]}>
                           <AppText size={11} weight="700" color={colors.secondaryForeground}>
                             SAMPLE REVIEW
                           </AppText>
                         </View>
                       ) : null}
                       <AppText weight="700">{review.reviewerName}</AppText>
                       <AppText muted size={12} style={styles.reviewMeta}>
                         {review.branchName}
                       </AppText>
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
                       <AppText size={14} style={styles.reviewTextBody}>{review.reviewText}</AppText>
                     </Card>
                   ))}
                 </View>
               )}
             </View>

             <MemberReviewSection trainerId={trainerId} gymId={gymId} afterTrial={params.afterTrial} />
             
          </View>
        </ScrollView>
        
        {/* Sticky bottom button */}
        <View style={[styles.stickyBottom, { 
          backgroundColor: colors.background,
          paddingBottom: Math.max(insets.bottom + 8, 16),
          borderTopColor: colors.border
        }]}>
          <Button
            label="Book PT Sessions"
            icon="calendar"
            onPress={() =>
              router.push({
                pathname: params.afterTrial === "1" ? "/book-pt-plan" : "/book-pt-sessions",
                params: { trainerId: profile.id, gymId: String(profile.gymId) },
              })
            }
          />
        </View>
      </KeyboardAvoidingView>

      {/* Floating Back Button */}
      <View style={[styles.floatingBack, { top: Math.max(fallbackTop + 8, 16) }]}>
        <Pressable 
          onPress={() => router.back()} 
          style={styles.backButtonBtn}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  coverContainer: { height: 280, width: "100%" },
  profileDetails: { paddingHorizontal: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -50, marginBottom: 16 },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  ptBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingCard: { padding: 16, borderRadius: 16, marginTop: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  ratingIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ratingTextWrapper: { flex: 1, marginLeft: 12 },
  section: { marginTop: 28 },
  sectionTitle: { marginBottom: 12 },
  bioText: { lineHeight: 22 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, paddingRight: 16 },
  checkIcon: { marginTop: 3, marginRight: 10, backgroundColor: '#10B981', borderRadius: 6, padding: 3 },
  listText: { flex: 1, lineHeight: 22 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  solidPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  outlinePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  certScroll: { gap: 12, paddingRight: 20 },
  certCard: { padding: 16, borderRadius: 16, width: 240, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  certIcon: { marginLeft: 8 },
  reviewsSection: { marginTop: 32 },
  reviewsTitle: { marginBottom: 16 },
  sampleDisclaimer: { marginBottom: 12 },
  reviewMeta: { marginTop: 3 },
  reviewList: { gap: 12 },
  sampleBadge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, marginBottom: 10 },
  stars: { flexDirection: "row", gap: 3, marginVertical: 10 },
  reviewTextBody: { lineHeight: 20 },
  stickyBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  floatingBack: { position: "absolute", left: 16, zIndex: 10 },
  backButtonBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  
  // MemberReviewSection styles
  memberReviewCard: { marginTop: 24, padding: 16, borderRadius: 12 },
  statusBanner: { padding: 12, borderRadius: 8, marginBottom: 12 },
  starRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  starPicker: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  textInput: { padding: 12, borderRadius: 8, borderWidth: 1, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  formActions: { flexDirection: 'row', gap: 8 },
});
