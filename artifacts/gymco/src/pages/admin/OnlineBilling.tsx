import { useEffect } from "react";
import { getListAdminOnlineBillingQueryKey, useListAdminOnlineBilling } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { OnlineBillingList } from "@/components/billing/OnlineBillingList";

export default function AdminOnlineBilling() {
  const query = useListAdminOnlineBilling({ query: { queryKey: getListAdminOnlineBillingQueryKey(), refetchInterval: 30_000 } });
  useEffect(() => { document.title = "Billing · Online coaching | Iconic Fitness Admin"; }, []);
  return <AdminLayout title="Billing · Online coaching">
    <OnlineBillingList query={query} scopeNote="All branches. Plan-covered sessions show ₹0 extra; their value is counted once in the plan term." />
  </AdminLayout>;
}
