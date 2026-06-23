import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { agencyApi } from "@/lib/agencyApi";
import { Loader2, BarChart3 } from "lucide-react";

export default function AgencyLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await agencyApi.login(username, password);
      navigate("/agency");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-lime-500 to-green-500 shadow-lg shadow-lime-500/30">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-lime-500 to-green-500 bg-clip-text text-transparent">
            Iconic Fitness
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-lime-600 font-bold mt-1">
            Agency Portal
          </div>
        </div>

        <div className="bg-white border border-lime-100 rounded-2xl p-7 space-y-5 shadow-[0_20px_60px_-20px_rgba(101,163,13,0.25)]">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 focus:border-lime-500/60"
                placeholder="agency"
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
            Read-only access to class bookings across all branches.
          </div>
        </div>
      </div>
    </div>
  );
}
