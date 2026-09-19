import { Fragment, useEffect, useRef, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi, type YoactivMemberDetail } from "@/lib/adminApi";
import { MemberAvatar } from "@/components/admin/MemberAvatar";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  X,
} from "lucide-react";

type UserRow = {
  id: number;
  username: string | null;
  name: string;
  email: string;
  mobile: string;
  clerkLinked: boolean;
  avatarUrl: string | null;
  city: string;
  joinedAt: string;
  streakDays: number;
  planName: string | null;
  planStatus: string;
};

type YoactivDetailState = {
  mobile: string;
  loading: boolean;
  data?: YoactivMemberDetail;
  error?: string;
};

function generateTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  const random = Array.from(
    values,
    (value) => alphabet[value % alphabet.length],
  ).join("");
  return `If!8${random}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [detailStates, setDetailStates] = useState<
    Record<number, YoactivDetailState | undefined>
  >({});
  const detailRequestSeq = useRef<Record<number, number>>({});
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginMobile, setLoginMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    adminApi.users.list().then(setRows).catch(() => {});
  }, []);

  const filtered = rows.filter((u) => {
    const query = q.trim().toLowerCase();
    const mobileQuery = mobileFilter.replace(/\D/g, "");
    const mobile = u.mobile.replace(/\D/g, "");
    const matchesGeneral =
      !query ||
      u.name.toLowerCase().includes(query) ||
      (u.username ?? "").toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.city.toLowerCase().includes(query);
    const matchesMobile = !mobileQuery || mobile.includes(mobileQuery);
    return matchesGeneral && matchesMobile;
  });

  const toggleDetails = async (user: UserRow) => {
    if (expandedUserId === user.id) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(user.id);
    const normalizedMobile = user.mobile.replace(/\D/g, "").slice(-10);
    if (!normalizedMobile) {
      setDetailStates((current) => ({
        ...current,
        [user.id]: {
          mobile: "",
          loading: false,
          error:
            "Add this member's login mobile before loading YoActiv details.",
        },
      }));
      return;
    }
    const existing = detailStates[user.id];
    if (
      existing?.mobile === normalizedMobile &&
      (existing.loading || existing.data)
    ) {
      return;
    }
    const requestSeq = (detailRequestSeq.current[user.id] ?? 0) + 1;
    detailRequestSeq.current[user.id] = requestSeq;
    setDetailStates((current) => ({
      ...current,
      [user.id]: { mobile: normalizedMobile, loading: true },
    }));
    try {
      const detail = await adminApi.yoactiv.memberDetail(normalizedMobile);
      if (detailRequestSeq.current[user.id] !== requestSeq) return;
      setDetailStates((current) => ({
        ...current,
        [user.id]: {
          mobile: normalizedMobile,
          loading: false,
          data: detail,
        },
      }));
    } catch (err) {
      if (detailRequestSeq.current[user.id] !== requestSeq) return;
      setDetailStates((current) => ({
        ...current,
        [user.id]: {
          mobile: normalizedMobile,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Could not load YoActiv member details.",
        },
      }));
    }
  };

  const openReset = (user: UserRow) => {
    setResetting(user);
    setLoginUsername(user.username || "");
    setLoginMobile(user.mobile || "");
    setPassword(generateTemporaryPassword());
    setShowPassword(false);
    setResetError("");
    setResetDone(false);
    setCopied(false);
  };

  const closeReset = () => {
    setResetting(null);
    setLoginUsername("");
    setLoginMobile("");
    setPassword("");
    setShowPassword(false);
    setResetError("");
    setResetDone(false);
    setCopied(false);
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetting || resetBusy) return;
    const normalizedMobile = loginMobile
      ? loginMobile.replace(/\D/g, "").slice(-10)
      : "";
    if (loginMobile.trim() && normalizedMobile.length !== 10) {
      setResetError("Enter the member's valid 10-digit login mobile number.");
      return;
    }
    const normalizedUsername = loginUsername.trim().toLowerCase();
    if (
      normalizedUsername &&
      !/^[a-z][a-z0-9._]{2,29}$/.test(normalizedUsername)
    ) {
      setResetError(
        "Username must be 3–30 characters, start with a letter, and use only letters, numbers, dots, or underscores.",
      );
      return;
    }
    if (password.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    setResetBusy(true);
    setResetError("");
    setResetDone(false);
    try {
      const result = await adminApi.users.resetPassword(
        resetting.id,
        { username: normalizedUsername, mobile: normalizedMobile },
        password,
      );
      setRows((current) =>
        current.map((user) =>
          user.id === resetting.id
            ? {
                ...user,
                username: result.username,
                email: result.email,
                mobile: result.mobile,
              }
            : user,
        ),
      );
      setResetting((current) =>
        current
          ? {
              ...current,
              username: result.username,
              email: result.email,
              mobile: result.mobile,
            }
          : current,
      );
      setLoginUsername(result.username ?? "");
      setLoginMobile(result.mobile);
      detailRequestSeq.current[resetting.id] =
        (detailRequestSeq.current[resetting.id] ?? 0) + 1;
      setDetailStates((current) => {
        const next = { ...current };
        delete next[resetting.id];
        return next;
      });
      setExpandedUserId((current) =>
        current === resetting.id ? null : current,
      );
      setResetDone(true);
      setShowPassword(true);
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Password could not be updated.",
      );
    } finally {
      setResetBusy(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setResetError("Copy failed. Select the password and copy it manually.");
    }
  };

  return (
    <AdminLayout
      title="Users"
      actions={
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username, name, email or city…"
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          />
          <input
            type="tel"
            inputMode="numeric"
            value={mobileFilter}
            onChange={(e) => setMobileFilter(e.target.value)}
            placeholder="Filter by mobile…"
            aria-label="Filter users by mobile number"
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
          />
        </div>
      }
    >
      <div className="mb-4 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg p-3 leading-relaxed">
        <span className="font-semibold text-slate-200">
          Member passwords are securely managed by Clerk.
        </span>{" "}
        You can set a new password for a linked member below. Existing passwords
        can never be viewed; a newly set password is visible only until you
        close the reset panel.
      </div>
      {resetting && (
        <AdminCard className="p-5 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-white">
                Set password — {resetting.name}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Confirm this member's login identifiers, then set a new password.
              </p>
            </div>
            <button
              type="button"
              onClick={closeReset}
              className="text-slate-400 hover:text-white"
              aria-label="Close password reset"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {resetError && (
            <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {resetError}
            </div>
          )}
          {resetDone && (
            <div className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              Password updated. The member's other login sessions were signed
              out. Copy this password before closing.
            </div>
          )}

          <form
            onSubmit={submitReset}
            className="space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="block mb-1 text-xs font-medium text-slate-300">
                Username
              </span>
              <input
                type="text"
                value={loginUsername}
                onChange={(event) => {
                  setLoginUsername(event.target.value);
                  setResetDone(false);
                }}
                placeholder="Not added"
                autoCapitalize="none"
                aria-label="Member login username"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
              />
            </label>
            <label className="block">
              <span className="block mb-1 text-xs font-medium text-slate-300">
                Account email
              </span>
              <input
                type="email"
                value={resetting.email}
                readOnly
                aria-label="Member account email"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
              />
            </label>
            <label className="block">
              <span className="block mb-1 text-xs font-medium text-slate-300">
                Login mobile number
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={loginMobile}
                onChange={(event) => {
                  setLoginMobile(event.target.value);
                  setResetDone(false);
                }}
                placeholder="10-digit mobile number"
                aria-label="Member login mobile number"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
              />
            </label>
            </div>
            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setResetDone(false);
                  setCopied(false);
                }}
                minLength={8}
                maxLength={200}
                required
                autoComplete="new-password"
                aria-label="New member password"
                className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPassword(generateTemporaryPassword());
                  setShowPassword(true);
                  setResetDone(false);
                  setCopied(false);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4" />
                Generate
              </button>
              <button
                type="button"
                onClick={() => void copyPassword()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="submit"
                disabled={resetBusy}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 text-white font-semibold disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {resetBusy ? "Updating…" : "Save login & password"}
              </button>
            </div>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            This updates the selected member's username, login mobile and password only.
            Membership, plan, payment and activity data are not changed.
          </p>
        </AdminCard>
      )}
      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Mobile</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">App plan</th>
              <th className="px-5 py-3">Streak</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Login</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <Fragment key={u.id}>
              <tr
                className="border-b border-slate-800/60 hover:bg-slate-800/30"
              >
                <td className="px-5 py-3 font-medium text-white">
                  <div className="flex items-center gap-2.5">
                    <MemberAvatar name={u.name} avatarUrl={u.avatarUrl} />
                    <span>{u.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-300">
                  {u.username ? (
                    `@${u.username}`
                  ) : (
                    <span className="text-amber-500">Not added</span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-300">{u.email}</td>
                <td className="px-5 py-3 text-slate-400">
                  {u.mobile || <span className="text-amber-500">Not added</span>}
                </td>
                <td className="px-5 py-3 text-slate-400">{u.city}</td>
                <td className="px-5 py-3">
                  {u.planName ? (
                    <span className="text-xs px-2 py-1 rounded bg-lime-500/15 text-lime-700 border border-lime-500/30">
                      {u.planName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-300">{u.streakDays}d</td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {new Date(u.joinedAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleDetails(u)}
                      aria-expanded={expandedUserId === u.id}
                      aria-controls={`user-${u.id}-yoactiv-details`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      {expandedUserId === u.id ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      Branch & plans
                    </button>
                    <button
                      type="button"
                      onClick={() => openReset(u)}
                      disabled={!u.clerkLinked}
                      title={
                        u.clerkLinked
                          ? "Set a new login password"
                          : "Member has not created a login account"
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-lime-500/30 bg-lime-500/10 text-lime-300 hover:bg-lime-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Set password
                    </button>
                  </div>
                </td>
              </tr>
              {expandedUserId === u.id && (
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  <td
                    id={`user-${u.id}-yoactiv-details`}
                     colSpan={9}
                    className="px-5 py-4"
                  >
                    {detailStates[u.id]?.loading ? (
                      <p className="text-sm text-slate-400">
                        Loading YoActiv branch and plan details…
                      </p>
                    ) : detailStates[u.id]?.error ? (
                      <p className="text-sm text-amber-400">
                        {detailStates[u.id]?.error}
                      </p>
                    ) : !detailStates[u.id]?.data ||
                      detailStates[u.id]?.data?.memberships.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No YoActiv plan history found for this mobile number.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                              <th className="pb-2 pr-4">Branch</th>
                              <th className="pb-2 pr-4">Plan</th>
                              <th className="pb-2 pr-4">Status</th>
                              <th className="pb-2 pr-4">Start</th>
                              <th className="pb-2 pr-4">Expiry</th>
                              <th className="pb-2 pr-4">Sessions</th>
                              <th className="pb-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailStates[u.id]!.data!.memberships.map((membership, index) => (
                              <tr
                                key={`${membership.branchId}-${membership.planName}-${index}`}
                                className="border-t border-slate-800"
                              >
                                <td className="py-2 pr-4 text-white">
                                  {membership.branchName ||
                                    `Branch ${membership.branchId}`}
                                </td>
                                <td className="py-2 pr-4">
                                  <div className="font-medium text-slate-200">
                                    {membership.planName || "Unnamed plan"}
                                  </div>
                                  {membership.serviceName &&
                                    membership.serviceName !==
                                      membership.planName && (
                                      <div className="text-xs text-slate-500">
                                        {membership.serviceName}
                                      </div>
                                    )}
                                </td>
                                <td className="py-2 pr-4 capitalize text-slate-300">
                                  {membership.status}
                                </td>
                                <td className="py-2 pr-4 text-slate-300">
                                  {formatDate(membership.startDate)}
                                </td>
                                <td className="py-2 pr-4 text-slate-300">
                                  {formatDate(membership.expiryDate)}
                                </td>
                                <td className="py-2 pr-4 text-slate-300">
                                  {membership.sessionsTotal !== null
                                    ? `${membership.sessionsUsed ?? 0}/${membership.sessionsTotal}`
                                    : "—"}
                                </td>
                                <td className="py-2 text-slate-300">
                                  {membership.amountInr !== null
                                    ? `₹${membership.amountInr.toLocaleString("en-IN")}`
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table></div>
      </AdminCard>
    </AdminLayout>
  );
}
