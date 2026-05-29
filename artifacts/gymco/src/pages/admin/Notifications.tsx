import { useEffect, useState, type FormEvent } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Send, Users, Megaphone, Check } from "lucide-react";

type RType = "user" | "partner" | "vendor" | "admin";

type Recipient = { id: number; name: string; email: string };

type Sent = {
  batchId: string;
  recipientType: string;
  title: string;
  body: string;
  link: string;
  createdByAdminId: number | null;
  createdAt: string;
  delivered: number;
  read: number;
};

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-white border border-orange-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

const TYPE_LABELS: Record<RType, string> = {
  user: "Members",
  partner: "Partners (gyms)",
  vendor: "Vendors (store sellers)",
  admin: "Admins",
};

function Composer({ onSent }: { onSent: () => void }) {
  const [type, setType] = useState<RType>("user");
  const [mode, setMode] = useState<"broadcast" | "individual">("broadcast");
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRcp, setLoadingRcp] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "individual") return;
    setLoadingRcp(true);
    setRecipientId(null);
    adminApi.notifications
      .recipients(type)
      .then(setRecipients)
      .catch(() => setRecipients([]))
      .finally(() => setLoadingRcp(false));
  }, [type, mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (mode === "individual" && !recipientId) {
      setErr("Pick a recipient");
      return;
    }
    setBusy(true);
    try {
      const r = await adminApi.notifications.send({
        recipientType: type,
        recipientId: mode === "broadcast" ? null : recipientId,
        title,
        body,
        link: link || undefined,
      });
      setOk(
        r.broadcast
          ? `Broadcast sent to ${r.delivered} ${TYPE_LABELS[type].toLowerCase()}.`
          : `Sent to 1 recipient.`,
      );
      setTitle("");
      setBody("");
      setLink("");
      onSent();
      setTimeout(() => setOk(null), 4000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminCard className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <Megaphone className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold text-slate-900">Compose Notification</h2>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-semibold">
              Audience type
            </label>
            <select
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value as RType)}
            >
              {(Object.keys(TYPE_LABELS) as RType[]).map((k) => (
                <option key={k} value={k}>
                  {TYPE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-semibold">
              Send to
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("broadcast")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${
                  mode === "broadcast"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-slate-700 border-orange-200 hover:border-orange-400"
                }`}
              >
                <Megaphone className="h-3.5 w-3.5" />
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setMode("individual")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${
                  mode === "individual"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-slate-700 border-orange-200 hover:border-orange-400"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                One person
              </button>
            </div>
          </div>
        </div>

        {mode === "individual" && (
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-semibold">
              Recipient
            </label>
            <select
              className={inputCls}
              value={recipientId ?? ""}
              onChange={(e) =>
                setRecipientId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={loadingRcp}
            >
              <option value="">
                {loadingRcp
                  ? "Loading..."
                  : `Pick a ${TYPE_LABELS[type].toLowerCase()}`}
              </option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-semibold">
            Title
          </label>
          <input
            required
            maxLength={200}
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New gym added in Indiranagar"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-semibold">
            Message
          </label>
          <textarea
            required
            maxLength={4000}
            rows={4}
            className={inputCls}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a clear, helpful message..."
          />
          <div className="text-[11px] text-slate-400 mt-1 text-right">
            {body.length} / 4000
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1.5 font-semibold">
            Link (optional)
          </label>
          <input
            className={inputCls}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/gyms/cult-fit-indiranagar or https://..."
          />
          <div className="text-[11px] text-slate-400 mt-1">
            Recipients clicking the notification will be taken here.
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {err}
          </div>
        )}
        {ok && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 inline-flex items-center gap-2">
            <Check className="h-4 w-4" />
            {ok}
          </div>
        )}

        <button
          disabled={busy}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60 inline-flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {busy ? "Sending..." : "Send Notification"}
        </button>
      </form>
    </AdminCard>
  );
}

export default function AdminNotifications() {
  const [sent, setSent] = useState<Sent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setSent(await adminApi.notifications.listSent());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminLayout title="Notifications">
      <div className="space-y-6">
        <Composer onSent={load} />

        <AdminCard className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-100 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Recent Sends
            </h2>
            <span className="text-xs text-slate-500">{sent.length} batches</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-orange-100">
                  <th className="px-5 py-3">Sent</th>
                  <th className="px-5 py-3">Audience</th>
                  <th className="px-5 py-3">Title / Message</th>
                  <th className="px-5 py-3">Delivered</th>
                  <th className="px-5 py-3">Read</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : sent.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      No notifications sent yet. Use the composer above.
                    </td>
                  </tr>
                ) : (
                  sent.map((s) => {
                    const pct = s.delivered
                      ? Math.round((s.read / s.delivered) * 100)
                      : 0;
                    return (
                      <tr
                        key={s.batchId}
                        className="border-b border-orange-50/80 align-top"
                      >
                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[11px] px-2 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-semibold capitalize">
                            {s.recipientType}
                          </span>
                        </td>
                        <td className="px-5 py-4 max-w-md">
                          <div className="font-semibold text-slate-900 truncate">
                            {s.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {s.body}
                          </div>
                          {s.link && (
                            <div className="text-[11px] text-orange-600 mt-1 truncate">
                              → {s.link}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {s.delivered}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold text-slate-700">
                            {s.read}{" "}
                            <span className="text-xs text-slate-400">
                              ({pct}%)
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-24">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
