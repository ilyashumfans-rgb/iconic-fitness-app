import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { staffApi } from "@/lib/staffApi";

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

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-orange-400 font-bold">
            GYMCO
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">Staff Sign In</h1>
          <p className="text-sm text-slate-400 mt-1">
            Access the features your admin has assigned to you.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Email
            </label>
            <input
              required
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@gymco.in"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
              Password
            </label>
            <input
              required
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {err && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {err}
            </div>
          )}
          <button
            disabled={busy}
            className="w-full px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
