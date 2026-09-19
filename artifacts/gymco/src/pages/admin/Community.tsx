import { useEffect, useRef, useState } from "react";
import { AdminCard, AdminLayout } from "@/components/admin/AdminLayout";
import {
  Check,
  ChevronDown,
  EyeOff,
  Image as ImageIcon,
  Inbox,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  adminApi,
  type CommunityAdminPost,
  type CommunityReviewAction,
  type CommunityStatus,
} from "@/lib/adminApi";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: CommunityStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "unpublished", label: "Unpublished" },
  { value: "withdrawn", label: "Withdrawn" },
];

const STATUS_STYLES: Record<CommunityStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  unpublished: "bg-slate-100 text-slate-700 border-slate-200",
  withdrawn: "bg-violet-100 text-violet-700 border-violet-200",
};

const STATUS_LABELS: Record<CommunityStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  unpublished: "Unpublished",
  withdrawn: "Withdrawn",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: CommunityStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ProtectedPhoto({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  const isProtectedMediaPath = Boolean(
    url && /^\/api\/community\/media\/[0-9a-f-]{36}$/i.test(url),
  );

  if (!isProtectedMediaPath || failed) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
        <div>
          <ImageIcon className="mx-auto mb-1 h-5 w-5 opacity-50" />
          {failed ? "Photo unavailable" : "No photo"}
        </div>
      </div>
    );
  }

  // The media endpoint is intentionally used as-is. It is a protected API
  // path, so the browser sends the admin session cookie with this same-origin
  // image request; no raw upload/storage path is exposed by the portal.
  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-100">
      <img
        src={url ?? undefined}
        alt={label}
        loading="lazy"
        className="aspect-[4/3] w-full object-cover"
        onError={() => setFailed(true)}
      />
      <span className="absolute bottom-2 left-2 rounded-md bg-slate-900/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        {label}
      </span>
    </div>
  );
}

function actionLabel(action: CommunityReviewAction) {
  if (action === "approve") return "approve";
  if (action === "reject") return "reject";
  return "unpublish";
}

