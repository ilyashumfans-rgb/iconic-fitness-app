import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useSignIn, useUser, useClerk } from "@clerk/react";
import { adminApi } from "@/lib/adminApi";
import { Loader2, ShieldCheck } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.736 32.667 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Clerk hooks are only available when ClerkProvider is mounted (i.e. when
  // VITE_CLERK_PUBLISHABLE_KEY is set). Wrap in try so the page still renders
  // when Clerk isn't configured — admin can still sign in via password.
  let clerk: ReturnType<typeof useClerk> | null = null;
  let signIn: ReturnType<typeof useSignIn> | null = null;
  let user: ReturnType<typeof useUser> | null = null;
  try {
    clerk = useClerk();
    signIn = useSignIn();
    user = useUser();
  } catch {
    // Clerk not available — Google option will be hidden.
  }
  const clerkAvailable = !!signIn && !!user;
  const isSignedInToClerk = !!user?.isSignedIn;
  const clerkEmail =
    user?.user?.primaryEmailAddress?.emailAddress ??
    user?.user?.emailAddresses?.[0]?.emailAddress ??
    "";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await adminApi.login(email, password);
      navigate("/admin");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = async () => {
    setErr(null);
    setGoogleBusy(true);
    try {
      // If the user is already signed in to Clerk, skip the OAuth bounce
      // and just exchange the session for an admin login.
      if (isSignedInToClerk) {
        await continueAsClerkUser();
        return;
      }
      // `useSignIn()` returns { signIn, errors, fetchStatus } where `signIn`
      // is the SignInResource itself — call authenticateWithRedirect on it.
      const resource = (signIn as unknown as {
        signIn?: {
          authenticateWithRedirect?: (args: {
            strategy: string;
            redirectUrl: string;
            redirectUrlComplete: string;
          }) => Promise<void>;
        };
      })?.signIn;
      if (resource && typeof resource.authenticateWithRedirect === "function") {
        await resource.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `${basePath}/admin/sso-callback`,
          redirectUrlComplete: `${basePath}/admin/sso-callback`,
        });
        return;
      }
      // Fallback: use the top-level Clerk instance, which exposes the same
      // OAuth-redirect helper and is available even before sign-in resource
      // is ready.
      const clerkAny = clerk as unknown as {
        client?: {
          signIn?: {
            authenticateWithRedirect?: (args: {
              strategy: string;
              redirectUrl: string;
              redirectUrlComplete: string;
            }) => Promise<void>;
          };
        };
        redirectWithAuth?: (url: string) => Promise<void>;
        openSignIn?: (opts?: Record<string, unknown>) => void;
      } | null;
      const clientResource = clerkAny?.client?.signIn;
      if (
        clientResource &&
        typeof clientResource.authenticateWithRedirect === "function"
      ) {
        await clientResource.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `${basePath}/admin/sso-callback`,
          redirectUrlComplete: `${basePath}/admin/sso-callback`,
        });
        return;
      }
      // Last resort: open Clerk's hosted sign-in modal with Google preferred.
      if (clerkAny?.openSignIn) {
        clerkAny.openSignIn({
          redirectUrl: `${basePath}/admin/sso-callback`,
        });
        return;
      }
      throw new Error("Google sign-in is not available right now.");
    } catch (e) {
      setGoogleBusy(false);
      setErr(e instanceof Error ? e.message : "Could not start Google sign-in");
    }
  };

  const continueAsClerkUser = async () => {
    setErr(null);
    setGoogleBusy(true);
    try {
      await adminApi.googleLogin();
      navigate("/admin");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Not authorized as admin");
    } finally {
      setGoogleBusy(false);
    }
  };

  // If the user lands here already signed-in via Clerk (e.g. came back from
  // the SSO callback), auto-attempt to complete admin sign-in once.
  useEffect(() => {
    if (!clerkAvailable || !isSignedInToClerk || busy || googleBusy) return;
    // Only auto-trigger if the URL hints we just came from SSO.
    if (window.location.search.includes("sso") || window.location.hash) {
      continueAsClerkUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkAvailable, isSignedInToClerk]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-lime-500 to-green-500 shadow-lg shadow-lime-500/30">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-lime-500 to-green-500 bg-clip-text text-transparent">
            Iconic Fitness
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-lime-600 font-bold mt-1">
            Admin Portal
          </div>
        </div>

        <div className="bg-white border border-lime-100 rounded-2xl p-7 space-y-5 shadow-[0_20px_60px_-20px_rgba(101, 163, 13,0.25)]">
          {clerkAvailable && (
            <>
              {isSignedInToClerk ? (
                <div className="space-y-3">
                  <div className="text-sm text-slate-500">
                    Signed in to Google as
                  </div>
                  <div className="text-slate-900 font-semibold break-all">
                    {clerkEmail || "your Google account"}
                  </div>
                  <button
                    type="button"
                    onClick={continueAsClerkUser}
                    disabled={googleBusy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-semibold border border-slate-200 hover:bg-lime-50 hover:border-lime-300 transition disabled:opacity-60"
                  >
                    {googleBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    Continue as admin
                  </button>
                  <button
                    type="button"
                    onClick={() => clerk?.signOut()}
                    className="w-full text-xs text-slate-500 hover:text-lime-600"
                  >
                    Use a different Google account
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startGoogle}
                  disabled={googleBusy}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-semibold border border-slate-200 hover:bg-lime-50 hover:border-lime-300 transition disabled:opacity-60"
                >
                  {googleBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  Continue with Google
                </button>
              )}

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <div className="h-px flex-1 bg-slate-200" />
                or use password
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 focus:border-lime-500/60"
                placeholder="you@iconicfitnessindia.com"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 focus:border-lime-500/60"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-400 hover:to-lime-500 text-white font-semibold transition-colors disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-100">
            Restricted access. Contact your administrator for credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
