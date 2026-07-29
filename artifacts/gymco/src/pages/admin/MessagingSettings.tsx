import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import {
  MessageSquare,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
  Webhook,
  Copy,
  Check,
} from "lucide-react";

type Config = {
  twilioAccountSid: string;
  twilioAuthToken: string;
  smsFrom: string;
  whatsappFrom: string;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  leadWelcomeTemplate: string;
  memberWelcomeTemplate: string;
  nudgeEnabled: boolean;
  nudgeDelayHours: number;
  leadNudgeTemplate: string;
  statusWebhookUrl?: string;
};

const TEMPLATE_VARS = [
  { tag: "{{name}}", desc: "Lead/member first name" },
  { tag: "{{gymInfo}}", desc: "\" at [gym name]\" or blank (leads only)" },
  { tag: "{{gymName}}", desc: "Gym/branch name (leads only)" },
];

export default function AdminMessagingSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyWebhookUrl = async () => {
    if (!config?.statusWebhookUrl) return;
    try {
      await navigator.clipboard.writeText(config.statusWebhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the URL is selectable as a fallback.
    }
  };

  useEffect(() => {
    adminApi.messaging
      .getConfig()
      .then((c) => {
        setConfig(c);
        setForm(c);
      })
      .catch((e) => setErr(e?.message ?? String(e)));
  }, []);

  const set = (key: keyof Config, value: string | boolean | number) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
    setSaved(false);
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const updated = await adminApi.messaging.saveConfig(
        form as unknown as Record<string, unknown>,
      );
      setConfig(updated as unknown as Config);
      setForm(updated as unknown as Config);
      setSaved(true);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const isConfigured =
    config?.twilioAccountSid &&
    config?.twilioAuthToken &&
    (config?.smsFrom || config?.whatsappFrom);

  return (
    <AdminLayout title="Messaging (WhatsApp / SMS)">
      <div className="max-w-2xl space-y-6">
        {/* Status banner */}
        <AdminCard className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-full p-1.5 ${
                isConfigured
                  ? "bg-green-100 text-green-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {isConfigured ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">
                {isConfigured
                  ? "Twilio is configured — messaging is ready"
                  : "Twilio credentials required"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {isConfigured
                  ? `Channel: ${config?.whatsappEnabled ? "WhatsApp" : ""}${config?.whatsappEnabled && config?.smsEnabled ? " + " : ""}${config?.smsEnabled ? "SMS" : ""}`
                  : "Enter your Twilio Account SID, Auth Token, and at least one sender number below."}
              </div>
            </div>
          </div>
        </AdminCard>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {err}
          </div>
        )}
        {saved && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Settings saved
          </div>
        )}

        {form ? (
          <>
            {/* Twilio Credentials */}
            <AdminCard className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-lime-600" />
                <div className="font-bold text-slate-800">
                  Twilio Credentials
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 flex gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Sign up at{" "}
                  <a
                    href="https://twilio.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    twilio.com
                  </a>{" "}
                  to get your Account SID and Auth Token. For WhatsApp, enable
                  the Twilio Sandbox for WhatsApp in the Twilio console.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Account SID
                </label>
                <input
                  value={form.twilioAccountSid}
                  onChange={(e) => set("twilioAccountSid", e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl border border-lime-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Auth Token
                </label>
                <input
                  value={form.twilioAuthToken}
                  onChange={(e) => set("twilioAuthToken", e.target.value)}
                  type="password"
                  placeholder={
                    config?.twilioAuthToken === "***"
                      ? "Already set — paste to update"
                      : "Your Twilio auth token"
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-lime-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
                {config?.twilioAuthToken === "***" && (
                  <div className="text-[11px] text-slate-400 mt-1">
                    Auth token is set. Leave blank to keep the existing value.
                  </div>
                )}
              </div>
            </AdminCard>

            {/* Channels */}
            <AdminCard className="p-5 space-y-4">
              <div className="font-bold text-slate-800 mb-1">Channels</div>

              {/* WhatsApp */}
              <div className="rounded-xl border border-lime-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      WhatsApp
                    </div>
                    <div className="text-xs text-slate-500">
                      Recommended — higher open rates. Uses WhatsApp Business
                      via Twilio.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      set("whatsappEnabled", !form.whatsappEnabled)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.whatsappEnabled ? "bg-lime-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        form.whatsappEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {form.whatsappEnabled && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      WhatsApp sender number (E.164)
                    </label>
                    <input
                      value={form.whatsappFrom}
                      onChange={(e) => set("whatsappFrom", e.target.value)}
                      placeholder="+14155238886"
                      className="w-full px-3 py-2 rounded-xl border border-lime-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      Twilio Sandbox: +14155238886 · Production: your approved
                      WhatsApp Business number
                    </div>
                  </div>
                )}
              </div>

              {/* SMS */}
              <div className="rounded-xl border border-lime-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      SMS
                    </div>
                    <div className="text-xs text-slate-500">
                      Fallback channel. Used when WhatsApp is disabled.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("smsEnabled", !form.smsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.smsEnabled ? "bg-lime-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        form.smsEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {form.smsEnabled && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      SMS from number (E.164)
                    </label>
                    <input
                      value={form.smsFrom}
                      onChange={(e) => set("smsFrom", e.target.value)}
                      placeholder="+14155551234"
                      className="w-full px-3 py-2 rounded-xl border border-lime-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                    />
                  </div>
                )}
              </div>
            </AdminCard>

            {/* Delivery status webhook */}
            <AdminCard className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-lime-600" />
                <div className="font-bold text-slate-800">
                  Delivery Status Webhook
                </div>
              </div>
              <div className="text-xs text-slate-500">
                To see real delivery statuses (Delivered ✓ / Read ✓ / Failed ✗)
                instead of just "sent", paste this URL into your Twilio console
                as the <span className="font-semibold">status callback URL</span>:
                for WhatsApp, under{" "}
                <span className="font-semibold">
                  Messaging → Settings → WhatsApp sandbox settings
                </span>{" "}
                (or your WhatsApp sender's configuration); for SMS, under your
                phone number's <span className="font-semibold">Messaging</span>{" "}
                configuration.
              </div>
              {config?.statusWebhookUrl ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-lime-100 text-xs font-mono text-slate-700 break-all select-all">
                    {config.statusWebhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-lime-200 text-slate-700 text-xs font-semibold hover:bg-lime-50 flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Loading…</div>
              )}
              <div className="text-[11px] text-slate-400">
                Set the HTTP method to POST. Twilio will call this URL as each
                message progresses (sent → delivered → read), and the lead's
                delivery log updates automatically.
              </div>
            </AdminCard>

            {/* Templates */}
            <AdminCard className="p-5 space-y-5">
              <div>
                <div className="font-bold text-slate-800 mb-1">
                  Message Templates
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-700 mb-1">
                    Available variables:
                  </div>
                  {TEMPLATE_VARS.map((v) => (
                    <div key={v.tag} className="flex gap-2">
                      <code className="font-mono text-lime-700 flex-shrink-0">
                        {v.tag}
                      </code>
                      <span className="text-slate-500">{v.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  New Lead Welcome Message
                </label>
                <textarea
                  value={form.leadWelcomeTemplate}
                  onChange={(e) => set("leadWelcomeTemplate", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Sent when a lead submits the enquiry form or is imported via
                  Excel.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  New Member Welcome Message
                </label>
                <textarea
                  value={form.memberWelcomeTemplate}
                  onChange={(e) =>
                    set("memberWelcomeTemplate", e.target.value)
                  }
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Sent once when a member saves their phone number for the first
                  time.
                </div>
              </div>
            </AdminCard>

            {/* Follow-up nudge */}
            <AdminCard className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">
                    Follow-up Nudge
                  </div>
                  <div className="text-xs text-slate-500">
                    Automatically message leads still marked "new" who haven't
                    responded after the welcome.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set("nudgeEnabled", !form.nudgeEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.nudgeEnabled ? "bg-lime-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.nudgeEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {form.nudgeEnabled && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Send after (hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={form.nudgeDelayHours}
                      onChange={(e) =>
                        set("nudgeDelayHours", Number(e.target.value))
                      }
                      className="w-32 px-3 py-2 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      Hours after the welcome message before the nudge is sent
                      (default 24). Only leads still in "new" status get nudged,
                      and each lead is nudged at most once.
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Follow-up Nudge Message
                    </label>
                    <textarea
                      value={form.leadNudgeTemplate}
                      onChange={(e) =>
                        set("leadNudgeTemplate", e.target.value)
                      }
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      Supports the same variables as the lead welcome message.
                    </div>
                  </div>
                </>
              )}
            </AdminCard>

            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-lime-500 to-green-500 text-white font-semibold text-sm shadow hover:opacity-95 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {busy ? "Saving…" : "Save settings"}
              </button>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
            Loading…
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
