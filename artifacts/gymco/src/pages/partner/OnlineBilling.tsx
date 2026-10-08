import { useEffect } from "react";
import { getListPartnerOnlineBillingQueryKey, useListPartnerOnlineBilling } from "@workspace/api-client-react";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { OnlineBillingList } from "@/components/billing/OnlineBillingList";

export default function PartnerOnlineBilling() {
  const query = useListPartnerOnlineBilling({ query: { queryKey: getListPartnerOnlineBillingQueryKey(), refetchInterval: 30_000 } });
  useEffect(() => { document.title = "Billing · Online coaching | Iconic Partner"; }, []);
  return <PartnerLayout title="Billing · Online coaching">
    <OnlineBillingList query={query} scopeNote="Only bills for coaches at your branches. Plan-covered sessions show ₹0 extra." />
  </PartnerLayout>;
}
