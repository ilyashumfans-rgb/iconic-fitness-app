import {
  useGetMe,
  getGetMeQueryKey,
  useGetMyMembership,
  getGetMyMembershipQueryKey,
  useListMyMembershipPayments,
  getListMyMembershipPaymentsQueryKey,
  type MembershipPayment,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Download, FileText, ReceiptText } from "lucide-react";
import { buildInvoiceHtml } from "@/lib/invoiceHtml";

function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Anchor at midday UTC so the IST calendar day is unambiguous on any device.
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Earliest known start (fallback invoice) date = when the member first joined. */
function memberSince(payments: MembershipPayment[]): string | null {
  let earliest: string | null = null;
  for (const p of payments) {
    const d = p.startDate ?? p.invoiceDate ?? null;
    if (d && (!earliest || d < earliest)) earliest = d;
  }
  return earliest;
}

export default function Invoices() {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: membership, isLoading: membershipLoading } = useGetMyMembership({
    query: { queryKey: getGetMyMembershipQueryKey() },
  });
  const { data: payments, isLoading: paymentsLoading } = useListMyMembershipPayments({
    query: { queryKey: getListMyMembershipPaymentsQueryKey() },
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const rows = payments ?? [];
  const joined = memberSince(rows);
  const renewalKnown = membership ? membership.expiryKnown !== false : false;

  const download = (p: MembershipPayment, index: number) => {
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
        memberName: user?.name ?? "",
        memberMobile: user?.mobile ?? "",
      });
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Please allow pop-ups to download the invoice.");
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      // Give the new window a beat to render before opening the print dialog
      // (user saves as PDF from there).
      win.onload = () => {
        win.focus();
        win.print();
      };
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          /* window may already be printing or closed */
        }
      }, 400);
    } finally {
      setDownloadingId(null);
    }
  };

  if (membershipLoading || paymentsLoading) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Invoices</h1>
      </div>

      {/* Membership summary */}
      <Card className="bg-card border-none shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold flex items-center mb-6 text-lg">
            <ReceiptText className="h-5 w-5 mr-2 text-primary" /> Membership details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Registered since
              </div>
              <div className="font-bold">{joined ? dateLabel(joined) : "—"}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Current plan
              </div>
              <div className="font-bold truncate">{membership?.planName ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Plan started
              </div>
              <div className="font-bold">
                {membership?.startedOn ? dateLabel(membership.startedOn) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Next renewal
              </div>
              <div
                className={`font-bold ${
                  renewalKnown && membership?.status === "expired" ? "text-red-500" : ""
                }`}
              >
                {membership && renewalKnown
                  ? new Date(membership.renewsOn).toLocaleDateString("en-IN", {
                      timeZone: "UTC",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </div>
          </div>
          {membership?.branchName ? (
            <div className="mt-4 text-sm text-muted-foreground">
              Home branch: <span className="font-bold text-foreground">{membership.branchName}</span>
            </div>
          ) : null}
          {!membership ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No active plan found for your registered mobile number. Update your mobile
              number on your profile if it differs from the one used at the gym.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Invoice list */}
      <Card className="bg-card border-none shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold flex items-center mb-4 text-lg">
            <FileText className="h-5 w-5 mr-2 text-primary" /> All invoices
            {rows.length > 0 ? (
              <span className="ml-2 text-sm font-bold text-muted-foreground">
                ({rows.length})
              </span>
            ) : null}
          </h3>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No invoices yet. Invoices from the gym billing system will appear here once
              you have a plan.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((p, i) => {
                const id = `${p.billId}-${i}`;
                return (
                  <div key={id} className="flex items-center justify-between py-4 gap-4">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{p.planName}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {p.billId ? `Bill ${p.billId} · ` : ""}
                        {dateLabel(p.invoiceDate ?? p.startDate)}
                        {p.branchName ? ` · ${p.branchName}` : ""}
                      </div>
                      {p.startDate && p.expiryDate ? (
                        <div className="text-sm text-muted-foreground">
                          {dateLabel(p.startDate)} – {dateLabel(p.expiryDate)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        {typeof p.amountInr === "number" && p.amountInr > 0 ? (
                          <div className="font-bold">
                            ₹{p.amountInr.toLocaleString("en-IN")}
                          </div>
                        ) : null}
                        <div
                          className={`text-xs font-bold capitalize ${
                            p.status === "active"
                              ? "text-lime-500"
                              : p.status === "expired"
                                ? "text-red-500"
                                : "text-amber-500"
                          }`}
                        >
                          {p.status}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="font-bold"
                        disabled={downloadingId !== null}
                        onClick={() => download(p, i)}
                      >
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
