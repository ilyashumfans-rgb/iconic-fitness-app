import { Link } from "wouter";
import {
  useListMemberships,
  getListMembershipsQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Sparkles, ArrowRight } from "lucide-react";

export function PricingTeaserSection() {
  const { data: plans, isLoading } = useListMemberships({
    query: { queryKey: getListMembershipsQueryKey() },
  });

  // Show every plan, sorted by price ascending, with the popular plan forced last.
  const ordered = (plans ?? [])
    .slice()
    .sort((a, b) => {
      if (a.popular && !b.popular) return 1;
      if (!a.popular && b.popular) return -1;
      return a.priceInr - b.priceInr;
    });

  return (
    <section className="py-4">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-lime-600 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Pricing
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Pick a pass. Train anywhere.
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            One membership. Unlimited gyms across the city.
          </p>
        </div>
        <Link
          href="/memberships"
          className="hidden sm:inline-flex items-center text-sm text-lime-600 font-semibold"
        >
          See all plans <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : ordered.length === 0 ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch pt-3">
          {ordered.map((plan) => {
            const period =
              plan.billingPeriod === "monthly"
                ? "mo"
                : plan.billingPeriod === "annual"
                  ? "yr"
                  : "qtr";
            const savings =
              plan.originalPriceInr > plan.priceInr
                ? Math.round(
                    ((plan.originalPriceInr - plan.priceInr) /
                      plan.originalPriceInr) *
                      100,
                  )
                : 0;
            return (
              <Card
                key={plan.id}
                className={`relative p-5 flex flex-col rounded-2xl ${
                  plan.popular
                    ? "bg-lime-50 dark:bg-lime-950/20 ring-1 ring-lime-300 dark:ring-lime-800"
                    : "border-border/60"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-lime-100 text-lime-700 ring-1 ring-lime-300 text-[10px] font-black tracking-[0.18em] shadow-sm">
                    <Crown className="h-3 w-3 mr-1 inline -mt-0.5" />
                    POPULAR
                  </div>
                )}
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-1">
                  {plan.name}
                </div>
                {plan.tagline && (
                  <div className="text-[11px] font-semibold text-lime-600 mt-0.5">
                    {plan.tagline}
                  </div>
                )}
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-sm font-bold text-muted-foreground">
                    ₹
                  </span>
                  <span className="text-4xl font-black tracking-tight text-lime-600">
                    {plan.priceInr.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    /{period}
                  </span>
                </div>
                {savings > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs line-through text-muted-foreground">
                      ₹{plan.originalPriceInr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                      SAVE {savings}%
                    </span>
                  </div>
                )}
                <ul className="mt-4 space-y-1.5 text-sm flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-lime-500 mt-0.5 shrink-0" />
                    <span>
                      <strong>{plan.gymsIncluded}+</strong> premium gyms
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-lime-500 mt-0.5 shrink-0" />
                    <span>
                      <strong>{plan.classesPerMonth}</strong> classes / month
                    </span>
                  </li>
                  {plan.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <Check className="h-4 w-4 text-lime-500/70 mt-0.5 shrink-0" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/be-a-member" className="mt-4">
                  <Button
                    className={`w-full font-black tracking-[0.12em] border-none !bg-none ${
                      plan.popular
                        ? "bg-lime-500 hover:bg-lime-600 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    GET THIS PLAN
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-5 sm:hidden">
        <Link
          href="/memberships"
          className="inline-flex items-center text-sm text-lime-600 font-semibold"
        >
          See all plans <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </section>
  );
}
