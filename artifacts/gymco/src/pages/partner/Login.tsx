import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { partnerApi } from "@/lib/partnerApi";
import { Loader2, Handshake } from "lucide-react";

export default function PartnerLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already signed in, jump straight to the dashboard.
    partnerApi
      .me()
      .then(() => navigate("/partner"))
      .catch(() => {
        // not signed in — stay on login
      });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await partnerApi.login(email, password);
      navigate("/partner");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-600 to-orange-500 shadow-lg shadow-purple-500/20">
            <Handshake className="h-7 w-7 text-white" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
            GYMCO
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-purple-400 font-semibold mt-1">
            Partner Portal
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-7 space-y-5 shadow-xl"
        >
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Partner email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500/60"
              placeholder="you@yourgym.in"
              autoComplete="username"
              required
              autoFocus
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
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500/60"
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-95 text-white font-semibold transition-opacity disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in to portal
          </button>

          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-800 leading-relaxed">
            New gym partner? Contact your GYMCO account manager for credentials.
            <br />
            Forgot your password? GYMCO admin can reset it from the admin
            portal.
          </div>
        </form>
      </div>
    </div>
  );
}
