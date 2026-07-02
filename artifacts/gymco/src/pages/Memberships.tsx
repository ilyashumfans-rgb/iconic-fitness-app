import { useListMemberships, useGetMyMembership, getListMembershipsQueryKey, getGetMyMembershipQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Dumbbell } from "lucide-react";
import { Link } from "wouter";

export default function Memberships() {
  const { data: myMembership } = useGetMyMembership({ query: { queryKey: getGetMyMembershipQueryKey() } });
  const { data: plans, isLoading: loadingPlans } = useListMemberships({ query: { queryKey: getListMembershipsQueryKey() } });

  // Sort plans by price ascending, but force the popular plan to the end.
  const orderedPlans = (plans ?? [])
    .map((p) => ({ ...p, name: p.name.trim() }))
    .sort((a, b) => {
      if (a.popular && !b.popular) return 1;
      if (!a.popular && b.popular) return -1;
      return a.priceInr - b.priceInr;
    });

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80 mb-2">Iconic Fitness Pass</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          One pass. <span className="text-gradient-brand">Every gym.</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Premium memberships built for the way you train.</p>
      </div>

      {/* Plans — single row, premium */}
      <section>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-[11px] font-black tracking-[0.2em] text-lime-600 uppercase mb-3">
            <Sparkles className="h-3 w-3" /> Choose your pass
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-2">Unlock the city.</h2>
          <p className="text-muted-foreground">Premium access across hundreds of locations. Longer the plan, bigger the savings.</p>
        </div>

        {loadingPlans ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[460px] rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 items-stretch pt-6">
            {orderedPlans.map((plan) => {
              const isCurrent = myMembership?.planId === plan.id;
              const isPopular = plan.popular;
              const periodLabel =
                plan.billingPeriod === "monthly" ? "mo"
                : plan.billingPeriod === "annual" ? "yr"
                : "qtr";
              const savings = plan.originalPriceInr > plan.priceInr
                ? Math.round(((plan.originalPriceInr - plan.priceInr) / plan.originalPriceInr) * 100)
                : 0;

              return (
                <div
                  key={plan.id}
                  className={`group relative rounded-2xl transition-all duration-300 ${
                    isPopular
                      ? "lg:-my-2 lg:scale-[1.03] hover:lg:scale-[1.05] p-[1.5px] bg-gradient-to-b from-amber-300/80 via-amber-500/40 to-amber-300/60 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] z-10"
                      : "p-[1px] bg-gradient-to-b from-border to-border/40 hover:from-lime-300/60 hover:to-lime-500/30 hover:-translate-y-1"
                  }`}
                >
                  {/* Top badge */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                      <Badge className="bg-gradient-to-r from-amber-300 to-amber-500 text-slate-900 ring-1 ring-amber-300/50 font-black px-3 py-1 text-[10px] tracking-[0.18em] shadow-md border-none whitespace-nowrap">
                        <Crown className="h-3 w-3 mr-1 inline -mt-0.5" />
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}

                  <Card
                    className={`relative h-full flex flex-col border-none rounded-[14px] overflow-hidden ${
                      isPopular
                        ? "bg-gradient-to-b from-slate-900 to-slate-950"
                        : "bg-card"
                    }`}
                  >
                    {/* Soft decorative glow for the popular plan */}
                    {isPopular && (
                      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
                    )}

                    <CardContent className="flex flex-col h-full p-5 relative z-10">
                      {/* Title */}
                      <div className="text-center mb-4">
                        <div
                          className={`inline-flex items-center justify-center rounded-xl mb-3 h-10 w-10 ${
                            isPopular
                              ? "bg-gradient-to-br from-amber-300 to-amber-500 text-slate-900 shadow-md shadow-amber-500/30"
                              : "bg-lime-500/10 text-lime-600"
                          }`}
                        >
                          <Dumbbell className="h-5 w-5" />
                        </div>
                        <h3 className={`font-black tracking-tight leading-tight text-base min-h-[2.5rem] flex items-center justify-center ${isPopular ? "text-white" : ""}`}>
                          {plan.name}
                        </h3>
                        {plan.tagline && (
                          <p className={`text-[11px] font-medium mt-1 ${isPopular ? "text-amber-300/90" : "text-muted-foreground"}`}>
                            {plan.tagline}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div className={`text-center py-4 mb-4 border-y border-dashed ${isPopular ? "border-white/15" : "border-lime-200/60 dark:border-lime-800/30"}`}>
                        <div className="flex items-baseline justify-center gap-0.5">
                          <span className={`font-bold text-base ${isPopular ? "text-amber-300/80" : "text-muted-foreground"}`}>₹</span>
                          <span className={`font-black tracking-tight text-4xl ${isPopular ? "text-white" : ""}`}>
                            {plan.priceInr.toLocaleString("en-IN")}
                          </span>
                          <span className={`text-xs font-bold ml-1 ${isPopular ? "text-slate-400" : "text-muted-foreground"}`}>/{periodLabel}</span>
                        </div>
                        {plan.originalPriceInr > plan.priceInr && (
                          <div className="flex items-center justify-center gap-2 mt-1.5">
                            <span className={`text-xs line-through ${isPopular ? "text-slate-500" : "text-muted-foreground"}`}>₹{plan.originalPriceInr.toLocaleString("en-IN")}</span>
                            {savings > 0 && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isPopular ? "text-amber-300 bg-amber-400/15" : "text-emerald-600 bg-emerald-500/10"}`}>
                                SAVE {savings}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Features — full list */}
                      <ul className="space-y-2 mb-5 flex-1 text-left">
                        <li className={`flex items-start text-xs ${isPopular ? "text-white" : ""}`}>
                          <Check className={`h-4 w-4 mr-2 shrink-0 mt-0.5 ${isPopular ? "text-amber-400" : "text-emerald-500"}`} />
                          <span className="font-medium leading-snug"><strong>{plan.gymsIncluded}+</strong> premium gyms</span>
                        </li>
                        <li className={`flex items-start text-xs ${isPopular ? "text-white" : ""}`}>
                          <Check className={`h-4 w-4 mr-2 shrink-0 mt-0.5 ${isPopular ? "text-amber-400" : "text-emerald-500"}`} />
                          <span className="font-medium leading-snug"><strong>{plan.classesPerMonth}</strong> classes / month</span>
                        </li>
                        {plan.perks.map(perk => (
                          <li key={perk} className={`flex items-start text-xs ${isPopular ? "text-slate-300" : "text-muted-foreground"}`}>
                            <Check className={`h-4 w-4 mr-2 shrink-0 mt-0.5 ${isPopular ? "text-amber-400/80" : "text-lime-500/70"}`} />
                            <span className="leading-snug">{perk}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {isCurrent ? (
                        <Button
                          size="sm"
                          className="w-full h-10 text-xs font-black tracking-[0.12em] border-none !bg-none bg-slate-900 hover:bg-slate-800 text-white"
                          disabled
                        >
                          CURRENT PLAN
                        </Button>
                      ) : (
                        <Link href="/be-a-member">
                          <Button
                            size="sm"
                            className={`w-full h-10 text-xs font-black tracking-[0.12em] border-none !bg-none ${
                              isPopular
                                ? "bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.6)]"
                                : "bg-slate-900 hover:bg-slate-800 text-white"
                            }`}
                          >
                            SELECT PLAN
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
