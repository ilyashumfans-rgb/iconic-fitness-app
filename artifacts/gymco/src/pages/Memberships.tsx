import { useListMemberships, useGetMyMembership, getListMembershipsQueryKey, getGetMyMembershipQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function Memberships() {
  const { data: myMembership, isLoading: loadingMyMembership } = useGetMyMembership({ query: { queryKey: getGetMyMembershipQueryKey() } });
  const { data: plans, isLoading: loadingPlans } = useListMemberships({ query: { queryKey: getListMembershipsQueryKey() } });

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80 mb-2">GYMCO Pass</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          One pass. <span className="text-gradient-brand">Every gym.</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Premium memberships built for the way you train.</p>
      </div>

      {/* Current Membership Panel */}
      <section>
        <h2 className="text-xl font-bold mb-4">Your Active Plan</h2>
        {loadingMyMembership ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : myMembership ? (
          <Card className="bg-gradient-brand text-primary-foreground border-none shadow-[0_24px_60px_-20px_hsl(18_100%_55%/0.55)] overflow-hidden relative rounded-3xl">
            <div className="absolute right-0 top-0 w-72 h-72 bg-white/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute left-0 bottom-0 w-72 h-72 bg-black/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            <CardContent className="p-6 md:p-8 relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 opacity-80" />
                    <span className="text-sm font-bold uppercase tracking-wider opacity-80">Current Plan</span>
                  </div>
                  <h3 className="text-4xl font-black mb-1">{myMembership.planName}</h3>
                  <div className="text-sm font-medium opacity-90 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-900 mr-2" />
                    Status: {myMembership.status.toUpperCase()} • Renews on {format(new Date(myMembership.renewsOn), "MMM d, yyyy")}
                  </div>
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="bg-black/10 rounded-xl p-4 flex-1 text-center backdrop-blur-sm">
                    <div className="text-3xl font-black">{myMembership.classesUsed}<span className="text-lg opacity-60">/{myMembership.classesIncluded}</span></div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1">Classes</div>
                  </div>
                  <div className="bg-black/10 rounded-xl p-4 flex-1 text-center backdrop-blur-sm">
                    <div className="text-3xl font-black">{myMembership.gymsAccessed}</div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1">Gyms visited</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-dashed border-2 border-muted flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-bold text-lg">No active membership</h3>
            <p className="text-muted-foreground mb-4">Choose a plan below to start accessing gyms and classes.</p>
          </Card>
        )}
      </section>

      {/* Plans Grid */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black mb-2">Unlock the city.</h2>
          <p className="text-muted-foreground">Premium access across hundreds of locations.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loadingPlans ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)
          ) : plans?.map(plan => (
            <Card key={plan.id} className={`relative flex flex-col border-none shadow-2xl rounded-2xl ${plan.popular ? 'bg-card ring-glow-brand scale-105 z-10' : 'bg-card/80 backdrop-blur-sm border border-border/60'}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-gradient-brand text-primary-foreground font-black px-4 py-1.5 text-xs tracking-[0.18em] shadow-lg border-none">MOST POPULAR</Badge>
                </div>
              )}
              {plan.badge && !plan.popular && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="font-bold tracking-wider text-[10px]">{plan.badge}</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                <CardDescription className="font-medium">{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="text-center mb-6 py-4 border-y border-border/50">
                  <div className="flex items-end justify-center justify-center gap-1">
                    <span className="text-xl font-bold text-muted-foreground">₹</span>
                    <span className="text-5xl font-black">{plan.priceInr.toLocaleString()}</span>
                    <span className="text-sm font-bold text-muted-foreground mb-1">/{plan.billingPeriod === 'monthly' ? 'mo' : plan.billingPeriod === 'annual' ? 'yr' : 'qtr'}</span>
                  </div>
                  {plan.originalPriceInr > plan.priceInr && (
                    <div className="text-sm font-medium text-muted-foreground line-through mt-1">₹{plan.originalPriceInr.toLocaleString()}</div>
                  )}
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0 mt-0.5" />
                    <span className="font-medium">Access to <strong>{plan.gymsIncluded}+</strong> premium gyms</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0 mt-0.5" />
                    <span className="font-medium"><strong>{plan.classesPerMonth}</strong> classes per month</span>
                  </li>
                  {plan.perks.map(perk => (
                    <li key={perk} className="flex items-start text-muted-foreground">
                      <Check className="h-5 w-5 mr-3 shrink-0 mt-0.5 opacity-50" />
                      <span className="text-sm">{perk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full h-12 text-base font-black tracking-[0.12em] ${plan.popular ? 'bg-gradient-brand border-none text-white shadow-[0_10px_30px_-10px_hsl(18_100%_55%/0.7)] hover:opacity-95' : ''}`}
                  variant={plan.popular ? "default" : "secondary"}
                >
                  {myMembership?.planId === plan.id ? "CURRENT PLAN" : "SELECT PLAN"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
