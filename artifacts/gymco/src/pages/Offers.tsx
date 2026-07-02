import { useListMemberships, useGetMyMembership, getListMembershipsQueryKey, getGetMyMembershipQueryKey } from "@workspace/api-client-react";
import { Tag } from "lucide-react";
import { MembershipPlanGrid } from "@/components/MembershipPlanGrid";

export default function Offers() {
  const { data: myMembership } = useGetMyMembership({ query: { queryKey: getGetMyMembershipQueryKey() } });
  const { data: plans, isLoading: loadingPlans } = useListMemberships({ query: { queryKey: getListMembershipsQueryKey() } });

  // Offers page shows the annual plans created under the admin "Annual Plans" tab.
  const annualPlans = (plans ?? []).filter((p) => p.billingPeriod === "annual");

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80 mb-2">Annual Savings</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Special <span className="text-gradient-brand">Offers.</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Go annual and save the most across the year.</p>
      </div>

      <section>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-[11px] font-black tracking-[0.2em] text-lime-600 uppercase mb-3">
            <Tag className="h-3 w-3" /> Best value
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-2">Yearly plans, bigger savings.</h2>
          <p className="text-muted-foreground">Commit for the year and unlock our lowest per-month pricing.</p>
        </div>

        <MembershipPlanGrid
          plans={annualPlans}
          loading={loadingPlans}
          currentPlanId={myMembership?.planId}
          emptyTitle="No offers right now"
          emptyMessage="Annual offers are on the way. Check back soon."
        />
      </section>
    </div>
  );
}
