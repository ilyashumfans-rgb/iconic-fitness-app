import { useState } from "react";
import {
  type NewTicketInput,
  type TicketPriority,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  PRIORITY_LABELS,
  formatCategory,
} from "@/lib/tickets";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

export function NewTicketForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (input: NewTicketInput) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErr("Please provide a subject and a description.");
      return;
    }
    setErr(null);
    await onSubmit({
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-sm text-orange-700">
          {err}
        </div>
      )}
      <div>
        <label className={labelCls}>Subject</label>
        <input
          className={inputCls}
          value={subject}
          maxLength={200}
          placeholder="Brief summary of your issue"
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Category</label>
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatCategory(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select
            className={inputCls}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          className={`${inputCls} min-h-[120px] resize-y`}
          value={description}
          maxLength={5000}
          placeholder="Describe the issue in detail"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
