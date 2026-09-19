import { useAuth } from "@clerk/expo";
import {
  getListCommunityPostsQueryKey,
  getListCommunityTrainersQueryKey,
  getListMyCommunityPostsQueryKey,
  useCreateCommunityPost,
  useListCommunityPosts,
  useListCommunityTrainers,
  useListGyms,
  useListMyCommunityPosts,
  useWithdrawCommunityPost,
  type CommunityPost,
  type CreateCommunityPostRequest,
  type Gym,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Screen } from "@/components/Screen";
import { useColors } from "@/hooks/useColors";
import { useGuest } from "@/hooks/useGuest";
import { resolveImageUrl } from "@/lib/images";
import { prepareMobileImageForUpload } from "@/lib/imageUpload";
import { memberAuthHref } from "@/lib/memberAuth";

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.8,
  allowsEditing: false,
};

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function notifyPermissionDenied(message: string, canAskAgain: boolean) {
  if (Platform.OS === "web" || canAskAgain) {
    notify("Permission needed", message);
    return;
  }
  Alert.alert(
    "Permission needed",
    `${message} Access was previously denied, so please enable it in Settings.`,
    [
      { text: "Not now", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings() },
    ],
  );
}

/**
 * The public feed can use the media URL directly. A pending or rejected
 * submission cannot: those media routes are protected by the member session.
 * Native Expo Image receives the bearer in its request headers; web fetches the
 * image first with both the bearer (when available) and the Clerk cookie.
 */
