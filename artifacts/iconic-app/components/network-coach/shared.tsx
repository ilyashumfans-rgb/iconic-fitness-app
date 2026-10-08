import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/images";

/** All Network Coach times are shown in IST regardless of device timezone. */
const IST = "Asia/Kolkata";
export const istDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
export const istTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
export const istDayKey = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "muted" | "bad" }> = {
  held: { label: "Awaiting payment", tone: "warn" },
  paid: { label: "Confirmed", tone: "ok" },
  completed: { label: "Completed", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "muted" },
  expired: { label: "Hold expired", tone: "muted" },
  payment_failed: { label: "Payment failed", tone: "bad" },
  paid_conflict: { label: "Paid · slot unavailable", tone: "bad" },
};

export function StatusPill({ status, refund }: { status: string; refund?: string | null }) {
  const c = useColors();
  const s = STATUS[status] ?? { label: status, tone: "muted" as const };
  const color = s.tone === "ok" ? c.primary : s.tone === "warn" ? c.warning : s.tone === "bad" ? c.destructive : c.mutedForeground;
  const text = refund === "pending_admin" ? `${s.label} · refund pending admin` : refund === "refunded_manual" ? `${s.label} · refunded` : s.label;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText size={11} weight="700" color={color}>{text}</AppText>
    </View>
  );
}

/** Compact 44px avatar — deliberately small; this category never shows big trainer photos. */
export function CoachAvatar({ name, photoUrl, size = 44 }: { name: string; photoUrl?: string | null; size?: number }) {
  const c = useColors();
  const initials = name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const uri = photoUrl ? resolveImageUrl(photoUrl) : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: c.elevated, borderWidth: 1.5, borderColor: c.primary, alignItems: "center", justifyContent: "center" }}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" /> : <AppText weight="700" size={size * 0.36} color={c.primary}>{initials}</AppText>}
    </View>
  );
}

export function PrivacyNotice({ compact, audience = "member" }: { compact?: boolean; audience?: "member" | "staff" }) {
  const c = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: c.card, borderColor: c.warning }]} testID="privacy-warning" accessibilityRole="alert">
      <Feather name="shield" size={compact ? 14 : 16} color={c.warning} />
      <AppText size={compact ? 11 : 12.5} style={{ flex: 1, lineHeight: compact ? 15 : 18 }}>
        <AppText weight="700" size={compact ? 11 : 12.5}>Keep it in the app. </AppText>
        Don't share phone numbers, email, social handles, addresses or payment details with {audience === "staff" ? "members" : "your coach"}. All bookings and payments happen only through Iconic.
      </AppText>
    </View>
  );
}

export function BackHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainers"))} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}
        style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border }}>
        <Feather name="arrow-left" size={20} color={c.foreground} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <AppText weight="700" size={21} numberOfLines={1} accessibilityRole="header">{title}</AppText>
        {subtitle ? <AppText muted size={12.5} numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

export const errorText = (e: unknown) => (e as { data?: { error?: string } } | null)?.data?.error ?? (e instanceof Error ? e.message : "Something went wrong. Please try again.");

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  notice: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: "flex-start" },
});
