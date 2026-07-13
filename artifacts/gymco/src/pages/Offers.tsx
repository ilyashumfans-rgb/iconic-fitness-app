import {
  useListMemberships,
  useGetMyMembership,
  useListPackageCategories,
  getListMembershipsQueryKey,
  getGetMyMembershipQueryKey,
  getListPackageCategoriesQueryKey,
  type PackageCategory,
} from "@workspace/api-client-react";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Tag } from "lucide-react";
import { MembershipPlanGrid } from "@/components/MembershipPlanGrid";

// Matches the plan-card family: gradient hairline border, media block left, details right.
function CategoryCard({
  name,
  imageUrl,
  count,
  onClick,
}: {
  name: string;
  imageUrl: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl p-[1px] bg-gradient-to-b from-border to-border/40 hover:from-lime-300/60 hover:to-lime-500/30 hover:-translate-y-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
    >
      <div className="flex h-[138px] overflow-hidden rounded-[calc(1rem-1px)] bg-card">
        {/* Media block on the left */}
        <div className="w-[122px] shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-lime-500/20 to-transparent flex items-center justify-center">
              <Tag className="h-7 w-7 text-lime-500" />
            </div>
          )}
        </div>

        {/* Details on the right */}
        <div className="flex flex-1 flex-col px-5 py-4 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-black tracking-tight truncate">{name}</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {count} {count === 1 ? "package" : "packages"}
            </div>
          </div>
          <div className="h-px bg-border my-2.5" />
          <div className="flex items-center">
            <span className="text-sm font-semibold text-lime-600 group-hover:text-lime-500 transition-colors">
              View packages
            </span>
            <span className="flex-1" />
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Offers() {
  const { data: myMembership } = useGetMyMembership({ query: { queryKey: getGetMyMembershipQueryKey() } });
  const { data: plans, isLoading: loadingPlans } = useListMemberships({ query: { queryKey: getListMembershipsQueryKey() } });
  const {
    data: categoriesData,
    isSuccess: categoriesLoaded,
    isError: categoriesFailed,
  } = useListPackageCategories({ query: { queryKey: getListPackageCategoriesQueryKey() } });

  // null = category picker; >0 = specific category open
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const categories = categoriesData ?? [];
  // Wait until the categories query settles before choosing picker vs list,
  // otherwise the plan grid flashes first and then jumps to the category picker.
  const categoriesSettled = categoriesLoaded || categoriesFailed;
  const hasCategories = categories.length > 0;

  // Offers page shows the annual plans created under the admin "Annual Plans" tab.
  const annualPlans = (plans ?? []).filter((p) => p.billingPeriod === "annual");

  const countFor = (c: PackageCategory) =>
    annualPlans.filter((p) => (p.categoryId ?? 0) === c.id).length;

  // If the open category was hidden/deleted, fall back to the picker.
  const openCategory = categories.find((c) => c.id === categoryId);
  const showPicker = hasCategories && (categoryId === null || !openCategory);

  const visiblePlans =
    !hasCategories || !openCategory
      ? annualPlans
      : annualPlans.filter((p) => (p.categoryId ?? 0) === categoryId);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80 mb-2">Annual Savings</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Special <span className="text-gradient-brand">Offers.</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Go annual and save the most across the year.</p>
      </div>

      {!categoriesSettled && categoryId === null ? (
        <section className="flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-2 border-lime-500/30 border-t-lime-500 animate-spin" />
        </section>
      ) : showPicker ? (
        <section>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-[11px] font-black tracking-[0.2em] text-lime-600 uppercase mb-3">
              <Tag className="h-3 w-3" /> Pick a category
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-2">Explore by category.</h2>
            <p className="text-muted-foreground">Choose a category to see its yearly packages.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto">
            {categories.map((c) => (
              <CategoryCard
                key={c.id}
                name={c.name}
                imageUrl={c.imageUrl ?? ""}
                count={countFor(c)}
                onClick={() => setCategoryId(c.id)}
              />
            ))}
          </div>
        </section>
      ) : (
        <section>
          {hasCategories ? (
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-border bg-card text-sm font-semibold hover:border-lime-500/50 hover:text-lime-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {openCategory ? openCategory.name : "Packages"} — back to categories
            </button>
          ) : (
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-[11px] font-black tracking-[0.2em] text-lime-600 uppercase mb-3">
                <Tag className="h-3 w-3" /> Best value
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-2">Yearly plans, bigger savings.</h2>
              <p className="text-muted-foreground">Commit for the year and unlock our lowest per-month pricing.</p>
            </div>
          )}

          <MembershipPlanGrid
            plans={visiblePlans}
            loading={loadingPlans}
            currentPlanId={myMembership?.planId}
            emptyTitle="No offers right now"
            emptyMessage={
              !hasCategories
                ? "Annual offers are on the way. Check back soon."
                : "No packages in this category yet. Try another one."
            }
          />
        </section>
      )}
    </div>
  );
}
