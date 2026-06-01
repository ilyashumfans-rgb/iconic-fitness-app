import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/react";
import { adminApi } from "@/lib/adminApi";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminSsoCallback() {
  const [, navigate] = useLocation();
  // If Clerk isn't configured (no ClerkProvider mounted), useUser throws.
  // Guard so a stray /admin/sso-callback hit doesn't crash the render.
  let userState: { isLoaded: boolean; isSignedIn: boolean } | null = null;
  let clerkAvailable = true;
  try {
    const u = useUser();
    userState = { isLoaded: !!u.isLoaded, isSignedIn: !!u.isSignedIn };
  } catch {
    clerkAvailable = false;
  }
  const isLoaded = userState?.isLoaded ?? false;
  const isSignedIn = userState?.isSignedIn ?? false;
  const [err, setErr] = useState<string | null>(
    clerkAvailable ? null : "Google sign-in is not configured for this site",
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || err) return;
    let cancelled = false;
    (async () => {
      try {
        await adminApi.googleLogin();
        if (!cancelled) navigate("/admin");
      } catch (e) {
        if (!cancelled) {
          setErr(
            e instanceof Error
              ? e.message
              : "Could not complete admin sign-in",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, err, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-green-50 flex items-center justify-center p-6">
      {clerkAvailable && (
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl={`${basePath}/admin/sso-callback`}
          signUpForceRedirectUrl={`${basePath}/admin/sso-callback`}
        />
      )}
      <div className="w-full max-w-md text-center">
        {err ? (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50 border border-red-200">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <div className="mt-4 text-slate-900 font-semibold">{err}</div>
            <button
              onClick={() => navigate("/admin/login")}
              className="mt-6 px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-white font-semibold"
            >
              Back to admin login
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-lime-100 border border-lime-200">
              <ShieldCheck className="h-7 w-7 text-lime-600" />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying your Google account…
            </div>
          </>
        )}
      </div>
    </div>
  );
}
