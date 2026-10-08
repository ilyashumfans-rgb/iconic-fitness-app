import { useAuth } from "@clerk/expo";
import {
  getGetMeQueryKey,
  getGetMyMembershipQueryKey,
  getListMyMembershipPaymentsQueryKey,
  getListMyOnlineBillingQueryKey,
  useListMyOnlineBilling,
  type OnlineBill,
  useGetMe,
  useGetMyMembership,
  useListMyMembershipPayments,
  type MembershipPayment,
} from "@workspace/api-client-react";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { OnlineBillReceiptModal, ONLINE_CHARGE_LABEL, onlineBillAmount, onlineBillDates, onlineCharge } from "@/components/OnlineBillReceipt";
import { memberAuthHref } from "@/lib/memberAuth";
import { istDateLabel } from "@/lib/dates";

/** Earliest known start (fallback invoice) date = when the member first joined. */
function memberSince(payments: MembershipPayment[]): string | null {
  let earliest: string | null = null;
  for (const p of payments) {
    const d = p.startDate ?? p.invoiceDate ?? null;
    if (d && (!earliest || d < earliest)) earliest = d;
  }
  return earliest;
}

export default function InvoicesScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const enabled = isLoaded && !!isSignedIn && !!userId;
  const meQuery = useGetMe({ query: { queryKey: [...getGetMeQueryKey(), userId], enabled } });
  const membershipQuery = useGetMyMembership({ query: { queryKey: [...getGetMyMembershipQueryKey(), userId], enabled } });
  const paymentsQuery = useListMyMembershipPayments({ query: { queryKey: [...getListMyMembershipPaymentsQueryKey(), userId], enabled } });
  const onlineQuery = useListMyOnlineBilling({ query: { queryKey: [...getListMyOnlineBillingQueryKey(), userId], enabled, refetchInterval: 30_000 } });
  const [selected, setSelected] = useState<{ owner: string; payment: MembershipPayment } | null>(null);
  const [selectedOnline, setSelectedOnline] = useState<{ owner: string; bill: OnlineBill } | null>(null);
  // Never carry a selected record across sign-out / account switch.
  useEffect(() => {
    setSelected(null);
    setSelectedOnline(null);
  }, [userId, isSignedIn]);

  if (!isLoaded) return <Screen><LoadingView /></Screen>;
  if (!isSignedIn) {
    return <Redirect href={memberAuthHref("/invoices")} />;
  }

  const payments = paymentsQuery.data ?? [];
  const membership = membershipQuery.data;
  const joined = memberSince(payments);
  const renewalKnown = membership ? membership.expiryKnown !== false : false;

  return (
    <Screen scroll>
      <ModalHeader title="Invoices" />

      {paymentsQuery.isLoading || membershipQuery.isLoading ? (
        <LoadingView />
      ) : paymentsQuery.isError || membershipQuery.isError ? (
        <ErrorView
          onRetry={() => {
            void paymentsQuery.refetch();
            void membershipQuery.refetch();
          }}
        />
      ) : (
        <View style={{ gap: 20 }}>
          <AppText muted size={12}>
            Tap View invoice to view a payment record. These are app-generated
            summaries of gym billing records, not official tax invoices.
          </AppText>
          <Card style={{ gap: 12 }}>
            <AppText weight="700" size={16}>
              Membership details
            </AppText>
            <View style={styles.detailRow}>
              <AppText muted size={13}>
                Registered since
              </AppText>
              <AppText weight="600" size={13}>
                {joined ? istDateLabel(joined) : "—"}
              </AppText>
            </View>
            {membership ? (
              <>
                <View style={styles.detailRow}>
                  <AppText muted size={13}>
                    Current plan
                  </AppText>
                  <AppText weight="600" size={13} style={{ flexShrink: 1 }} numberOfLines={1}>
                    {membership.planName}
                  </AppText>
                </View>
                {membership.branchName ? (
                  <View style={styles.detailRow}>
                    <AppText muted size={13}>
                      Branch
                    </AppText>
                    <AppText weight="600" size={13} style={{ flexShrink: 1 }} numberOfLines={1}>
                      {membership.branchName}
                    </AppText>
                  </View>
                ) : null}
                {membership.startedOn ? (
                  <View style={styles.detailRow}>
                    <AppText muted size={13}>
                      Plan started
                    </AppText>
                    <AppText weight="600" size={13}>
                      {istDateLabel(membership.startedOn)}
                    </AppText>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <AppText muted size={13}>
                    Next renewal
                  </AppText>
                  <AppText
                    weight="700"
                    size={13}
                    color={
                      renewalKnown && membership.status === "expired"
                        ? colors.destructive
                        : colors.foreground
                    }
                  >
                    {renewalKnown
                      ? istDateLabel(
                          new Date(membership.renewsOn).toISOString().slice(0, 10),
                        )
                      : "—"}
                  </AppText>
                </View>
              </>
            ) : (
              <AppText muted size={13}>
                No active plan found for your registered mobile number.
              </AppText>
            )}
          </Card>

          <View>
            <SectionHeader
              title={`Payment records${payments.length ? ` (${payments.length})` : ""}`}
            />
            {payments.length === 0 ? (
              <EmptyState
                icon="file-text"
                title="No payment records yet"
                message="Payment records from the gym billing system will appear here once you have a plan."
              />
            ) : (
              <Card style={{ gap: 0 }}>
                {payments.map((p, i) => {
                  const id = `${p.billId}-${i}`;
                  return (
                    <View
                      key={id}
                      style={[
                        styles.invoiceRow,
                        i > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText weight="600" size={14} numberOfLines={1}>
                          {p.planName}
                        </AppText>
                        <AppText muted size={12} numberOfLines={1}>
                          {p.billId ? `Bill ${p.billId} · ` : ""}
                          {p.invoiceDate
                            ? istDateLabel(p.invoiceDate)
                            : p.startDate
                              ? istDateLabel(p.startDate)
                              : p.branchName}
                        </AppText>
                        {p.startDate && p.expiryDate ? (
                          <AppText muted size={12} numberOfLines={1}>
                            {istDateLabel(p.startDate)} – {istDateLabel(p.expiryDate)}
                          </AppText>
                        ) : null}
                        {typeof p.amountInr === "number" && p.amountInr > 0 ? (
                          <AppText weight="700" size={13}>
                            ₹{p.amountInr.toLocaleString("en-IN")}
                          </AppText>
                        ) : null}
                      </View>
                      <Button
                        label="View invoice"
                        icon="eye"
                        full={false}
                        variant="secondary"
                        disabled={!userId}
                        onPress={() => {
                          if (userId) setSelected({ owner: userId, payment: p });
                        }}
                      />
                    </View>
                  );
                })}
              </Card>
            )}
          </View>

        </View>
      )}
      <OnlineBillsSection
        query={onlineQuery}
        canOpen={!!userId}
        onOpen={(bill) => {
          if (userId) setSelectedOnline({ owner: userId, bill });
        }}
      />
      <OnlineBillReceiptModal
        bill={selectedOnline && isSignedIn && selectedOnline.owner === userId ? selectedOnline.bill : null}
        onClose={() => setSelectedOnline(null)}
      />
      <InvoiceModal
        payment={selected && isSignedIn && selected.owner === userId ? selected.payment : null}
        memberName={meQuery.data?.name ?? ""}
        memberMobile={meQuery.data?.mobile ?? ""}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}

function OnlineBillsSection({
  query,
  canOpen,
  onOpen,
}: {
  query: { data?: OnlineBill[]; isLoading: boolean; isError: boolean; refetch: () => unknown };
  canOpen: boolean;
  onOpen: (b: OnlineBill) => void;
}) {
  const colors = useColors();
  const bills = query.data ?? [];
  return (
    <View>
      <SectionHeader title={`Online coaching${bills.length ? ` (${bills.length})` : ""}`} />
      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : bills.length === 0 ? (
        <EmptyState
          icon="video"
          title="No online coaching bills"
          message="Receipts for Network Coach sessions and prepaid plans will appear here after you book."
        />
      ) : (
        <Card style={{ gap: 0 }}>
          {bills.map((b, i) => {
            const c = onlineCharge(b);
            const dates = onlineBillDates(b);
            return (
              <View
                key={`${b.kind}-${b.id}`}
                testID={`online-bill-${b.kind}-${b.id}`}
                style={[styles.invoiceRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText weight="600" size={14} numberOfLines={1}>{b.description}</AppText>
                  <AppText muted size={12} numberOfLines={1}>{b.trainerName} · {b.branchName}</AppText>
                  {dates ? <AppText muted size={12} numberOfLines={1}>{dates}</AppText> : null}
                  <AppText
                    weight="700"
                    size={13}
                    color={c === "refund_pending" ? colors.destructive : c === "paid" || c === "covered" ? colors.foreground : colors.mutedForeground}
                  >
                    {onlineBillAmount(b)} · {ONLINE_CHARGE_LABEL[c]}
                  </AppText>
                </View>
                {b.invoiceNumber != null ? (
                  <Button label="View invoice" icon="eye" full={false} variant="secondary" disabled={!canOpen} onPress={() => onOpen(b)} />
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

function inr(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "Unavailable";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function dateOr(iso: string | null | undefined): string {
  return iso ? istDateLabel(iso) : "Unavailable";
}

function InvoiceModal({
  payment,
  memberName,
  memberMobile,
  onClose,
}: {
  payment: MembershipPayment | null;
  memberName: string;
  memberMobile: string;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal
      visible={payment !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modalBar, { borderBottomColor: colors.border }]}>
          <AppText weight="700" size={17}>
            Payment record
          </AppText>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close invoice"
            hitSlop={12}
            style={[styles.closeBtn, { borderColor: colors.border }]}
          >
            <Feather name="x" size={18} color={colors.foreground} />
            <AppText weight="600" size={14}>
              Close
            </AppText>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          {payment ? (
            <InvoicePreview payment={payment} memberName={memberName} memberMobile={memberMobile} />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function InvoicePreview({
  payment: p,
  memberName,
  memberMobile,
}: {
  payment: MembershipPayment;
  memberName: string;
  memberMobile: string;
}) {
  const colors = useColors();
  const discount = p.discountInr;
  const status = p.status || "";
  const statusColor =
    status === "expired" ? colors.destructive : status === "paused" ? colors.mutedForeground : colors.foreground;
  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={styles.detailRow}>
      <AppText muted size={13}>
        {label}
      </AppText>
      <AppText weight={strong ? "700" : "600"} size={strong ? 16 : 13} style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </AppText>
    </View>
  );
  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 4 }}>
        <AppText weight="700" size={18}>
          ICONIC FITNESS
        </AppText>
        <AppText muted size={12}>
          Bill no. {p.billId || "Unavailable"}
        </AppText>
        {status ? (
          <AppText weight="700" size={12} color={statusColor} style={{ textTransform: "uppercase", marginTop: 4 }}>
            {status}
          </AppText>
        ) : null}
      </Card>
      <Card style={{ gap: 12 }}>
        <Row label="Member" value={memberName || "Unavailable"} />
        {memberMobile ? <Row label="Mobile" value={memberMobile} /> : null}
        <Row label="Branch" value={p.branchName || "Unavailable"} />
      </Card>
      <Card style={{ gap: 12 }}>
        <Row label="Plan" value={p.planName || "Unavailable"} />
        {p.serviceName ? <Row label="Service" value={p.serviceName} /> : null}
        <Row label="Bill date" value={dateOr(p.invoiceDate)} />
        <Row label="Start date" value={dateOr(p.startDate)} />
        <Row label="End date" value={dateOr(p.expiryDate)} />
      </Card>
      <Card style={{ gap: 12 }}>
        {typeof discount === "number" && Number.isFinite(discount) ? (
          <Row label="Discount" value={inr(discount)} />
        ) : null}
        <Row label="Amount" value={inr(p.amountInr)} strong />
      </Card>
      <AppText muted size={11}>
        App-generated view of a gym billing-system payment record. This is not an
        official tax invoice. For billing questions, contact your branch
        {p.branchName ? ` (${p.branchName})` : ""}.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 48,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
});
