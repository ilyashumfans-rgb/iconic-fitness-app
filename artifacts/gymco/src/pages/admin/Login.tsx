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
    if (!signIn?.signIn) return;
    setErr(null);
    setGoogleBusy(true);
    try {
      // Clerk's typed shape varies between @clerk/react (future) and the
      // classic SDK; the runtime method exists in both. Cast and call.
      const si = signIn.signIn as unknown as {
        authenticateWithRedirect: (args: {
          strategy: string;
          redirectUrl: string;
          redirectUrlComplete: string;
        }) => Promise<void>;
      };
      await si.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${basePath}/admin/sso-callback`,
        redirectUrlComplete: `${basePath}/admin/sso-callback`,
      });
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            GYMCO
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-orange-400 font-semibold mt-1">
            Admin Portal
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 space-y-5 shadow-xl">
          {clerkAvailable && (
            <>
              {isSignedInToClerk ? (
                <div className="space-y-3">
                  <div className="text-sm text-slate-400">
                    Signed in to Google as
                  </div>
                  <div className="text-white font-semibold break-all">
                    {clerkEmail || "your Google account"}
                  </div>
                  <button
                    type="button"
                    onClick={continueAsClerkUser}
                    disabled={googleBusy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-100 transition disabled:opacity-60"
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
                    className="w-full text-xs text-slate-400 hover:text-slate-200"
                  >
                    Use a different Google account
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startGoogle}
                  disabled={googleBusy}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-100 transition disabled:opacity-60"
                >
                  {googleBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  Continue with Google
                </button>
              )}

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-500">
                <div className="h-px flex-1 bg-slate-800" />
                or use password
                <div className="h-px flex-1 bg-slate-800" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60"
                placeholder="you@gymco.in"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {err && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-800">
            Restricted access. Contact your administrator for credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
