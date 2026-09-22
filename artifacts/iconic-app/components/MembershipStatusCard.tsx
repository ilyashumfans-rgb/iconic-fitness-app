import { Feather } from "@expo/vector-icons";
import type { MyMembership } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/AppText";
import { useProfilePhotoUpload } from "@/components/ProfilePhotoPicker";
import { useColors } from "@/hooks/useColors";
import { istDateLabel, istDateStr } from "@/lib/dates";
import { resolveImageUrl } from "@/lib/images";

const EXPIRY_SOON_DAYS = 7;

const CARD_SHADOW = Platform.select({
  web: { boxShadow: "0 14px 34px rgba(0,0,0,0.30)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
}) as ViewStyle;

/** Whole IST calendar days from today until `dateIso` (negative = past). */
function daysUntilIst(dateIso: string): number {
  const today = Date.parse(`${istDateStr()}T00:00:00Z`);
  const target = Date.parse(`${istDateStr(new Date(dateIso))}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

function getPremiumColors(colors: any) {
  const isDark = colors.background === "#000000" || colors.background === "#121212";
  return {
    bgTop: isDark ? "#1A1A1C" : colors.card,
    bgBottom: isDark ? "#050505" : colors.secondary,
    gold: colors.primary,
    goldDeep: colors.primaryGradient[1],
    hairline: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    text: colors.foreground,
    faint: colors.mutedForeground,
  };
}

export function MembershipStatusCard({
  membership,
  memberName,
  memberPhotoUrl,
  onManage,
  embedded = false,
  compact = false,
  greeting,
  footer,
}: {
  membership: MyMembership;
  memberName: string;
  /** The member's own uploaded profile photo (preferred over the gym record photo). */
  memberPhotoUrl?: string | null;
  /** Opens the membership sync/manage action rather than a sales flow. */
  onManage: () => void;
  /** Remove the outer spacing when a parent already controls card spacing. */
  embedded?: boolean;
  /** Denser Home presentation; the full membership screen stays unchanged. */
  compact?: boolean;
  greeting?: string;
  footer?: ReactNode;
}) {
  const colors = useColors();
  const PREMIUM = getPremiumColors(colors);
  const isLightTheme = colors.background !== "#000000";
  // When the gym system reported no expiry date, renewsOn is a placeholder —
  // never show urgency or a renewal push off the back of it.
  const expiryKnown = membership.expiryKnown !== false;
  const days = daysUntilIst(membership.renewsOn);
  const isExpired =
    membership.status === "expired" || (expiryKnown && days < 0);
  const expiringSoon =
    expiryKnown &&
    !isExpired &&
    membership.status === "active" &&
    days <= EXPIRY_SOON_DAYS;
  const needsRenewal = isExpired || expiringSoon;
  const alertColor = isExpired
    ? isLightTheme
      ? "#C93D3D"
      : "#FF6B6B"
    : isLightTheme
      ? "#B85F00"
      : "#FFB020";
  const expiryLabel = expiryKnown
    ? istDateLabel(istDateStr(new Date(membership.renewsOn)))
    : "—";
  const sinceLabel = membership.startedOn
    ? istDateLabel(membership.startedOn)
    : null;

  const photo = useProfilePhotoUpload();
  const membershipPhotoUrl = resolveImageUrl(membership.photoUrl);
  const initials = (memberName || "M")
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const renewLabel = "Sync membership";

  return (
    <View
      style={[
        styles.premiumWrap,
        CARD_SHADOW,
        embedded ? { marginBottom: 0 } : null,
      ]}
    >
      <LinearGradient
        colors={[PREMIUM.bgTop, PREMIUM.bgBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.premiumCard, { borderColor: PREMIUM.hairline }]}
      >
        {/* Gold sheen sweeping the top edge */}
        <LinearGradient
          colors={[
            "transparent",
            PREMIUM.gold +
              (colors.background === "#000000" || colors.background === "#121212"
                ? "2E"
                : "15"),
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.4 }}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        />

        {greeting ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: compact ? 6 : 16 }}>
          <AppText weight="700" size={compact ? 17 : 20} style={{ flex: 1 }}>
            {greeting}
          </AppText>
          {compact ? (
            <AppText size={10} weight="700" color={needsRenewal ? alertColor : PREMIUM.gold}
              style={{ textTransform: "capitalize", paddingHorizontal: 9, paddingVertical: 4,
                borderRadius: 999, backgroundColor: PREMIUM.hairline }}>
              {membership.status}
            </AppText>
          ) : null}
          </View>
        ) : null}
        {!compact ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="award" size={14} color={PREMIUM.gold} />
          <AppText
            size={11}
            weight="700"
            color={PREMIUM.gold}
            style={{ letterSpacing: 2.4, flexShrink: 1 }}
            numberOfLines={1}
          >
            {membership.planName || "MEMBERSHIP"}
          </AppText>
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.premiumBadge,
              {
                borderColor: needsRenewal ? alertColor : PREMIUM.hairline,
                backgroundColor: needsRenewal
                  ? alertColor + "22"
                  : "rgba(255,255,255,0.06)",
              },
            ]}
          >
            <AppText
              size={11}
              weight="700"
              color={needsRenewal ? alertColor : PREMIUM.gold}
              style={{ textTransform: "capitalize" }}
            >
              {membership.status}
            </AppText>
          </View>
        </View> : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: compact ? 2 : 10,
          }}
        >
          {/* Tappable avatar: Camera / Gallery chooser to change the photo */}
          <Pressable
            onPress={photo.busy ? undefined : photo.choosePhoto}
            style={[styles.premiumAvatarRing, { borderColor: PREMIUM.gold },
              compact ? { width: 44, height: 44, borderRadius: 22 } : null]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            {photo.localUrl || memberPhotoUrl || membershipPhotoUrl ? (
              <Image
                source={{
                  uri:
                    photo.localUrl ||
                    memberPhotoUrl ||
                    membershipPhotoUrl ||
                    undefined,
                }}
                style={[styles.premiumAvatar, compact ? { width: 38, height: 38, borderRadius: 19 } : null]}
                accessibilityLabel={`${memberName || "Member"}'s photo`}
              />
            ) : (
              <View
                style={[
                  styles.premiumAvatar,
                  compact ? { width: 38, height: 38, borderRadius: 19 } : null,
                  {
                    backgroundColor: PREMIUM.hairline,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <AppText weight="700" size={16} color={PREMIUM.gold}>
                  {initials}
                </AppText>
              </View>
            )}
            {photo.busy ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: 27,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : (
              <View
                style={[
                  styles.premiumAvatarCamBadge,
                  { backgroundColor: PREMIUM.gold },
                ]}
              >
                <Feather name="camera" size={10} color="#0B0B0F" />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText
              weight="700"
              size={compact ? 14 : 16}
              color={PREMIUM.text}
              numberOfLines={1}
            >
              {memberName || "Iconic Member"}
            </AppText>
            <AppText
              size={compact ? 11 : 12}
              color={PREMIUM.faint}
              style={{ marginTop: 1 }}
              numberOfLines={1}
            >
              {membership.planName}
            </AppText>
            {(
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 3,
                }}
              >
                <Feather name="map-pin" size={11} color={PREMIUM.faint} />
                <AppText size={11} color={PREMIUM.faint} numberOfLines={1}>
                  {membership.branchName ? `Branch: ${membership.branchName}` : "Branch not available"}
                </AppText>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.premiumDivider, { backgroundColor: PREMIUM.hairline },
          compact ? { marginVertical: 8 } : null]} />

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            <AppText size={10} color={PREMIUM.faint} style={{ letterSpacing: 0.8 }}>
              VALID FROM
            </AppText>
            <AppText
              weight="700"
              size={13}
              color={PREMIUM.text}
              style={{ marginTop: 3 }}
            >
              {sinceLabel ?? "—"}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText size={10} color={PREMIUM.faint} style={{ letterSpacing: 0.8 }}>
              {isExpired ? "EXPIRED ON" : "VALID TILL"}
            </AppText>
            <AppText
              weight="700"
              size={13}
              color={needsRenewal ? alertColor : PREMIUM.text}
              style={{ marginTop: 3 }}
            >
              {expiryLabel}
            </AppText>
          </View>
          {!isExpired && expiryKnown ? (
            <View style={{ alignItems: "flex-end" }}>
              <AppText size={10} color={PREMIUM.faint} style={{ letterSpacing: 0.8 }}>
                DAYS LEFT
              </AppText>
              <AppText
                weight="700"
                size={13}
                color={expiringSoon ? alertColor : PREMIUM.gold}
                style={{ marginTop: 3 }}
              >
                {Math.max(days, 0)}
              </AppText>
            </View>
          ) : null}
        </View>

        {needsRenewal ? (
          <>
            <View
              style={[
                styles.premiumRenewStrip,
                { borderColor: alertColor, backgroundColor: alertColor + "1C" },
              ]}
            >
              <Feather name="alert-triangle" size={14} color={alertColor} />
              <AppText size={12} weight="700" color={alertColor} style={{ flex: 1 }}>
                {isExpired
                  ? `Expired on ${expiryLabel} — renew to keep access`
                  : days <= 0
                    ? "Expires today — renew to stay active"
                    : `Expiring in ${days} day${days === 1 ? "" : "s"}`}
              </AppText>
            </View>
            <Pressable
              onPress={onManage}
              accessibilityRole="button"
              accessibilityLabel={`${renewLabel}; sync membership`}
            >
              {({ pressed }) => (
                <LinearGradient
                  colors={[PREMIUM.gold, PREMIUM.goldDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.premiumRenewBtn,
                    {
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Feather name="credit-card" size={14} color="#100E07" />
                  <AppText weight="700" size={14} color="#100E07">
                    {renewLabel}
                  </AppText>
                </LinearGradient>
              )}
            </Pressable>
            <AppText
              size={10}
              color={PREMIUM.faint}
              style={{ textAlign: "center", marginTop: 8 }}
            >
              Sync your latest membership status
            </AppText>
          </>
        ) : null}
        {footer}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  premiumWrap: {
    marginBottom: 12,
    borderRadius: 20,
  },
  premiumCard: {
    borderRadius: 20,
    overflow: "hidden",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  premiumBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  premiumAvatarCamBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumAvatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  premiumDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 12,
  },
  premiumRenewStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  premiumRenewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    paddingVertical: 11,
  },
});