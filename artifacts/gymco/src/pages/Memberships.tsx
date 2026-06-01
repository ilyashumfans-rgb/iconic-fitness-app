import { useListMemberships, useGetMyMembership, getListMembershipsQueryKey, getGetMyMembershipQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Flame, Dumbbell } from "lucide-react";
import { Link } from "wouter";

export default function Memberships() {
  const { data: myMembership } = useGetMyMembership({ query: { queryKey: getGetMyMembershipQueryKey() } });
  const { data: plans, isLoading: loadingPlans } = useListMemberships({ query: { queryKey: getListMembershipsQueryKey() } });

  // Sort plans by price ascending, but force any plan whose name contains "Great Plan" to the end.
  const orderedPlans = (plans ?? [])
    .map((p) => ({ ...p, name: p.name.trim() }))
    .sort((a, b) => {
      const aGreat = /great plan/i.test(a.name);
      const bGreat = /great plan/i.test(b.name);
      if (aGreat && !bGreat) return 1;
      if (!aGreat && bGreat) return -1;
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-[11px] font-black tracking-[0.2em] text-lime-500 uppercase mb-3">
            <Sparkles className="h-3 w-3" /> Choose your pass
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-2">Unlock the city.</h2>
          <p className="text-muted-foreground">Premium access across hundreds of locations. Longer the plan, bigger the savings.</p>
        </div>

        {loadingPlans ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[460px] rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 items-stretch pt-6">
            {orderedPlans.map((plan, idx) => {
              const isCurrent = myMembership?.planId === plan.id;
              const isLast = idx === orderedPlans.length - 1;
              const isGreat = /great plan/i.test(plan.name);
              const accent = plan.popular || isGreat;
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
                    isGreat
                      ? "lg:-my-3 lg:scale-[1.04] hover:lg:scale-[1.06] p-[2px] bg-[conic-gradient(from_180deg_at_50%_50%,#84cc16_0deg,#f43f5e_120deg,#a855f7_220deg,#84cc16_360deg)] shadow-[0_30px_80px_-20px_rgba(244,63,94,0.55)] z-10"
                      : accent
                        ? "p-[1.5px] bg-gradient-to-b from-lime-400 via-lime-500 to-lime-600 shadow-[0_20px_50px_-15px_rgba(101, 163, 13,0.5)] hover:-translate-y-1"
                        : "p-[1px] bg-gradient-to-b from-border to-border/40 hover:from-lime-300/60 hover:to-lime-500/30 hover:-translate-y-1"
                  }`}
                >
                  {/* Animated glow ring for the Great plan */}
                  {isGreat && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-70 blur-xl bg-[conic-gradient(from_180deg_at_50%_50%,#84cc16_0deg,#f43f5e_120deg,#a855f7_220deg,#84cc16_360deg)] animate-pulse"
                    />
                  )}

                  {/* Top badges */}
                  {(plan.popular || isGreat) && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                      <Badge
                        className={`font-black px-3 py-1 text-[10px] tracking-[0.18em] shadow-lg border-none whitespace-nowrap ${
                          isGreat
                            ? "bg-gradient-to-r from-green-400 via-lime-500 to-rose-500 text-white ring-2 ring-white/80 dark:ring-background/80"
                            : "bg-gradient-to-r from-lime-500 to-lime-600 text-white"
                        }`}
                      >
                        {isGreat ? (
                          <>
                            <Crown className="h-3 w-3 mr-1 inline -mt-0.5" />
                            BEST DEAL
                          </>
                        ) : (
                          "MOST POPULAR"
                        )}
                      </Badge>
                    </div>
                  )}
                  {isLast && !isGreat && !plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                      <Badge className="bg-slate-900 text-white font-black px-3 py-1 text-[10px] tracking-[0.18em] shadow-lg border-none">
                        LONGEST
                      </Badge>
                    </div>
                  )}

                  <Card
                    className={`relative h-full flex flex-col border-none rounded-[14px] overflow-hidden ${
                      isGreat
                        ? "bg-gradient-to-br from-lime-50 via-rose-50 to-green-50 dark:from-lime-950/40 dark:via-rose-950/30 dark:to-green-950/40"
                        : accent
                          ? "bg-gradient-to-b from-white via-lime-50/40 to-white dark:from-card dark:via-lime-950/10 dark:to-card"
                          : "bg-card"
                    }`}
                  >
                    {/* Decorative blobs */}
                    {isGreat ? (
                      <>
                        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-400/30 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-lime-400/30 blur-3xl pointer-events-none" />
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-green-400/20 blur-3xl pointer-events-none" />
                      </>
                    ) : (
                      accent && (
                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-lime-500/20 blur-3xl pointer-events-none" />
                      )
                    )}

                    <CardContent className="flex flex-col h-full p-5 relative z-10">
                      {/* Title */}
                      <div className="text-center mb-4">
                        <div
                          className={`inline-flex items-center justify-center rounded-xl mb-3 ${
                            isGreat
                              ? "h-12 w-12 bg-gradient-to-br from-green-400 via-lime-500 to-rose-500 text-white shadow-[0_10px_30px_-8px_rgba(244,63,94,0.6)] ring-2 ring-white/60 dark:ring-white/20"
                              : accent
                                ? "h-10 w-10 bg-gradient-to-br from-lime-500 to-lime-600 text-white shadow-lg shadow-lime-500/30"
                                : "h-10 w-10 bg-lime-500/10 text-lime-500"
                          }`}
                        >
                          <Dumbbell className={isGreat ? "h-6 w-6" : "h-5 w-5"} />
                        </div>
                        <h3
                          className={`font-black tracking-tight leading-tight min-h-[2.5rem] flex items-center justify-center ${
                            isGreat
                              ? "text-lg bg-gradient-to-r from-lime-600 via-rose-500 to-green-600 bg-clip-text text-transparent"
                              : "text-base"
                          }`}
                        >
                          {plan.name}
                        </h3>
                        {plan.tagline && (
                          <p className={`text-[11px] font-medium mt-1 line-clamp-1 ${isGreat ? "text-rose-600 dark:text-rose-300 font-bold uppercase tracking-wider" : "text-muted-foreground"}`}>
                            {plan.tagline}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div
                        className={`text-center py-4 mb-4 ${
                          isGreat
                            ? "border-y border-dashed border-rose-300/60 dark:border-rose-700/40"
                            : "border-y border-dashed border-lime-200/60 dark:border-lime-800/30"
                        }`}
                      >
                        <div className="flex items-baseline justify-center gap-0.5">
                          <span className={`font-bold ${isGreat ? "text-lg text-rose-500" : "text-base text-muted-foreground"}`}>₹</span>
                          <span
                            className={`font-black tracking-tight ${
                              isGreat
                                ? "text-5xl bg-gradient-to-r from-lime-500 via-rose-500 to-green-600 bg-clip-text text-transparent drop-shadow-sm"
                                : accent
                                  ? "text-4xl bg-gradient-to-r from-lime-500 to-lime-600 bg-clip-text text-transparent"
                                  : "text-4xl"
                            }`}
                          >
                            {plan.priceInr.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground ml-1">/{periodLabel}</span>
                        </div>
                        {plan.originalPriceInr > plan.priceInr && (
                          <div className="flex items-center justify-center gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground line-through">₹{plan.originalPriceInr.toLocaleString("en-IN")}</span>
                            {savings > 0 && (
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  isGreat
                                    ? "text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.6)]"
                                    : "text-emerald-600 bg-emerald-500/10"
                                }`}
                              >
                                SAVE {savings}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-5 flex-1 text-left">
                        <li className="flex items-start text-xs">
                          <Check className={`h-4 w-4 mr-2 shrink-0 mt-0.5 ${isGreat ? "text-rose-500" : accent ? "text-lime-500" : "text-emerald-500"}`} />
                          <span className="font-medium leading-snug"><strong>{plan.gymsIncluded}+</strong> premium gyms</span>
                        </li>
                        <li className="flex items-start text-xs">
                          <Check className={`h-4 w-4 mr-2 shrink-0 mt-0.5 ${isGreat ? "text-rose-500" : accent ? "text-lime-500" : "text-emerald-500"}`} />
                          <span className="font-medium leading-snug"><strong>{plan.classesPerMonth}</strong> classes / month</span>
                        </li>
                        {plan.perks.slice(0, 3).map(perk => (
                          <li key={perk} className={`flex items-start text-xs ${isGreat ? "text-foreground/80" : "text-muted-foreground"}`}>
                            <Check className={`h-4 w-4 mr-2 shrink-0 mt-0.5 ${isGreat ? "text-lime-500" : "opacity-60"}`} />
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
                            className={`w-full font-black tracking-[0.12em] border-none ${
                              isGreat
                                ? "h-12 text-sm bg-gradient-to-r from-green-400 via-lime-500 to-rose-500 hover:from-green-500 hover:via-lime-600 hover:to-rose-600 text-white shadow-[0_14px_36px_-10px_rgba(244,63,94,0.7)] ring-2 ring-white/40 dark:ring-white/10"
                                : accent
                                  ? "h-10 text-xs bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white shadow-[0_8px_24px_-8px_rgba(101, 163, 13,0.6)]"
                                  : "h-10 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                            }`}
                          >
                            {isGreat ? (
                              <><Flame className="h-4 w-4 mr-1.5 inline" /> CLAIM BEST DEAL</>
                            ) : (
                              "SELECT PLAN"
                            )}
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
