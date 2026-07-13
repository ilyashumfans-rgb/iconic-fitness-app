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
import { ArrowLeft, ArrowRight, Layers, Tag } from "lucide-react";
import { MembershipPlanGrid } from "@/components/MembershipPlanGrid";

function CategoryCard({
  name,
  imageUrl,
  count,
  allIcon,
  onClick,
}: {
  name: string;
  imageUrl: string;
  count: number;
  allIcon?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-3xl p-[1.5px] bg-gradient-to-br from-lime-500/60 via-border to-border shadow-lg shadow-lime-500/5 transition-all duration-300 [transform-style:preserve-3d] hover:[transform:perspective(900px)_rotateX(5deg)_translateY(-6px)] hover:shadow-2xl hover:shadow-lime-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
    >
      <div className="relative flex items-center gap-5 rounded-[calc(1.5rem-1.5px)] bg-card px-6 py-6 overflow-hidden">
        {/* Sheen highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
        {/* Glow blob */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-lime-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-60" />

        {/* Logo — raised circle on the left */}
        <div className="relative shrink-0 h-16 w-16 rounded-full p-[2px] bg-gradient-to-br from-lime-500/60 to-transparent shadow-xl shadow-black/30 transition-transform duration-300 group-hover:scale-110 group-hover:[transform:translateZ(30px)_scale(1.1)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-lime-500/10 flex items-center justify-center">
              {allIcon ? (
                <Layers className="h-6 w-6 text-lime-500" />
              ) : (
                <Tag className="h-6 w-6 text-lime-500" />
              )}
            </div>
          )}
        </div>

        {/* Name on the right */}
        <div className="min-w-0 flex-1">
          <div className="text-xl font-black tracking-tight truncate">{name}</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {count} {count === 1 ? "package" : "packages"}
          </div>
        </div>

        <div className="shrink-0 h-9 w-9 rounded-full bg-lime-500 text-black flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
          <ArrowRight className="h-4 w-4" />
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

  // null = category picker; 0 = "All packages"; >0 = specific category
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
  const showPicker = hasCategories && (categoryId === null || (categoryId !== 0 && !openCategory));

  const visiblePlans =
    !hasCategories || categoryId === 0 || !openCategory
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

          <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto [perspective:1200px]">
            {categories.map((c) => (
              <CategoryCard
                key={c.id}
                name={c.name}
                imageUrl={c.imageUrl ?? ""}
                count={countFor(c)}
                onClick={() => setCategoryId(c.id)}
              />
            ))}
            <CategoryCard
              name="All packages"
              imageUrl=""
              allIcon
              count={annualPlans.length}
              onClick={() => setCategoryId(0)}
            />
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
              {openCategory ? openCategory.name : "All packages"} — back to categories
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
              !hasCategories || categoryId === 0
                ? "Annual offers are on the way. Check back soon."
                : "No packages in this category yet. Try another one."
            }
          />
        </section>
      )}
    </div>
  );
}
