import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import { ThemeContext } from "@/hooks/useTheme";
import { websiteUrl } from "@/lib/links";
import {
  clearStaffProfile,
  loadStaffProfile,
  staffFetch,
  type StaffProfile,
} from "@/lib/staffSession";

const FORCE_DARK = {
  mode: "dark" as const,
  scheme: "dark" as const,
  setMode: () => {},
  toggle: () => {},
};

/** Human-friendly labels for staff permission keys. */
const PERMISSION_LABELS: Record<string, string> = {
  "partner.view": "View partners",
  "partner.onboard": "Partner onboarding",
  "partner.assign_login": "Assign partner logins",
  "partner.document_upload": "Partner documents",
  "gym.manage": "Gym management",
  "lead.manage": "Leads & enquiries",
  "blog.manage": "Blogs",
  "ticket.manage": "Support tickets",
};

export default function StaffHomeScreen() {
  return (
    <ThemeContext.Provider value={FORCE_DARK}>
      <StaffHomeContent />
    </ThemeContext.Provider>
  );
}

function StaffHomeContent() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  // Verify the session against the server; a dead/expired cookie bounces
  // back to the studio login screen instead of showing stale data.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadStaffProfile();
      if (!cancelled && stored) setProfile(stored);
      try {
        const res = await staffFetch("/staff/me");
        if (cancelled) return;
        if (res.ok) {
          const fresh = (await res.json()) as StaffProfile;
          setProfile(fresh);
        } else if (res.status === 401 || res.status === 403) {
          await clearStaffProfile();
          router.replace("/(auth)/staff-login");
          return;
        } else if (!stored) {
          // Server error with nothing cached — never render a blank screen.
          router.replace("/(auth)/staff-login");
          return;
        }
        // Network/server hiccup with a stored profile: keep showing it.
      } catch {
        if (!stored && !cancelled) {
          router.replace("/(auth)/staff-login");
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onLogout = useCallback(async () => {
    setBusy(true);
    try {
      await staffFetch("/staff/logout", { method: "POST" }).catch(() => null);
    } finally {
      await clearStaffProfile();
      setBusy(false);
      router.replace("/(auth)/welcome");
    }
  }, [router]);

  if (checking && !profile) {
    return (
      <View
        style={[
          styles.flex,
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) return null;

  const perms = profile.permissions ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 44) + 8,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          paddingHorizontal: 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppText
          size={12}
          weight="700"
          color={colors.primary}
          style={styles.eyebrow}
        >
          STUDIO TEAM
        </AppText>

        {/* Identity card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: "rgba(11,230,7,0.12)" },
            ]}
          >
            <AppText weight="700" size={22} color={colors.primary}>
              {initials(profile.name)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="700" size={18}>
              {profile.name}
            </AppText>
            <AppText size={13} color={colors.mutedForeground}>
              {profile.email}
            </AppText>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: "rgba(11,230,7,0.12)" },
            ]}
          >
            <AppText weight="700" size={11} color={colors.primary}>
              STAFF
            </AppText>
          </View>
        </View>

        {/* Access summary */}
        <View
          style={[
            styles.card,
            styles.cardColumn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <AppText weight="700" size={15}>
            Your access
          </AppText>
          {perms.length === 0 ? (
            <AppText size={13} color={colors.mutedForeground}>
              No portal permissions assigned yet. Ask an admin to grant you
              access from the web dashboard.
            </AppText>
          ) : (
            perms.map((p) => (
              <View key={p} style={styles.permRow}>
                <Feather name="check-circle" size={16} color={colors.primary} />
                <AppText size={14}>{PERMISSION_LABELS[p] ?? p}</AppText>
              </View>
            ))
          )}
        </View>

        {/* Open the full staff portal in the browser */}
        <View
          style={[
            styles.card,
            styles.cardColumn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <AppText weight="700" size={15}>
            Staff portal
          </AppText>
          <AppText size={13} color={colors.mutedForeground}>
            Leads, GX bookings, partner onboarding and the rest of the staff
            tools live in the web portal.
          </AppText>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/web",
                params: { url: `${websiteUrl}/staff/login`, title: "Staff Portal" },
              })
            }
            style={({ pressed }) => [
              styles.portalBtn,
              {
                borderColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="external-link" size={16} color={colors.primary} />
            <AppText weight="700" size={14} color={colors.primary}>
              Open staff portal
            </AppText>
          </Pressable>
        </View>

        <Button
          label="Log out of studio"
          onPress={onLogout}
          loading={busy}
          variant="secondary"
          size="lg"
        />
      </ScrollView>
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  eyebrow: { letterSpacing: 3 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  cardColumn: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  portalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
});
