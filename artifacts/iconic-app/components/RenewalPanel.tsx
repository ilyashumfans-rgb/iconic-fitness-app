import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  getGetMeQueryKey,
  useGetMe,
  getGetMyMembershipQueryKey,
  getGetMyRenewalStatusQueryKey,
  getGetPackageBookingQueryKey,
  getListMembershipPackagesQueryKey,
  useCreateMembershipRenewal,
  useGetPackageBooking,
  useListMembershipPackages,
  type MembershipRenewalInfo,
  type PtRenewalInfo,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { submitLead } from "@/lib/leads";
import { openPayment } from "@/lib/links";
import { enablePushForAccount, pushCapable } from "@/lib/pushRegistration";

// Palette shared with my-membership.tsx (deep pine + lime + brass).
const C = {
  panel: "#0D1A19",
  border: "rgba(220, 255, 240, 0.17)",
  text: "#F7FAF8",
  muted: "rgba(247, 250, 248, 0.66)",
  faint: "rgba(247, 250, 248, 0.42)",
  lime: "#78F51B",
  ink: "#071108",
  gold: "#FFD37A",
  coral: "#FF9B7A",
  sheet: "#10201D",
};

function dateLabel(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function inr(n: number): string {
  return `\u20B9${Math.round(n).toLocaleString("en-IN")}`;
}

type Checkout = { id: number; token: string | null; url: string; mode: "renew" | "upgrade" };

// ─── Small building blocks ──────────────────────────────────────────────────

function Eyebrow({ children, color = C.faint }: { children: string; color?: string }) {
  return (
    <AppText weight="700" size={11} color={color} style={{ letterSpacing: 1.6 }}>
      {children}
    </AppText>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.stat}>
      <AppText weight="700" size={22} color={accent ?? C.text}>
        {value}
      </AppText>
      <AppText size={11} color={C.muted} style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

function ActionButton({
  label,
  sub,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  variant?: "primary" | "outline";
  icon: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
}) {
  const primary = variant === "primary";
  const fg = primary ? C.ink : C.gold;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        primary ? s.actionPrimary : s.actionOutline,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Feather name={icon} size={18} color={fg} />}
      <View style={{ flexShrink: 1 }}>
        <AppText weight="700" size={15} color={fg}>
          {label}
        </AppText>
        {sub ? (
          <AppText size={11} color={primary ? "rgba(7,17,8,0.7)" : C.muted}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function Notice({ icon, tone, title, body }: { icon: keyof typeof Feather.glyphMap; tone: string; title: string; body?: string }) {
  return (
    <View style={[s.notice, { borderColor: `${tone}55` }]}>
      <Feather name={icon} size={18} color={tone} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <AppText weight="700" size={14} color={C.text}>
          {title}
        </AppText>
        {body ? (
          <AppText size={12} color={C.muted} style={{ marginTop: 3, lineHeight: 17 }}>
            {body}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

// ─── Membership renewal ─────────────────────────────────────────────────────

export function MembershipRenewalSection({
  info,
  milestones,
  onRefresh,
  pushSupported,
  pushRegistered,
}: {
  info: MembershipRenewalInfo;
  milestones: number[];
  onRefresh: () => void;
  pushSupported: boolean;
  pushRegistered: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createRenewal = useCreateMembershipRenewal();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const guard = useRef(false);

  const pollParams = checkout?.token ? { token: checkout.token } : undefined;
  const statusQuery = useGetPackageBooking(checkout?.id ?? 0, pollParams, {
    query: {
      enabled: checkout !== null,
      queryKey: getGetPackageBookingQueryKey(checkout?.id ?? 0, pollParams),
      refetchInterval: (q) => (q.state.data?.status === "pending" ? 4000 : false),
    },
  });
  const liveStatus = checkout ? statusQuery.data?.status : undefined;

  useEffect(() => {
    if (liveStatus === "paid" || liveStatus === "failed") {
      void queryClient.invalidateQueries({ queryKey: getGetMyRenewalStatusQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetMyMembershipQueryKey() });
    }
  }, [liveStatus, queryClient]);

  async function start(mode: "renew" | "upgrade", packageId?: number) {
    if (guard.current) return;
    guard.current = true;
    setError(null);
    try {
      const created = await createRenewal.mutateAsync({
        data: { mode, ...(packageId ? { packageId } : {}) },
      });
      setCheckout({ id: created.id, token: created.token ?? null, url: created.paymentUrl, mode });
      setUpgradeOpen(false);
      await openPayment(created.paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment. Please try again.");
    } finally {
      guard.current = false;
    }
  }

  const r = info.renewal;
  // Server evidence wins; the local poll only fills the gap until refetch.
  const paid = r.status === "paid" || liveStatus === "paid";
  const pending = !paid && (liveStatus === "pending" || (checkout === null && r.status === "pending"));
  const failed = !paid && liveStatus === "failed";
  const expiryText = dateLabel(info.expiryDate);
  const nextText = dateLabel(info.nextStartDate);
  const daysLeft = info.daysLeft;

  const headline =
    info.source === "none"
      ? "No plan linked"
      : info.expired
        ? `Expired on ${expiryText}`
        : daysLeft === null
          ? "Expiry not provided"
          : daysLeft === 0
            ? "Expires today"
            : daysLeft === 1
              ? "Expires tomorrow"
              : `${daysLeft} days left`;

  return (
    <View style={s.panel}>
      <View style={s.panelHead}>
        <View style={{ flex: 1 }}>
          <Eyebrow color={info.eligible && !paid ? C.lime : C.faint}>RENEW OR UPGRADE</Eyebrow>
          <AppText weight="700" size={22} color={info.expired ? C.coral : C.text} style={{ marginTop: 6 }}>
            {headline}
          </AppText>
          {info.planName ? (
            <AppText size={13} color={C.muted} style={{ marginTop: 3 }} numberOfLines={1}>
              {info.planName}
              {!info.expired && expiryText ? ` \u00B7 valid till ${expiryText}` : ""}
            </AppText>
          ) : null}
        </View>
        {info.eligible && !paid && daysLeft !== null ? <WindowMeter daysLeft={daysLeft} /> : null}
      </View>

      {paid ? (
        <Notice
          icon="check-circle"
          tone={C.lime}
          title="Renewal complete"
          body={
            (r.startDate ?? info.nextStartDate) && (r.startsInFuture || r.status !== "paid")
              ? `${r.packageName || "Your new plan"} starts on ${dateLabel(r.startDate ?? info.nextStartDate)}. Your current plan runs until then.`
              : `${r.packageName || "Your new plan"} is now active.`
          }
        />
      ) : pending ? (
        <View style={{ gap: 10 }}>
          <Notice
            icon="clock"
            tone={C.gold}
            title="Payment not confirmed yet"
            body="We'll show the renewal as complete only once the payment is confirmed by the gym's billing system."
          />
          <View style={s.row}>
            {checkout ? (
              <ActionButton icon="external-link" variant="outline" label="Open payment" onPress={() => void openPayment(checkout.url).catch((e) => setError(e instanceof Error ? e.message : "Could not open payment"))} />
            ) : null}
            <ActionButton
              icon="refresh-cw"
              variant="outline"
              label="Check status"
              loading={statusQuery.isFetching}
              onPress={() => {
                if (checkout) void statusQuery.refetch();
                onRefresh();
              }}
            />
          </View>
          {info.canRenewOnline && checkout === null ? (
            <AppText size={12} color={C.faint}>
              Abandoned the payment? You can start again below.
            </AppText>
          ) : null}
        </View>
      ) : null}

      {failed ? <Notice icon="x-circle" tone={C.coral} title="Payment failed" body="No renewal was recorded. You can try again." /> : null}

      {info.expired ? (
        <View style={{ gap: 10 }}>
          <AppText size={13} color={C.muted} style={{ lineHeight: 19 }}>
            Renewal closes once a plan expires. Pick a fresh plan for your branch instead.
          </AppText>
          <ActionButton
            icon="shopping-bag"
            label="Buy a new plan"
            onPress={() =>
              router.push(info.gymId ? { pathname: "/book-package", params: { gymId: String(info.gymId) } } : "/book-package")
            }
          />
        </View>
      ) : !paid && (info.canRenewOnline && (!pending || checkout === null)) ? (
        <View style={{ gap: 10 }}>
          <View style={s.row}>
            <ActionButton
              icon="repeat"
              label="Renew"
              sub={nextText ? `Same plan, from ${nextText}` : "Same plan"}
              loading={createRenewal.isPending && !upgradeOpen}
              onPress={() => void start("renew")}
            />
            <ActionButton icon="trending-up" variant="outline" label="Upgrade" sub="Choose a bigger plan" onPress={() => setUpgradeOpen(true)} />
          </View>
          <AppText size={11} color={C.faint} style={{ lineHeight: 16 }}>
            Available any time before your plan expires. Both start the day after your current plan ends, so no days are lost. Upgrades are charged at the new plan&apos;s full price.
          </AppText>
        </View>
      ) : !paid && !pending && info.unavailableReason ? (
        <AppText size={13} color={C.muted} style={{ lineHeight: 19 }}>
          {info.unavailableReason}
        </AppText>
      ) : null}

      {error ? (
        <AppText size={13} color={C.coral}>
          {error}
        </AppText>
      ) : null}

      {info.source !== "none" && !info.expired && !paid ? (
        <View style={s.reminderLine}>
          <Feather name="bell" size={13} color={C.faint} />
          <AppText size={11} color={C.faint} style={{ flex: 1 }}>
            Reminders {milestones.filter((m) => m > 0).join(", ")} days before and on expiry day, until your renewal is paid.
          </AppText>
        </View>
      ) : null}

      {info.source !== "none" && !info.expired && !paid ? (
        <RenewalAlerts supported={pushSupported} registered={pushRegistered} />
      ) : null}

      {info.gymId ? (
        <UpgradeSheet
          visible={upgradeOpen}
          gymId={info.gymId}
          currentPlan={info.planName}
          startLabel={nextText}
          busy={createRenewal.isPending}
          error={upgradeOpen ? error : null}
          onClose={() => setUpgradeOpen(false)}
          onPick={(id) => void start("upgrade", id)}
        />
      ) : null}
    </View>
  );
}

function RenewalAlerts({ supported, registered }: { supported: boolean; registered: boolean }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (registered) {
    return (
      <View style={s.reminderLine}>
        <Feather name="smartphone" size={13} color={C.lime} />
        <AppText size={11} color={C.muted} style={{ flex: 1 }}>
          Renewal alerts are on for this account. They arrive even when the app is closed.
        </AppText>
      </View>
    );
  }
  if (!supported || !pushCapable()) {
    return (
      <AppText size={11} color={C.faint} style={{ lineHeight: 16 }}>
        Phone alerts need the installed Iconic Fitness app. Reminders still appear in your notifications here.
      </AppText>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <ActionButton
        icon="bell"
        variant="outline"
        label="Enable renewal alerts"
        sub="We'll ask your phone for permission"
        loading={busy}
        onPress={async () => {
          if (!userId) return;
          setBusy(true);
          setNote(null);
          const result = await enablePushForAccount(userId);
          setBusy(false);
          if (result === "enabled") {
            void queryClient.invalidateQueries({ queryKey: getGetMyRenewalStatusQueryKey() });
          } else {
            setNote(
              result === "denied"
                ? "Notifications are turned off for this app. Turn them on in your phone settings, then try again."
                : result === "unsupported"
                  ? "Phone alerts aren't available in this version of the app."
                  : "Couldn't turn on alerts right now. Please try again.",
            );
          }
        }}
      />
      {note ? (
        <AppText size={12} color={C.coral}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

function WindowMeter({ daysLeft }: { daysLeft: number }) {
  const filled = Math.max(0, Math.min(10, 10 - daysLeft + 1));
  return (
    <View style={s.meter} accessibilityLabel={`${daysLeft} days left in renewal window`}>
      {Array.from({ length: 10 }, (_, i) => (
        <View key={i} style={[s.meterTick, { backgroundColor: i < filled ? (daysLeft <= 1 ? C.coral : C.lime) : "rgba(247,250,248,0.12)" }]} />
      ))}
    </View>
  );
}

function UpgradeSheet({
  visible,
  gymId,
  currentPlan,
  startLabel,
  busy,
  error,
  onClose,
  onPick,
}: {
  visible: boolean;
  gymId: number;
  currentPlan: string;
  startLabel: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPick: (packageId: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const params = { gymId };
  const q = useListMembershipPackages(params, {
    query: { enabled: visible, queryKey: getListMembershipPackagesQueryKey(params) },
  });
  const [picked, setPicked] = useState<number | null>(null);
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  const options = (q.data ?? []).filter((p) => norm(p.name) !== norm(currentPlan));
  const chosen = options.find((p) => p.id === picked) ?? null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close upgrade" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Eyebrow color={C.gold}>UPGRADE</Eyebrow>
              <AppText weight="700" size={20} color={C.text} style={{ marginTop: 4 }}>
                Choose your next plan
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close upgrade">
              <Feather name="x" size={24} color={C.text} />
            </Pressable>
          </View>
          <AppText size={12} color={C.muted} style={{ lineHeight: 17 }}>
            Starts {startLabel ? `on ${startLabel}` : "after your current plan ends"}. Full listed price, no proration. Your remaining days stay yours.
          </AppText>
          <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 8 }}>
            {q.isError ? (
              <Pressable onPress={() => void q.refetch()} style={s.option}>
                <AppText color={C.coral}>Couldn&apos;t load plans. Tap to retry.</AppText>
              </Pressable>
            ) : !q.isSuccess ? (
              [0, 1, 2].map((i) => <View key={i} style={[s.option, s.skeleton]} />)
            ) : options.length === 0 ? (
              <AppText size={13} color={C.muted}>
                No other plans are offered online at your branch right now.
              </AppText>
            ) : (
              options.map((p) => {
                const sel = p.id === picked;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sel }}
                    onPress={() => setPicked(p.id)}
                    style={[s.option, sel && s.optionSel]}
                  >
                    <Feather name={sel ? "check-circle" : "circle"} size={18} color={sel ? C.lime : C.faint} />
                    <View style={{ flex: 1 }}>
                      <AppText weight="700" size={14} color={C.text}>
                        {p.name}
                      </AppText>
                      {p.duration ? (
                        <AppText size={11} color={C.muted}>
                          {p.duration}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText weight="700" size={15} color={sel ? C.lime : C.text}>
                      {inr(p.amountInr)}
                    </AppText>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          {error ? (
            <AppText size={13} color={C.coral}>
              {error}
            </AppText>
          ) : null}
          <ActionButton
            icon="credit-card"
            label={chosen ? `Pay ${inr(chosen.amountInr)}` : "Select a plan"}
            disabled={!chosen}
            loading={busy}
            onPress={() => chosen && onPick(chosen.id)}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── PT renewal ─────────────────────────────────────────────────────────────

export function PtRenewalSection({ pt }: { pt: PtRenewalInfo }) {
  const router = useRouter();
  const ends = dateLabel(pt.endDate);
  const { isSignedIn } = useAuth();
  const me = useGetMe({ query: { enabled: !!isSignedIn && pt.action === "request_renewal", queryKey: getGetMeQueryKey() } });
  const [reqState, setReqState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [reqError, setReqError] = useState("");

  async function requestRenewal() {
    const name = me.data?.name?.trim() ?? "";
    const phone = me.data?.mobile?.trim() ?? "";
    if (!name || !phone) {
      setReqState("error");
      setReqError("Add your name and mobile number to your profile first.");
      return;
    }
    setReqState("busy");
    try {
      await submitLead({
        kind: "general",
        name,
        phone,
        preferredDate: new Date().toISOString().slice(0, 10),
        preferredTime: "10:00",
        gymId: pt.gymId ?? null,
        gymName: pt.gymName,
        message: `PT renewal request for "${pt.packageName}"${pt.endDate ? ` (ends ${pt.endDate})` : ""}.`,
        source: "iconic-app-pt-renewal-request",
      });
      setReqState("sent");
    } catch (err) {
      setReqState("error");
      setReqError(err instanceof Error ? err.message : "Could not send your request.");
    }
  }
  return (
    <View style={s.panel}>
      <View style={s.panelHead}>
        <View style={{ flex: 1 }}>
          <Eyebrow>PERSONAL TRAINING</Eyebrow>
          <AppText weight="700" size={18} color={C.text} style={{ marginTop: 6 }} numberOfLines={1}>
            {pt.packageName || "PT plan"}
          </AppText>
          <AppText size={12} color={C.muted} style={{ marginTop: 2 }} numberOfLines={1}>
            {[pt.trainerName, pt.gymName].filter(Boolean).join(" \u00B7 ")}
          </AppText>
        </View>
      </View>
      <View style={s.stats}>
        <Stat
          label="Sessions attended"
          value={pt.sessionsDelivered === null ? "\u2013" : `${pt.sessionsDelivered}${pt.totalSessions ? `/${pt.totalSessions}` : ""}`}
          accent={C.lime}
        />
        <Stat label="Remaining by time" value={pt.timeBasedRemaining === null ? "\u2013" : String(pt.timeBasedRemaining)} />
        <Stat label={pt.expired ? "Ended" : "Ends"} value={ends || "\u2013"} accent={pt.expired ? C.coral : undefined} />
      </View>
      {pt.renewalPaid ? (
        <Notice icon="check-circle" tone={C.lime} title="PT renewal complete" body={pt.nextStartDate ? `Your next PT plan starts on ${dateLabel(pt.nextStartDate)}.` : undefined} />
      ) : pt.action === "renew_online" && pt.canRenewOnline ? (
        <ActionButton
          icon="repeat"
          label="Renew PT"
          sub={pt.nextStartDate ? `Starts ${dateLabel(pt.nextStartDate)}` : undefined}
          onPress={() => router.push({ pathname: "/book-pt-sessions", params: { renew: "1" } })}
        />
      ) : pt.action === "request_renewal" ? (
        <View style={{ gap: 8 }}>
          <AppText size={12} color={C.muted} style={{ lineHeight: 17 }}>
            {pt.explanation}
          </AppText>
          {reqState === "sent" ? (
            <Notice icon="send" tone={C.lime} title="Renewal request sent" body="Your branch will contact you to renew. Nothing has been charged." />
          ) : (
            <ActionButton icon="send" variant="outline" label="Request PT renewal" loading={reqState === "busy"} onPress={() => void requestRenewal()} />
          )}
          {reqState === "error" ? (
            <AppText size={12} color={C.coral}>
              {reqError}
            </AppText>
          ) : null}
        </View>
      ) : (
        <AppText size={12} color={C.muted} style={{ lineHeight: 17 }}>
          {pt.explanation}
        </AppText>
      )}
      {pt.expired && pt.source === "local" ? (
        <ActionButton icon="plus" variant="outline" label="Book a new PT plan" onPress={() => router.push("/book-pt-sessions")} />
      ) : null}
    </View>
  );
}

export function RenewalSkeleton() {
  return <View style={[s.panel, s.skeleton, { height: 168 }]} />;
}

const s = StyleSheet.create({
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.panel,
    padding: 18,
    gap: 14,
  },
  panelHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  row: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionPrimary: { backgroundColor: C.lime },
  actionOutline: { borderWidth: 1.5, borderColor: "rgba(255, 211, 122, 0.6)" },
  notice: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  reminderLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  meter: { flexDirection: "row", gap: 3, marginTop: 6 },
  meterTick: { width: 5, height: 18, borderRadius: 2 },
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: {
    backgroundColor: C.sheet,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255, 211, 122, 0.3)",
    gap: 12,
  },
  sheetHead: { flexDirection: "row", alignItems: "flex-start" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 56,
  },
  optionSel: { borderColor: C.lime, backgroundColor: "rgba(120,245,27,0.07)" },
  skeleton: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "transparent" },
});
