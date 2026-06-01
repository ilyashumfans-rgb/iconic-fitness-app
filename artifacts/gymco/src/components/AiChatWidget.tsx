import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useAiChat } from "@workspace/api-client-react";
import type { AiChatMessage } from "@workspace/api-client-react";

const GREETING: AiChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm the Iconic Fitness assistant. Ask me about memberships, branches, timings, classes, or trainers.",
};

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([GREETING]);
  const chat = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  function send() {
    const text = input.trim();
    if (!text || chat.isPending) return;

    const next: AiChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    chat.mutate(
      { data: { messages: next.filter((m) => m !== GREETING) } },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: res.reply },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Sorry, something went wrong. Please try again or reach us on WhatsApp at +91 94800 00248.",
            },
          ]);
        },
      },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Chat with Iconic Fitness assistant"}
        className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full bg-gradient-brand text-white flex items-center justify-center shadow-[0_10px_30px_-6px_rgba(0,0,0,0.45)] hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-7 w-7" />
        )}
      </button>

      {open && (
        <div className="fixed bottom-44 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-gradient-brand text-white px-4 py-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <div className="leading-tight">
              <div className="font-black text-sm">Iconic Fitness Assistant</div>
              <div className="text-[11px] opacity-90">
                Typically replies instantly
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 max-h-96 min-h-[16rem] overflow-y-auto p-4 space-y-3 bg-background"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-brand text-white px-3.5 py-2 text-sm"
                      : "max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary text-foreground px-3.5 py-2 text-sm"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-secondary text-muted-foreground px-3.5 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-border p-3 flex items-center gap-2 bg-card"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about memberships, timings..."
              aria-label="Type your message"
              className="flex-1 h-10 rounded-full bg-secondary border border-border px-4 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || chat.isPending}
              aria-label="Send message"
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-brand text-white flex items-center justify-center disabled:opacity-50 hover:opacity-95 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