export default function AdminCommunity() {
  const [status, setStatus] = useState<CommunityStatus>("pending");
  const [rows, setRows] = useState<CommunityAdminPost[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{
    post: CommunityAdminPost;
    reason: string;
  } | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    const version = ++requestVersion.current;
    let active = true;
    setRows([]);
    setNextBeforeId(null);
    setError(null);
    setLoading(true);
    setLoadingMore(false);

    adminApi.community
      .list(status, { limit: PAGE_SIZE })
      .then((result) => {
        if (!active || version !== requestVersion.current) return;
        setRows(result.items);
        setNextBeforeId(result.nextBeforeId);
      })
      .catch((cause: unknown) => {
        if (!active || version !== requestVersion.current) return;
        setError(cause instanceof Error ? cause.message : "Could not load community submissions");
      })
      .finally(() => {
        if (active && version === requestVersion.current) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  const loadMore = async () => {
    if (!nextBeforeId || loadingMore) return;
    const version = requestVersion.current;
    const beforeId = nextBeforeId;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await adminApi.community.list(status, {
        limit: PAGE_SIZE,
        beforeId,
      });
      if (version !== requestVersion.current) return;
      setRows((current) => [...current, ...result.items]);
      setNextBeforeId(result.nextBeforeId);
    } catch (cause: unknown) {
      if (version === requestVersion.current) {
        setError(cause instanceof Error ? cause.message : "Could not load more submissions");
      }
    } finally {
      if (version === requestVersion.current) setLoadingMore(false);
    }
  };

  const review = async (
    post: CommunityAdminPost,
    action: CommunityReviewAction,
    reason = "",
  ) => {
    if (busyId !== null) return;
    const cleanReason = reason.trim();
    if (action === "reject" && !cleanReason) {
      setError("A rejection reason is required.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel(action)} this community post by ${post.authorName || "this member"}?`,
      )
    ) {
      return;
    }

    setBusyId(post.id);
    setError(null);
    try {
      await adminApi.community.review(post.id, action, cleanReason);
      // The row no longer belongs in the active server-side status filter.
      setRows((current) => current.filter((item) => item.id !== post.id));
      if (rejectTarget?.post.id === post.id) setRejectTarget(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not update this submission");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout title="Community">
      <div className="space-y-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-lime-600" />
            Review member transformation stories
          </div>
          <p className="text-sm text-slate-500">
            Photos remain private until a consented submission is approved.
          </p>
        </div>

        <AdminCard className="overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  status === filter.value
                    ? "bg-lime-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-lime-50 hover:text-lime-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </AdminCard>

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="shrink-0 text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm">Loading submissions…</span>
          </div>
        ) : rows.length === 0 ? (
          <AdminCard className="px-6 py-16 text-center text-slate-500">
            <Inbox className="mx-auto mb-3 h-9 w-9 text-slate-300" />
            <p className="font-semibold text-slate-700">
              No {STATUS_LABELS[status].toLowerCase()} community posts
            </p>
            <p className="mt-1 text-sm">New member submissions will appear here.</p>
          </AdminCard>
        ) : (
          <div className="space-y-4">
            {rows.map((post) => {
              const isBusy = busyId === post.id;
              const canApprove =
                post.status === "pending" ||
                post.status === "rejected" ||
                post.status === "unpublished";
              const canReject =
                post.status === "pending" || post.status === "approved";
              const canUnpublish = post.status === "approved";

              return (
                <AdminCard key={post.id} className="overflow-hidden">
                  <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime-100 font-bold text-lime-700">
                          {(post.authorName || "M").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            {post.authorName || "Member"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Submitted {formatDate(post.submittedAt)} · Post #{post.id}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={post.status} />
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {post.caption || <span className="italic text-slate-400">No caption</span>}
                    </p>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Trainer
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {post.trainerName || "Not selected"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Public consent
                        </dt>
                        <dd
                          className={`mt-0.5 font-semibold ${
                            post.publicSharingConsent ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {post.publicSharingConsent ? "Granted" : "Not granted"}
                        </dd>
                      </div>
                      {post.reviewedAt && (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Last reviewed
                          </dt>
                          <dd className="mt-0.5 font-medium text-slate-700">
                            {formatDate(post.reviewedAt)}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {post.rejectionReason && (
                      <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <span className="font-semibold">Rejection reason:</span>{" "}
                        {post.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-4 sm:p-5">
                    <ProtectedPhoto url={post.beforeImageUrl} label="Before" />
                    <ProtectedPhoto url={post.afterImageUrl} label="After" />
                  </div>

                  {(canApprove || canReject || canUnpublish) && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                      {canApprove && (
                        <button
                          type="button"
                          disabled={isBusy || busyId !== null}
                          onClick={() => void review(post, "approve")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve
                        </button>
                      )}
                      {canReject && (
                        <button
                          type="button"
                          disabled={isBusy || busyId !== null}
                          onClick={() =>
                            setRejectTarget({
                              post,
                              reason: post.rejectionReason ?? "",
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      )}
                      {canUnpublish && (
                        <button
                          type="button"
                          disabled={isBusy || busyId !== null}
                          onClick={() => void review(post, "unpublish")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <EyeOff className="h-4 w-4" />
                          Unpublish
                        </button>
                      )}
                      {isBusy && (
                        <span className="text-xs text-slate-400">Saving moderation decision…</span>
                      )}
                    </div>
                  )}
                </AdminCard>
              );
            })}
          </div>
        )}

        {!loading && nextBeforeId && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-lime-200 bg-white px-4 py-2.5 text-sm font-semibold text-lime-700 transition-colors hover:bg-lime-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Load older posts
            </button>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setRejectTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-community-title"
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="reject-community-title" className="font-bold text-slate-900">
                  Reject community post
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  A reason is required and will be visible to the member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close rejection dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <label
                htmlFor="community-rejection-reason"
                className="text-sm font-semibold text-slate-700"
              >
                Rejection reason
              </label>
              <textarea
                id="community-rejection-reason"
                value={rejectTarget.reason}
                maxLength={500}
                rows={4}
                onChange={(event) =>
                  setRejectTarget((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                placeholder="Explain what needs to be changed before this can be approved…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{rejectTarget.reason.trim() ? "Reason provided" : "Reason required"}</span>
                <span>{rejectTarget.reason.length}/500</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={busyId === rejectTarget.post.id}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === rejectTarget.post.id || !rejectTarget.reason.trim()}
                onClick={() =>
                  void review(rejectTarget.post, "reject", rejectTarget.reason)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === rejectTarget.post.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}