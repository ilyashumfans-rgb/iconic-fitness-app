import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

type Notif = {
  id: number;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  readAt: string | null;
};

export type NotificationApi = {
  list: () => Promise<Notif[]>;
  markRead: (id: number) => Promise<unknown>;
  markAllRead: () => Promise<unknown>;
};

type Theme = "portal" | "member";

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({
  api,
  theme = "portal",
}: {
  api: NotificationApi;
  theme?: Theme;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const rows = await api.list();
      setItems(rows);
    } catch {
      // swallow — unauthenticated users / network blips shouldn't break the layout
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.readAt).length;

  const handleItemClick = async (n: Notif) => {
    if (!n.readAt) {
      try {
        await api.markRead(n.id);
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x,
          ),
        );
      } catch {
        // ignore
      }
    }
    if (n.link) {
      setOpen(false);
      if (n.link.startsWith("http")) {
        window.open(n.link, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = n.link;
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllRead();
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((x) => (x.readAt ? x : { ...x, readAt: now })),
      );
    } catch {
      // ignore
    }
  };

  const buttonCls =
    theme === "portal"
      ? "relative flex items-center justify-center h-9 w-9 rounded-lg border border-lime-200 hover:border-lime-500 text-slate-600 hover:text-lime-600 bg-white transition-colors"
      : "relative flex items-center justify-center h-9 w-9 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted transition-colors";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        className={buttonCls}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-lime-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[480px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-bold text-slate-900">Notifications</div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-lime-600 hover:text-lime-700 font-semibold inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                You have no notifications yet.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-lime-50/60 transition-colors flex gap-3 ${
                    n.readAt ? "" : "bg-lime-50/30"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      n.readAt ? "bg-transparent" : "bg-lime-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {n.title}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                      {n.body}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
