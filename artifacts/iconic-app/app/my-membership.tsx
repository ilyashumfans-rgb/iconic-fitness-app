import { useAuth } from "@clerk/expo";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  getGetMyMembershipQueryKey,
  useGetMe,
  useGetMyMembership,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { MemberMobileVerify } from "@/components/MemberMobileVerify";
import { MembershipStatusCard } from "@/components/MembershipStatusCard";
import { Screen } from "@/components/Screen";
import { ErrorView, LoadingView } from "@/components/ui-bits";
import { istDateStr, istToday } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";
import { memberAuthHref } from "@/lib/memberAuth";

const PAGE_BACKGROUND = "#06110F";
const LIST_BACKGROUND = "#0D1A19";
const LIST_BORDER = "rgba(220, 255, 240, 0.17)";
const WHITE = "#F7FAF8";
const MUTED_WHITE = "rgba(247, 250, 248, 0.7)";
const GOLD = "#FFD37A";
const GREEN = "#78F51B";

function istDateLabel(isoStr: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoStr)
    ? new Date(`${isoStr}T12:00:00Z`)
    : new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type MembershipRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
};

export default function MyMembershipScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [manageOpen, setManageOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);

  const myMembershipQuery = useGetMyMembership({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMyMembershipQueryKey(),
    },
  });

  const meQuery = useGetMe({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetMeQueryKey(),
    },
  });

  const membership = myMembershipQuery.data;
  const isSettled = isLoaded && !!isSignedIn && myMembershipQuery.isSuccess;
  const expiry = membership?.renewsOn ? new Date(membership.renewsOn) : null;
  const expiryValid = expiry !== null && !Number.isNaN(expiry.getTime());
  const expiryKnown = membership?.expiryKnown !== false;
  const isExpired =
    !!membership &&
    (membership.status === "expired" ||
      (expiryKnown &&
        expiry !== null &&
        expiryValid &&
        istDateStr(expiry) < istToday()));
  const statusLabel = !membership
    ? "No plan linked"
    : isExpired
      ? "Expired"
      : membership.status === "paused"
        ? "Paused"
        : "Active";

  // Membership is an account view, not a sales route. Signed-out users still
  // receive the normal auth guard, while active, expired, and no-plan members
  // all remain on this screen.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(memberAuthHref("/my-membership"));
    }
  }, [isLoaded, isSignedIn, router]);

  if (myMembershipQuery.isError && isSignedIn) {
    return (
      <Screen>
        <ErrorView onRetry={() => void myMembershipQuery.refetch()} />
      </Screen>
    );
  }
  if (!isSettled || !isSignedIn) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  const expiryLabel =
    membership && expiryKnown && expiryValid
      ? istDateLabel(membership.renewsOn)
      : "Expiry not provided";
  const expiryHeading = isExpired ? "EXPIRED ON" : "VALID TILL";
  const registeredMobile = meQuery.data?.mobile?.trim() ?? "";
  const centerRoute =
    membership?.homeGymId !== null && membership?.homeGymId !== undefined
      ? (`/gym/${membership.homeGymId}` as const)
      : ("/gyms" as const);
  const centerLabel = "My Branch";

  const rows: MembershipRow[] = [
    {
      icon: "home",
      label: centerLabel,
      onPress: () => router.push(centerRoute),
    },
    {
      icon: "users",
      label: "Group Classes",
      onPress: () => router.push("/classes"),
    },
    {
      icon: "clipboard",
      label: "Personalized Workout Plans",
      onPress: () => router.push("/workouts"),
    },
    {
      icon: "heart",
      label: "Nutrition Guidance",
      onPress: () => router.push("/diet"),
    },
    {
      icon: "shopping-bag",
      label: "Member Store",
      onPress: () => router.push("/(tabs)/store"),
    },
    {
      icon: "plus-circle",
      label: "Freeze Membership",
      onPress: () => setFreezeOpen(true),
    },
  ];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(
              insets.top,
              Platform.OS === "web" ? 12 : 8,
            ),
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="chevron-left" size={28} color={WHITE} />
          </Pressable>
          <AppText weight="500" size={25} color={WHITE}>
            My Membership
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push("/profile")}
          accessibilityLabel="Settings"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="settings" size={30} color={WHITE} />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={myMembershipQuery.isRefetching}
            onRefresh={() => void myMembershipQuery.refetch()}
            tintColor={GREEN}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {membership ? (
          <MembershipStatusCard
            membership={membership}
            memberName={meQuery.data?.name ?? ""}
            memberPhotoUrl={resolveImageUrl(meQuery.data?.avatarUrl)}
            onManage={() => setManageOpen(true)}
            embedded
          />
        ) : (
          <NoLinkedMembershipCard
            expiryHeading={expiryHeading}
            expiryLabel={expiryLabel}
            statusLabel={statusLabel}
            isExpired={isExpired}
          />
        )}

        <View style={styles.menuCard}>
          {rows.map((row, index) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={row.onPress}
              style={({ pressed }) => [
                styles.menuRow,
                index < rows.length - 1 && styles.menuRowBorder,
                pressed && styles.menuRowPressed,
              ]}
            >
              <View style={styles.menuIcon}>
                <Feather name={row.icon} size={27} color={WHITE} />
              </View>
              <AppText
                weight="400"
                size={18}
                color={WHITE}
                numberOfLines={1}
                style={styles.menuLabel}
              >
                {row.label}
              </AppText>
              <Feather name="chevron-right" size={29} color={WHITE} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setManageOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Manage Membership"
          style={({ pressed }) => [
            styles.manageButton,
            pressed && styles.manageButtonPressed,
          ]}
        >
          <AppText weight="700" size={20} color="#071108">
            Manage Membership
          </AppText>
        </Pressable>
      </ScrollView>

      <Modal
        visible={manageOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setManageOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrim}
            onPress={() => setManageOpen(false)}
            accessibilityLabel="Close manage membership"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <SheetHeader
              title="Manage Membership"
              onClose={() => setManageOpen(false)}
            />
            <AppText size={13} color={MUTED_WHITE} style={styles.sheetIntro}>
              Update your linked gym membership using the number registered at
              your branch.
            </AppText>
            {meQuery.isPending ? (
              <LoadingView />
            ) : (
              <MemberMobileVerify
                key={registeredMobile}
                initialMobile={registeredMobile}
                syncMode
                onSynced={() => setManageOpen(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={freezeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFreezeOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrim}
            onPress={() => setFreezeOpen(false)}
            accessibilityLabel="Close freeze information"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <SheetHeader
              title="Freeze Membership"
              onClose={() => setFreezeOpen(false)}
            />
            <AppText size={15} color={WHITE} style={styles.freezeMessage}>
              Freeze requests need approval through your branch. We have not
              submitted a freeze request from the app.
            </AppText>
            <Pressable
              onPress={() => {
                setFreezeOpen(false);
                router.push(centerRoute);
              }}
              style={styles.sheetAction}
              accessibilityRole="button"
            >
              <Feather name="map-pin" size={18} color="#071108" />
              <AppText weight="700" size={14} color="#071108">
                View branch contact
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NoLinkedMembershipCard({
  planName,
  expiryHeading,
  expiryLabel,
  statusLabel,
  isExpired,
}: {
  planName?: string;
  expiryHeading: string;
  expiryLabel: string;
  statusLabel: string;
  isExpired: boolean;
}) {
  return (
    <LinearGradient
      colors={["#248A0D", "#0A280F", "#4CCB18"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.membershipCard}
    >
      <View style={styles.brandRow}>
        <ExpoImage
          source={require("@/assets/images/auth-logo-mark.png")}
          style={styles.brandMark}
          contentFit="contain"
          accessibilityLabel="Iconic Fitness logo mark"
        />
        <View style={styles.wordmark} accessibilityLabel="Iconic Fitness">
          <AppText weight="500" size={37} color="#FFFFFF" style={styles.iconicWord}>
            iconic
          </AppText>
          <AppText weight="500" size={17} color="#65E92C" style={styles.fitnessWord}>
            FITNESS
          </AppText>
          <AppText size={11} color="#FFFFFF" style={styles.tagline}>
            The Fitness Company
          </AppText>
        </View>
        <FontAwesome5 name="crown" size={48} color={GOLD} solid />
      </View>

      <View style={styles.cardFooter}>
        <AppText
          weight="700"
          size={19}
          color={GOLD}
          numberOfLines={1}
          style={styles.planName}
        >
          {planName ? planName.toUpperCase() : "NO PLAN LINKED"}
        </AppText>
        <AppText size={17} color={WHITE} style={styles.expiryText}>
          {expiryHeading === "VALID TILL" ? "Valid till " : "Expired on "}
          {expiryLabel}
        </AppText>
      </View>

      <View
        style={[
          styles.statusBadge,
          isExpired ? styles.expiredBadge : styles.activeBadge,
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isExpired ? "#FF9B7A" : GREEN },
          ]}
        />
        <AppText
          weight="700"
          size={11}
          color={isExpired ? "#FFE0D8" : "#E6FFDD"}
        >
          {statusLabel}
        </AppText>
      </View>
    </LinearGradient>
  );
}

function SheetHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.sheetHeader}>
      <AppText weight="700" size={20} color={WHITE}>
        {title}
      </AppText>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Close ${title}`}
      >
        <Feather name="x" size={24} color={WHITE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 13,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 30,
    height: 36,
    justifyContent: "center",
    marginRight: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 13,
    paddingTop: 1,
    gap: 16,
  },
  membershipCard: {
    width: "100%",
    aspectRatio: 560 / 344,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(93, 239, 38, 0.58)",
    shadowColor: "#41C91B",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 118,
  },
  brandMark: {
    width: 116,
    height: 108,
    marginLeft: -4,
  },
  wordmark: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginLeft: -4,
  },
  iconicWord: {
    lineHeight: 39,
    letterSpacing: -1.8,
  },
  fitnessWord: {
    lineHeight: 19,
    letterSpacing: 4.3,
    marginLeft: 4,
  },
  tagline: {
    lineHeight: 14,
    marginTop: 5,
  },
  cardFooter: {
    alignItems: "flex-start",
    paddingLeft: 12,
    paddingBottom: 2,
  },
  planName: {
    letterSpacing: 0.3,
  },
  expiryText: {
    marginTop: 8,
  },
  statusBadge: {
    position: "absolute",
    right: 18,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadge: {
    borderColor: "rgba(120, 245, 27, 0.65)",
    backgroundColor: "rgba(4, 28, 10, 0.62)",
  },
  expiredBadge: {
    borderColor: "rgba(255, 155, 122, 0.65)",
    backgroundColor: "rgba(55, 19, 12, 0.7)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  menuCard: {
    width: "100%",
    aspectRatio: 560 / 440,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: LIST_BORDER,
    backgroundColor: LIST_BACKGROUND,
    overflow: "hidden",
  },
  menuRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 21,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(220, 255, 240, 0.16)",
  },
  menuRowPressed: {
    backgroundColor: "rgba(120, 245, 27, 0.09)",
  },
  menuIcon: {
    width: 51,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    paddingRight: 8,
  },
  manageButton: {
    width: "100%",
    aspectRatio: 560 / 105,
    minHeight: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    shadowColor: "#63E91B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  manageButtonPressed: {
    backgroundColor: "#62D814",
    transform: [{ scale: 0.985 }],
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  sheet: {
    backgroundColor: "#10201D",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: "rgba(120, 245, 27, 0.25)",
    gap: 13,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetIntro: {
    lineHeight: 19,
  },
  freezeMessage: {
    lineHeight: 22,
  },
  sheetAction: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 3,
  },
});