function CommunityImage({
  uri,
  privateImage = false,
  style,
  label,
  fullImage = false,
}: {
  uri?: string | null;
  privateImage?: boolean;
  style?: Record<string, unknown>;
  label: string;
  fullImage?: boolean;
}) {
  const { getToken, userId, sessionId } = useAuth();
  // Clerk may return a new getter during navigation. Its function identity must
  // not restart an effect that replaces image state on every render.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const colors = useColors();
  const [source, setSource] = useState<{
    uri: string;
    headers?: Record<string, string>;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSource(null);
    if (!uri) return;
    const absoluteUri = resolveImageUrl(uri);
    if (!absoluteUri) return;

    if (!privateImage) {
      setSource({ uri: absoluteUri });
      return () => {
        cancelled = true;
      };
    }

    if (Platform.OS !== "web") {
      void getTokenRef.current()
        .then((token) => {
          if (cancelled) return;
          setSource({
            uri: absoluteUri,
            ...(privateImage && token
              ? { headers: { Authorization: `Bearer ${token}` } }
              : {}),
          });
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const token = await getTokenRef.current();
        const response = await fetch(absoluteUri, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load image");
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("Could not read image"));
          reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setSource({ uri: dataUrl });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionId, privateImage, retryCount, uri]);

  if (failed || !source) {
    return failed ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Retry ${label} photo`}
        onPress={() => setRetryCount((value) => value + 1)}
        style={[styles.imageFallback, style, { backgroundColor: colors.elevated }]}
      >
        <Feather name="image" size={19} color={colors.mutedForeground} />
        <AppText size={10} weight="700" muted style={{ marginTop: 4 }}>
          Retry
        </AppText>
      </Pressable>
    ) : (
      <View
        accessible
        accessibilityLabel={`${label} photo unavailable`}
        style={[styles.imageFallback, style, { backgroundColor: colors.elevated }]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <ExpoImage
      source={source}
      cachePolicy="none"
      contentFit={fullImage ? "contain" : "cover"}
      accessibilityLabel={label}
      onError={() => setFailed(true)}
      style={style}
    />
  );
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusText(status?: CommunityPost["status"]): string {
  if (!status) return "Approved";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function CommunityPhotoSlider({ post, privateImages }: { post: CommunityPost; privateImages: boolean }) {
  const colors = useColors();
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const photos = [
    { label: "BEFORE", uri: post.beforeImageUrl },
    { label: "AFTER", uri: post.afterImageUrl },
  ];
  const goTo = (index: number) => {
    setActive(index);
    scroll.current?.scrollTo({ x: width * index, animated: true });
  };

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{ borderRadius: 13, overflow: "hidden", backgroundColor: colors.elevated }}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth !== width) {
            setWidth(nextWidth);
            setActive(0);
          }
        }}
      >
        {width > 0 ? (
          <ScrollView
            key={width}
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              setActive(Math.max(0, Math.min(1, Math.round(event.nativeEvent.contentOffset.x / width))));
            }}
            scrollEventThrottle={16}
          >
            {photos.map((photo) => (
              <View key={photo.label} style={{ width, height: Math.min(width * 1.2, 480) }}>
                <CommunityImage
                  uri={photo.uri}
                  privateImage={privateImages}
                  fullImage
                  style={{ width: "100%", height: "100%" }}
                  label={`${post.authorName} ${photo.label.toLowerCase()}`}
                />
                <View style={[styles.imageLabel, { backgroundColor: colors.card }]}>
                  <AppText size={11} weight="700">{photo.label}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show before photo"
          onPress={() => goTo(0)}
          style={{ padding: 10 }}
        >
          <Feather name="chevron-left" size={20} color={active === 0 ? colors.mutedForeground : colors.primary} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {photos.map((photo, index) => (
            <Pressable
              key={photo.label}
              accessibilityRole="button"
              accessibilityLabel={`Show ${photo.label.toLowerCase()} photo`}
              accessibilityState={{ selected: index === active }}
              hitSlop={10}
              onPress={() => goTo(index)}
              style={{ width: active === index ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: active === index ? colors.primary : colors.border }}
            />
          ))}
          <AppText size={12} muted style={{ marginLeft: 6 }}>{active + 1} / 2</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show after photo"
          onPress={() => goTo(1)}
          style={{ padding: 10 }}
        >
          <Feather name="chevron-right" size={20} color={active === 1 ? colors.mutedForeground : colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export function CommunityPostCard({
  post,
  privateImages = false,
  showStatus = false,
  onWithdraw,
  detail = false,
}: {
  post: CommunityPost;
  privateImages?: boolean;
  showStatus?: boolean;
  onWithdraw?: () => void;
  detail?: boolean;
}) {
  const colors = useColors();
  const router = useRouter();
  const status = post.status;
  return (
    <Pressable
      accessibilityRole={detail ? undefined : "button"}
      accessibilityLabel={detail ? undefined : `View ${post.authorName}'s transformation details`}
      onPress={detail ? undefined : () => router.push({ pathname: "/community-post/[id]", params: { id: String(post.id) } })}
      style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.postHeader}>
        <MemberAvatar name={post.authorName} avatarUrl={post.authorAvatarUrl} size={40} />
        <View style={styles.postAuthor}>
          <AppText weight="700" size={15}>
            {post.authorName}
          </AppText>
          <AppText size={12} muted>
            {formatSubmittedAt(post.submittedAt)}
          </AppText>
        </View>
        {showStatus ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  status === "approved"
                    ? colors.primary + "18"
                    : status === "rejected"
                      ? colors.destructive + "18"
                      : colors.secondary,
              },
            ]}
          >
            <AppText
              size={11}
              weight="700"
              color={status === "rejected" ? colors.destructive : colors.foreground}
            >
              {statusText(status)}
            </AppText>
          </View>
        ) : null}
      </View>

      {!detail && post.caption ? (
        <AppText size={14} style={styles.postCaption}>
          {post.caption}
        </AppText>
      ) : null}

      {detail ? (
        <CommunityPhotoSlider post={post} privateImages={privateImages} />
      ) : (
      <View style={styles.imagePair}>
        <View style={styles.imageCell}>
          <CommunityImage
            uri={post.beforeImageUrl}
            privateImage={privateImages}
            style={styles.postImage}
            label={`${post.authorName} before`}
          />
          <View style={[styles.imageLabel, { backgroundColor: "rgba(0,0,0,0.62)" }]}>
            <AppText size={10} weight="700" color="#FFFFFF">
              BEFORE
            </AppText>
          </View>
        </View>
        <View style={styles.imageCell}>
          <CommunityImage
            uri={post.afterImageUrl}
            privateImage={privateImages}
            style={styles.postImage}
            label={`${post.authorName} after`}
          />
          <View style={[styles.imageLabel, { backgroundColor: colors.primary + "E6" }]}>
            <AppText size={10} weight="700" color={colors.primaryForeground}>
              AFTER
            </AppText>
          </View>
        </View>
      </View>
      )}

      {detail ? (
        <View style={{ gap: 7 }}>
          <AppText size={15} weight="700">Description</AppText>
          <AppText size={14} style={styles.postCaption} muted={!post.caption}>
            {post.caption || "No description provided."}
          </AppText>
        </View>
      ) : null}

      {post.trainerName ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`View coach ${post.trainerName}'s profile`}
          onPress={(event) => {
            event.stopPropagation();
            router.push({ pathname: "/community-coach/[id]", params: { id: String(post.id) } });
          }}
          style={[styles.trainerCredit, { paddingVertical: 8 }]}
        >
          <Feather name="award" size={15} color={colors.primary} />
          <AppText size={12} muted>
            Trained by{" "}
            <AppText size={12} weight="700" color={colors.primary}>
              {post.trainerName}
            </AppText>
          </AppText>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </Pressable>
      ) : detail ? (
        <AppText size={12} muted>No coach tagged in this story.</AppText>
      ) : null}

      {!detail ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText size={12} weight="700" color={colors.primary}>View details</AppText>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </View>
      ) : null}

      {showStatus && post.rejectionReason ? (
        <View
          style={[
            styles.rejectionBox,
            { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "32" },
          ]}
        >
          <AppText size={12} weight="700" color={colors.destructive}>
            Why this was rejected
          </AppText>
          <AppText size={12} style={{ marginTop: 3 }}>
            {post.rejectionReason}
          </AppText>
        </View>
      ) : null}

      {onWithdraw && status !== "withdrawn" ? (
        <Pressable
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            onWithdraw();
          }}
          style={({ pressed }) => [styles.withdrawButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppText size={12} weight="700" color={colors.destructive}>
            Withdraw submission
          </AppText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function CommunityFeed({
  compact = false,
  pagination = false,
  onViewAll,
  onSubmit,
}: {
  compact?: boolean;
  pagination?: boolean;
  onViewAll?: () => void;
  onSubmit?: () => void;
}) {
  const colors = useColors();
  const { isSignedIn: clerkSignedIn } = useAuth();
  const { isGuest } = useGuest();
  const isMember = !!clerkSignedIn && !isGuest;
  const limit = compact ? 5 : 20;
  const [beforeId, setBeforeId] = useState<number | undefined>();
  const [items, setItems] = useState<CommunityPost[]>([]);
  const query = useListCommunityPosts(
    { limit, ...(beforeId ? { beforeId } : {}) },
    {
      query: {
        queryKey: getListCommunityPostsQueryKey({ limit, ...(beforeId ? { beforeId } : {}) }),
        staleTime: 0,
      },
      request: { cache: "no-store" },
    },
  );

  useEffect(() => {
    if (!query.data) return;
    setItems((current) => {
      if (!beforeId) return query.data.items;
      const existing = new Set(current.map((post) => post.id));
      return [...current, ...query.data.items.filter((post) => !existing.has(post.id))];
    });
  }, [beforeId, query.data]);

  useFocusEffect(
    useCallback(() => {
      if (beforeId) {
        setBeforeId(undefined);
        setItems([]);
      } else {
        void query.refetch();
      }
    }, [beforeId, query.refetch]),
  );

  const visibleItems = compact ? items.slice(0, limit) : items;
  const hasMore = pagination && !!query.data?.nextBeforeId;

  return (
    <View style={styles.feedSection}>
      <View style={styles.communityHeading}>
        <View style={{ flex: 1 }}>
          <AppText size={22} weight="700">
            Community
          </AppText>
          <AppText size={13} muted style={{ marginTop: 2 }}>
            Learn. Get fit. Share and inspire.
          </AppText>
        </View>
        <View style={styles.communityActions}>
          {onSubmit && visibleItems.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSubmit}
              style={({ pressed }) => [styles.textAction, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="plus" size={15} color={colors.primary} />
              <AppText size={13} weight="700" color={colors.primary}>
                Submit
              </AppText>
            </Pressable>
          ) : null}
          {onViewAll ? (
            <Pressable
              accessibilityRole="button"
              onPress={onViewAll}
              style={({ pressed }) => [styles.textAction, { opacity: pressed ? 0.6 : 1 }]}
            >
              <AppText size={13} weight="700" color={colors.primary}>
                See all
              </AppText>
              <Feather name="arrow-up-right" size={15} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {query.isPending ? (
        <View style={styles.feedMessage}>
          <ActivityIndicator color={colors.primary} />
          <AppText size={13} muted>
            Loading community stories…
          </AppText>
        </View>
      ) : query.isError ? (
        <View style={styles.feedMessage}>
          <Feather name="wifi-off" size={18} color={colors.mutedForeground} />
          <AppText size={13} muted style={{ flex: 1 }}>
            Community stories could not be loaded.
          </AppText>
          <Pressable onPress={() => void query.refetch()}>
            <AppText size={13} weight="700" color={colors.primary}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : visibleItems.length === 0 ? (
        <View style={[styles.emptyFeed, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "14" }]}>
            <Feather name="users" size={20} color={colors.primary} />
          </View>
          <AppText size={15} weight="700" style={{ textAlign: "center" }}>
            No approved stories yet
          </AppText>
          <AppText size={12} muted style={styles.emptyCopy}>
            Approved transformation stories will appear here. Be the first to share yours.
          </AppText>
          {onSubmit ? (
            <Button
              label={isMember ? "Submit your transformation" : "Sign in to share your story"}
              onPress={onSubmit}
              size="md"
              full={false}
            />
          ) : null}
        </View>
      ) : (
        <>
          {visibleItems.map((post) => (
            <CommunityPostCard key={post.id} post={post} />
          ))}
          {pagination && hasMore ? (
            <Button
              label={query.isFetching ? "Loading…" : "Load more stories"}
              onPress={() => {
                if (query.data?.nextBeforeId && !query.isFetching) {
                  setBeforeId(query.data.nextBeforeId);
                }
              }}
              loading={query.isFetching}
              variant="secondary"
            />
          ) : null}
        </>
      )}
    </View>
  );
}

type PickedPhoto = { uri: string; base64: string };

async function pickAndCompressPhoto(): Promise<PickedPhoto | null> {
  if (Platform.OS === "ios") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notifyPermissionDenied("Allow photo access to choose a transformation photo.", permission.canAskAgain);
      return null;
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.uri) return null;
  const compressed = await prepareMobileImageForUpload(asset.uri, "photo", asset);
  return { uri: compressed.uri, base64: compressed.base64 };
}

function BranchPicker({
  visible,
  gyms,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  gyms: Gym[];
  selectedId: number | null;
  onSelect: (gym: Gym) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTitleRow}>
            <AppText size={18} weight="700">
              Choose a branch
            </AppText>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flexShrink: 1, minHeight: 0 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            contentContainerStyle={{ paddingBottom: 12 }}
          >
          {gyms.length === 0 ? (
            <AppText size={13} muted>
              No branches are available right now. You can submit without a trainer.
            </AppText>
          ) : (
            gyms.map((gym) => (
              <Pressable
                key={gym.id}
                onPress={() => onSelect(gym)}
                style={[
                  styles.choiceRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: selectedId === gym.id ? colors.primary + "12" : "transparent",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText size={14} weight="700">
                    {gym.name}
                  </AppText>
                  <AppText size={12} muted>
                    {[gym.area, gym.city].filter(Boolean).join(" · ")}
                  </AppText>
                </View>
                {selectedId === gym.id ? <Feather name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            ))
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function CommunityComposer({
  onSubmitted,
}: {
  onSubmitted?: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { isSignedIn: clerkSignedIn } = useAuth();
  const { isGuest } = useGuest();
  const router = useRouter();
  const isMember = !!clerkSignedIn && !isGuest;
  const [before, setBefore] = useState<PickedPhoto | null>(null);
  const [after, setAfter] = useState<PickedPhoto | null>(null);
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [trainerPickerOpen, setTrainerPickerOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const gymsQuery = useListGyms({ sort: "rating" });
  const trainersQuery = useListCommunityTrainers(
    { gymId: selectedGym?.id ?? 0 },
    {
      query: {
        enabled: isMember && !!selectedGym,
        queryKey: getListCommunityTrainersQueryKey({ gymId: selectedGym?.id ?? 0 }),
      },
    },
  );
  const createPost = useCreateCommunityPost();
  const trainers = trainersQuery.data ?? [];
  const selectedTrainer = trainers.find((trainer) => trainer.id === selectedTrainerId);

  const choosePhoto = useCallback(async (target: "before" | "after") => {
    setPhotoError(null);
    try {
      const picked = await pickAndCompressPhoto();
      if (!picked) return;
      if (target === "before") setBefore(picked);
      else setAfter(picked);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not prepare this photo. Please try again.");
    }
  }, []);

  const submit = useCallback(async () => {
    if (!isMember) {
      router.push(memberAuthHref("/community"));
      return;
    }
    if (!before || !after) {
      setPhotoError("Choose both a before and an after photo.");
      return;
    }
    if (!consent) return;
    const data: CreateCommunityPostRequest = {
      caption: caption.trim(),
      beforeImage: before.base64,
      afterImage: after.base64,
      publicSharingConsent: true,
      ...(selectedTrainer && selectedGym
        ? { trainerStaffId: selectedTrainer.id, gymId: selectedGym.id }
        : {}),
    };
    try {
      await createPost.mutateAsync({ data });
      await queryClient.invalidateQueries({ queryKey: getListMyCommunityPostsQueryKey() });
      setBefore(null);
      setAfter(null);
      setCaption("");
      setConsent(false);
      setSelectedGym(null);
      setSelectedTrainerId(null);
      notify("Submitted for review", "Your transformation is pending approval. We’ll show it in Community once approved.");
      onSubmitted?.();
    } catch (error) {
      notify(
        "Could not submit",
        error instanceof Error && error.message ? error.message : "Please check your connection and try again.",
      );
    }
  }, [
    after,
    before,
    caption,
    consent,
    createPost,
    isMember,
    onSubmitted,
    queryClient,
    router,
    selectedGym,
    selectedTrainer,
  ]);

  return (
    <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.composerTitleRow}>
        <View style={{ flex: 1 }}>
          <AppText size={19} weight="700">
            Share your transformation
          </AppText>
          <AppText size={12} muted style={{ marginTop: 2 }}>
            Your photos stay private until a team member approves them.
          </AppText>
        </View>
        <Feather name="edit-3" size={20} color={colors.primary} />
      </View>

      <View style={styles.pickerPair}>
        {(["before", "after"] as const).map((target) => {
          const picked = target === "before" ? before : after;
          return (
            <Pressable
              key={target}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${target} photo`}
              onPress={() => void choosePhoto(target)}
              style={({ pressed }) => [
                styles.photoPicker,
                { backgroundColor: colors.elevated, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {picked ? (
                <ExpoImage source={{ uri: picked.uri }} contentFit="cover" style={styles.pickerImage} />
              ) : (
                <Feather name="plus" size={24} color={colors.mutedForeground} />
              )}
              <View style={styles.pickerLabel}>
                <AppText size={10} weight="700" color="#FFFFFF">
                  {target.toUpperCase()}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
      {photoError ? (
        <AppText size={12} color={colors.destructive} style={{ marginTop: 8 }}>
          {photoError}
        </AppText>
      ) : null}

      <AppText size={13} weight="700" style={{ marginTop: 14 }}>
        Description <AppText size={13} muted>(optional)</AppText>
      </AppText>
      <TextInput
        accessibilityLabel="Transformation description"
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={1200}
        placeholder="Add a description of your transformation"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.captionInput,
          { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.foreground },
        ]}
      />
      <AppText size={11} muted style={styles.characterCount}>
        {caption.length}/1200
      </AppText>

      <AppText size={13} weight="700" style={{ marginTop: 12 }}>
        Trainer credit <AppText size={13} muted>(optional)</AppText>
      </AppText>
      <Pressable
        onPress={() => setBranchPickerOpen(true)}
        style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.elevated }]}
      >
        <View style={{ flex: 1 }}>
          <AppText size={13} weight="600">
            {selectedGym?.name ?? "Choose a branch"}
          </AppText>
          <AppText size={11} muted>
            Select a branch to find its active trainers
          </AppText>
        </View>
        <Feather name="chevron-down" size={17} color={colors.mutedForeground} />
      </Pressable>
      {gymsQuery.isError ? (
        <View style={styles.inlineError}>
          <AppText size={12} color={colors.destructive} style={{ flex: 1 }}>
            Branches could not be loaded.
          </AppText>
          <Pressable onPress={() => void gymsQuery.refetch()}>
            <AppText size={12} weight="700" color={colors.primary}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}
      {selectedGym ? (
        <Pressable
          onPress={() => {
            if (!trainers.length && !trainersQuery.isLoading) return;
            setTrainerPickerOpen(true);
          }}
          style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.elevated, marginTop: 8 }]}
        >
          <View style={{ flex: 1 }}>
            <AppText size={13} weight="600">
              {selectedTrainer?.name ?? "Choose a trainer"}
            </AppText>
            <AppText size={11} muted>
              {trainersQuery.isLoading
                ? "Loading active trainers…"
                : trainers.length
                  ? "Trainer will receive credit on your story"
                  : "No active trainers are available for this branch"}
            </AppText>
          </View>
          {trainersQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Feather name="chevron-down" size={17} color={colors.mutedForeground} />
          )}
        </Pressable>
      ) : null}
      {trainersQuery.isError ? (
        <View style={styles.inlineError}>
          <AppText size={12} color={colors.destructive} style={{ flex: 1 }}>
            Trainers could not be loaded.
          </AppText>
          <Pressable onPress={() => void trainersQuery.refetch()}>
            <AppText size={12} weight="700" color={colors.primary}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        onPress={() => setConsent((value) => !value)}
        style={styles.consentRow}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: consent ? colors.primary : "transparent",
              borderColor: consent ? colors.primary : colors.border,
            },
          ]}
        >
          {consent ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
        </View>
        <AppText size={12} style={{ flex: 1 }}>
          I consent to these photos and my story being shared publicly if approved.
        </AppText>
      </Pressable>

      <Button
        label={isMember ? "Submit for review" : "Sign in to submit"}
        onPress={() => void submit()}
        loading={createPost.isPending}
        disabled={isMember && (!before || !after || !consent)}
        icon="send"
      />

      <BranchPicker
        visible={branchPickerOpen}
        gyms={gymsQuery.data ?? []}
        selectedId={selectedGym?.id ?? null}
        onClose={() => setBranchPickerOpen(false)}
        onSelect={(gym) => {
          setSelectedGym(gym);
          setSelectedTrainerId(null);
          setBranchPickerOpen(false);
        }}
      />
      <Modal
        visible={trainerPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTrainerPickerOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTrainerPickerOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <AppText size={18} weight="700">
                Choose a trainer
              </AppText>
              <Pressable onPress={() => setTrainerPickerOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {trainers.map((trainer) => (
              <Pressable
                key={trainer.id}
                onPress={() => {
                  setSelectedTrainerId(trainer.id);
                  setTrainerPickerOpen(false);
                }}
                style={[styles.choiceRow, { borderBottomColor: colors.border }]}
              >
                <AppText size={14} weight="600" style={{ flex: 1 }}>
                  {trainer.name}
                </AppText>
                {selectedTrainerId === trainer.id ? <Feather name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function CommunityPage() {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn: clerkSignedIn } = useAuth();
  const { isGuest } = useGuest();
  const isMember = !!clerkSignedIn && !isGuest;
  const mineQuery = useListMyCommunityPosts(
    { limit: 50 },
    {
      query: {
        enabled: isMember,
        queryKey: getListMyCommunityPostsQueryKey({ limit: 50 }),
        staleTime: 0,
      },
      request: { cache: "no-store" },
    },
  );
  const withdraw = useWithdrawCommunityPost();

  useFocusEffect(
    useCallback(() => {
      if (isMember) void mineQuery.refetch();
    }, [isMember, mineQuery.refetch]),
  );

  const confirmWithdraw = useCallback(
    (post: CommunityPost) => {
      const action = async () => {
        try {
          await withdraw.mutateAsync({ id: post.id });
          await mineQuery.refetch();
        } catch (error) {
          notify(
            "Could not withdraw",
            error instanceof Error && error.message ? error.message : "Please try again.",
          );
        }
      };
      if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        if (window.confirm("Withdraw this Community submission? It will no longer be reviewed or shown.")) {
          void action();
        }
        return;
      }
      Alert.alert(
        "Withdraw submission?",
        "This removes it from review and it will not be shown in the public Community feed.",
        [
          { text: "Keep it", style: "cancel" },
          { text: "Withdraw", style: "destructive", onPress: () => void action() },
        ],
      );
    },
    [mineQuery, withdraw],
  );

  return (
    <Screen
      contentContainerStyle={styles.pageContent}
      refreshing={mineQuery.isRefetching}
      onRefresh={() => {
        void mineQuery.refetch();
      }}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.elevated }]}
        >
          <Feather name="arrow-left" size={19} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText size={24} weight="700">
            Community
          </AppText>
          <AppText size={13} muted>
            Real stories from Iconic members
          </AppText>
        </View>
      </View>

      <CommunityFeed pagination />

      {isMember ? (
        <CommunityComposer
          onSubmitted={() => {
            void mineQuery.refetch();
          }}
        />
      ) : (
        <View style={[styles.guestSubmitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText size={16} weight="700">
            Have a transformation to share?
          </AppText>
          <AppText size={13} muted style={{ marginTop: 4, marginBottom: 14 }}>
            Sign in as a member to submit your story for review.
          </AppText>
          <Button
            label="Sign in to submit"
            onPress={() => router.push(memberAuthHref("/community"))}
            icon="log-in"
          />
        </View>
      )}

      {isMember ? (
        <View style={styles.mineSection}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flex: 1 }}>
              <AppText size={20} weight="700">
                My submissions
              </AppText>
              <AppText size={12} muted>
                Review status and moderation feedback
              </AppText>
            </View>
            {mineQuery.isFetching ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
          {mineQuery.isError ? (
            <View style={styles.feedMessage}>
              <AppText size={13} muted style={{ flex: 1 }}>
                Your submissions could not be loaded.
              </AppText>
              <Pressable onPress={() => void mineQuery.refetch()}>
                <AppText size={13} weight="700" color={colors.primary}>
                  Retry
                </AppText>
              </Pressable>
            </View>
          ) : mineQuery.isPending ? (
            <View style={styles.feedMessage}>
              <ActivityIndicator color={colors.primary} />
              <AppText size={13} muted>
                Loading your submissions…
              </AppText>
            </View>
          ) : mineQuery.data?.items.length ? (
            mineQuery.data.items.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                privateImages={post.status !== "approved"}
                showStatus
                onWithdraw={
                  post.status === "pending" || post.status === "rejected" || post.status === "approved"
                    ? () => confirmWithdraw(post)
                    : undefined
                }
              />
            ))
          ) : (
            <View style={[styles.noMine, { backgroundColor: colors.elevated }]}>
              <AppText size={13} muted>
                You have not submitted a transformation yet.
              </AppText>
            </View>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  feedSection: { marginTop: 24, gap: 14 },
  communityHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  communityActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  textAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 },
  feedMessage: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  emptyFeed: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  emptyCopy: { textAlign: "center", lineHeight: 18, marginBottom: 6 },
  postCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
    gap: 11,
  },
  postHeader: { flexDirection: "row", alignItems: "center" },
  postAuthor: { flex: 1, marginLeft: 10, gap: 1 },
  postCaption: { lineHeight: 20 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  imagePair: { flexDirection: "row", gap: 7 },
  imageCell: { flex: 1, aspectRatio: 0.92, borderRadius: 13, overflow: "hidden", position: "relative" },
  postImage: { width: "100%", height: "100%" },
  imageFallback: { justifyContent: "center", alignItems: "center" },
  imageLabel: { position: "absolute", left: 7, bottom: 7, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  trainerCredit: { flexDirection: "row", alignItems: "center", gap: 6 },
  rejectionBox: { borderWidth: 1, borderRadius: 10, padding: 10 },
  withdrawButton: { alignSelf: "flex-start", paddingTop: 2 },
  composer: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 28 },
  composerTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  pickerPair: { flexDirection: "row", gap: 9 },
  photoPicker: { flex: 1, aspectRatio: 1, borderRadius: 13, borderWidth: 1, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  pickerImage: { width: "100%", height: "100%" },
  pickerLabel: { position: "absolute", left: 7, bottom: 7, backgroundColor: "rgba(0,0,0,0.64)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  captionInput: { minHeight: 92, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 9, marginTop: 14, textAlignVertical: "top", fontFamily: "Inter_400Regular", fontSize: 13 },
  characterCount: { textAlign: "right", marginTop: 4 },
  selectButton: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  inlineError: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginVertical: 15 },
  checkbox: { width: 21, height: 21, borderWidth: 1.5, borderRadius: 5, justifyContent: "center", alignItems: "center", marginTop: 1 },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  modalSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32, maxHeight: "76%" },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: "#AAB0A7", marginBottom: 16 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  choiceRow: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 10 },
  guestSubmitCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 28 },
  mineSection: { marginTop: 30, gap: 14 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  noMine: { borderRadius: 13, padding: 16, alignItems: "center" },
  pageContent: { paddingTop: 10, paddingBottom: 50 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
});