import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { adminApi } from "@/lib/adminApi";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
            GYMCO
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-orange-400 font-semibold mt-1">
            Admin Portal
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-7 space-y-5 shadow-xl"
        >
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

          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-800">
            Restricted access. Contact your administrator for credentials.
          </div>
        </form>
      </div>
    </div>
  );
}
