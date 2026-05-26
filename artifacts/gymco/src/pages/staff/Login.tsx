import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { staffApi } from "@/lib/staffApi";
import { Loader2, ShieldCheck } from "lucide-react";

export default function StaffLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    staffApi
      .me()
      .then(() => navigate("/staff"))
      .catch(() => {
        // not signed in — show form
      });
  }, [navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await staffApi.login(email, password);
      navigate("/staff");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            GYMCO
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-orange-600 font-bold mt-1">
            Staff Portal
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Access the features your admin has assigned to you
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-white border border-orange-100 rounded-2xl p-7 space-y-5 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.25)]"
        >
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Staff email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60"
              placeholder="staff@gymco.in"
              autoComplete="username"
              required
              autoFocus
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
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60"
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Signing in…" : "Sign in to staff portal"}
          </button>

          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-100 leading-relaxed">
            New staff member? Ask your GYMCO admin to create your account.
            <br />
            Forgot your password? Your admin can reset it for you.
          </div>
        </form>
      </div>
    </div>
  );
}
