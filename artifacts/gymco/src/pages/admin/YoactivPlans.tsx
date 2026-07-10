import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type YoactivAdminPackage } from "@/lib/adminApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminYoactivPlans() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<number | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["admin", "yoactiv", "branches"],
    queryFn: adminApi.yoactiv.branches,
  });
  const branches = branchesQuery.data ?? [];

  const packagesQuery = useQuery({
    queryKey: ["admin", "yoactiv", "packages", branchId],
    queryFn: () => adminApi.yoactiv.packages(branchId!),
    enabled: branchId !== null,
  });
  const packages = packagesQuery.data ?? [];

  const visibilityMutation = useMutation({
    // branchId travels in the mutation variables so a mid-flight branch
    // switch can't update or invalidate the wrong branch's cache.
    mutationFn: ({
      pkg,
      hidden,
      branchId: forBranch,
    }: {
      pkg: YoactivAdminPackage;
      hidden: boolean;
      branchId: number;
    }) => adminApi.yoactiv.setPackageVisibility(pkg.id, forBranch, hidden),
    onMutate: async ({ pkg, hidden, branchId: forBranch }) => {
      const key = ["admin", "yoactiv", "packages", forBranch];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<YoactivAdminPackage[]>(key);
      queryClient.setQueryData<YoactivAdminPackage[]>(key, (old) =>
        (old ?? []).map((p) => (p.id === pkg.id ? { ...p, hidden } : p)),
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error("Could not update plan visibility. Please try again.");
    },
    onSuccess: (_data, { pkg, hidden }) => {
      toast.success(
        hidden
          ? `"${pkg.name}" hidden from members`
          : `"${pkg.name}" is now visible to members`,
      );
    },
    onSettled: (_data, _err, { branchId: forBranch }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "yoactiv", "packages", forBranch],
      });
    },
  });

  const groups = useMemo(() => {
    const memberships = packages.filter((p) => !p.pt);
    const pt = packages.filter((p) => p.pt);
    return [
      { title: "Membership plans", note: "Shown in the app's package purchase flow", items: memberships },
      { title: "Personal training packages", note: "Shown in the app's trainer booking flow", items: pt },
    ].filter((g) => g.items.length > 0);
  }, [packages]);

  return (
    <AdminLayout title="YoActiv Plans">
      <AdminCard className="p-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Live plans from the YoActiv billing system for each branch. Names
            and prices are managed in YoActiv; here you control which plans
            members can see and buy online.
          </p>
          <div className="max-w-sm">
            <Select
              value={branchId !== null ? String(branchId) : undefined}
              onValueChange={(v) => setBranchId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.branchId} value={String(b.branchId)}>
                    {b.gymLabel ?? b.branchName ?? `Branch ${b.branchId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {branchesQuery.isSuccess && branches.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">
              No YoActiv branches configured. Map gyms to their YoActiv Branch
              ID in Gym Management first.
            </p>
          ) : null}
        </div>

        {branchId === null ? null : packagesQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : packagesQuery.isError ? (
          <p className="text-sm text-destructive">
            Couldn't load plans for this branch. Please try again.
          </p>
        ) : packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No paid plans found for this branch in YoActiv.
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.title}>
                <div className="mb-3">
                  <h3 className="font-semibold">{group.title}</h3>
                  <p className="text-xs text-muted-foreground">{group.note}</p>
                </div>
                <div className="border rounded-lg divide-y">
                  {group.items.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {p.name}
                          {p.hidden ? (
                            <Badge variant="secondary" className="ml-2 align-middle">
                              Hidden
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {p.serviceName}
                          {p.duration ? ` · ${p.duration}` : ""}
                          {p.sessions ? ` · ${p.sessions} sessions` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="font-semibold whitespace-nowrap">
                          ₹{p.amountInr.toLocaleString("en-IN")}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {p.hidden ? "Hidden" : "Visible"}
                          </span>
                          <Switch
                            checked={!p.hidden}
                            disabled={visibilityMutation.isPending || branchId === null}
                            onCheckedChange={(checked) =>
                              branchId !== null &&
                              visibilityMutation.mutate({
                                pkg: p,
                                hidden: !checked,
                                branchId,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </AdminLayout>
  );
}
