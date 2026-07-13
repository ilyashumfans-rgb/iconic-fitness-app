import { useAuth } from "@clerk/expo";
import {
  useGetMe,
  useGetMyMembership,
  useListMyMembershipPayments,
  type MembershipPayment,
} from "@workspace/api-client-react";
import { Redirect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView, SectionHeader } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { istDateLabel } from "@/lib/dates";
import { buildInvoiceHtml } from "@/lib/invoiceHtml";

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
  const { isLoaded, isSignedIn } = useAuth();
  const meQuery = useGetMe();
  const membershipQuery = useGetMyMembership();
  const paymentsQuery = useListMyMembershipPayments();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const payments = paymentsQuery.data ?? [];
  const membership = membershipQuery.data;
  const joined = memberSince(payments);
  const renewalKnown = membership ? membership.expiryKnown !== false : false;

  const download = async (p: MembershipPayment, index: number) => {
    const id = `${p.billId}-${index}`;
    setDownloadingId(id);
    try {
      const html = buildInvoiceHtml({
        billId: p.billId,
        planName: p.planName,
        serviceName: p.serviceName,
        branchName: p.branchName,
        status: p.status,
        invoiceDate: p.invoiceDate ?? null,
        startDate: p.startDate ?? null,
        expiryDate: p.expiryDate ?? null,
        amountInr: p.amountInr ?? null,
        discountInr: p.discountInr ?? null,
        memberName: meQuery.data?.name ?? "",
        memberMobile: meQuery.data?.mobile ?? "",
      });
      if (Platform.OS === "web") {
        // Browser print dialog — user saves as PDF from there.
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
            dialogTitle: `Invoice ${p.billId || ""}`.trim(),
          });
        } else {
          await Print.printAsync({ html });
        }
      }
    } catch (err) {
      // User cancelling the print/share sheet lands here too — only surface
      // a message when it looks like a real failure.
      const msg = err instanceof Error ? err.message : "";
      if (msg && !/cancel|dismiss/i.test(msg)) {
        Alert.alert("Download failed", "Could not generate the invoice. Please try again.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Screen scroll>
      <ModalHeader title="Invoices" />

      {paymentsQuery.isLoading || membershipQuery.isLoading ? (
        <LoadingView />
      ) : paymentsQuery.isError ? (
        <ErrorView onRetry={() => paymentsQuery.refetch()} />
      ) : (
        <View style={{ gap: 20 }}>
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
            <SectionHeader title={`All invoices${payments.length ? ` (${payments.length})` : ""}`} />
            {payments.length === 0 ? (
              <EmptyState
                icon="file-text"
                title="No invoices yet"
                message="Invoices from the gym billing system will appear here once you have a plan."
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
                        label={downloadingId === id ? "Preparing…" : "Download"}
                        icon="download"
                        full={false}
                        loading={downloadingId === id}
                        disabled={downloadingId !== null}
                        onPress={() => void download(p, i)}
                      />
                    </View>
                  );
                })}
              </Card>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
