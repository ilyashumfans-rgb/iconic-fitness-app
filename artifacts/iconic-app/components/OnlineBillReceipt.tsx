import { Feather } from "@expo/vector-icons";
import type { OnlineBill } from "@workspace/api-client-react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";

const istDT = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const istD = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export type OnlineCharge = "paid" | "covered" | "unpaid" | "refund_pending" | "refunded";
export function onlineCharge(b: OnlineBill): OnlineCharge {
  if (b.refundStatus === "pending_admin") return "refund_pending";
  if (b.refundStatus) return "refunded";
  if (b.planCovered) return "covered";
  return b.paid ? "paid" : "unpaid";
}
export const ONLINE_CHARGE_LABEL: Record<OnlineCharge, string> = {
  paid: "Paid",
  covered: "Covered by plan · ₹0 extra",
  unpaid: "Unpaid",
  refund_pending: "Refund in progress",
  refunded: "Refunded",
};
export function onlineBillDates(b: OnlineBill): string {
  if (!b.startsAt) return "";
  if (b.kind === "plan") return `${istD(b.startsAt)}${b.endsAt ? ` – ${istD(b.endsAt)}` : ""}`;
  return istDT(b.startsAt);
}
export function onlineBillAmount(b: OnlineBill): string {
  return onlineCharge(b) === "covered" ? "₹0" : inr(b.amountInr);
}

export function OnlineBillReceiptModal({ bill, onClose }: { bill: OnlineBill | null; onClose: () => void }) {
  const colors = useColors();
  return (
    <Modal visible={bill !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.bar, { borderBottomColor: colors.border }]}>
          <AppText weight="700" size={17}>Payment receipt</AppText>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close receipt" hitSlop={12} style={[styles.close, { borderColor: colors.border }]}>
            <Feather name="x" size={18} color={colors.foreground} />
            <AppText weight="600" size={14}>Close</AppText>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>{bill ? <Receipt b={bill} /> : null}</ScrollView>
      </View>
    </Modal>
  );
}

function Receipt({ b }: { b: OnlineBill }) {
  const colors = useColors();
  const c = onlineCharge(b);
  const tone = c === "refund_pending" ? colors.destructive : c === "unpaid" || c === "refunded" ? colors.mutedForeground : colors.primary;
  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={styles.row}>
      <AppText muted size={13}>{label}</AppText>
      <AppText weight={strong ? "700" : "600"} size={strong ? 16 : 13} style={{ flexShrink: 1, textAlign: "right" }}>{value}</AppText>
    </View>
  );
  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 6, alignItems: "flex-start" }}>
        <Image source={require("@/assets/images/auth-logo-mark.png")} style={{ width: 56, height: 56 }} resizeMode="contain" accessibilityLabel="Iconic Fitness" />
        <AppText weight="700" size={18}>ICONIC FITNESS</AppText>
        <AppText muted size={12}>Online coaching · Receipt no. {b.invoiceNumber ?? "Unavailable"}</AppText>
        <AppText weight="700" size={12} color={tone} style={{ textTransform: "uppercase", marginTop: 4 }}>{ONLINE_CHARGE_LABEL[c]}</AppText>
      </Card>
      <Card style={{ gap: 12 }}>
        <Row label="Member" value={b.memberName || "Unavailable"} />
        <Row label="Coach" value={b.trainerName || "Unavailable"} />
        <Row label="Branch" value={b.branchName || "Unavailable"} />
      </Card>
      <Card style={{ gap: 12 }}>
        <Row label="Description" value={b.description} />
        <Row label={b.kind === "plan" ? "Term" : "Session"} value={onlineBillDates(b) || "Unavailable"} />
        <Row label="Paid at" value={b.paidAt ? istDT(b.paidAt) : "Not paid"} />
        <Row label="Payment ref" value={b.paymentReference ?? "—"} />
        <Row label="Refund" value={b.refundStatus == null ? "None" : b.refundStatus === "pending_admin" ? "In progress" : "Refunded"} />
      </Card>
      <Card style={{ gap: 12 }}>
        <Row label="Base price" value={inr(b.subtotalInr ?? b.amountInr)} />
        <Row label={`CGST (${b.cgstPercent ?? 0}%)`} value={inr(b.cgstInr ?? 0)} />
        <Row label={`SGST (${b.sgstPercent ?? 0}%)`} value={inr(b.sgstInr ?? 0)} />
        <Row label={c === "covered" ? "Extra charge" : "Total including GST"} value={onlineBillAmount(b)} strong />
        {c === "covered" ? <AppText muted size={12}>Included in your prepaid plan term; no separate charge.</AppText> : null}
      </Card>
      <AppText muted size={11}>
        App-generated payment receipt for an online coaching purchase. This is not an official GST tax invoice. For billing questions, contact {b.branchName || "your branch"}.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  body: { padding: 20, paddingBottom: 48, width: "100%", maxWidth: 640, alignSelf: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
});
