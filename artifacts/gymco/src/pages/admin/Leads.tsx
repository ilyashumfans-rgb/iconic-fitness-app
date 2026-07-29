import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import {
  Inbox,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Trash2,
  X,
  Search,
  Filter,
  Upload,
  Download,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
} from "lucide-react";

type LeadMessage = {
  id: number;
  leadId: number | null;
  userId: number | null;
  toNumber: string;
  body: string;
  channel: string;
  status: string;
  twilioSid: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type Lead = {
  id: number;
  kind: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  classId: number | null;
  gymId: number | null;
  className: string;
  gymName: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
  source: string;
  status: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STATUSES = [
  { key: "new", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "contacted", label: "Contacted", color: "bg-green-100 text-green-700 border-green-200" },
  { key: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { key: "converted", label: "Converted", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Lost", color: "bg-slate-100 text-slate-600 border-slate-200" },
];

function statusClass(s: string) {
  return STATUSES.find((x) => x.key === s)?.color ?? "bg-slate-100 text-slate-600 border-slate-200";
}

// Map a sheet's header cell to our lead field (tolerant of spacing/case).
const HEADER_MAP: Record<string, string> = {
  name: "name",
  fullname: "name",
  phone: "phone",
  mobile: "phone",
  phonenumber: "phone",
  mobilenumber: "phone",
  email: "email",
  city: "city",
  branchno: "branchNo",
  branchnumber: "branchNo",
  branch: "branchNo",
  branchcategorynumber: "branchNo",
  categorynumber: "branchNo",
  employeeid: "employeeId",
  employee: "employeeId",
  employeeno: "employeeId",
  employeenumber: "employeeId",
  staffid: "employeeId",
  staffno: "employeeId",
  kind: "kind",
  type: "kind",
  status: "status",
  source: "source",
  notes: "notes",
  message: "message",
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

type ImportResult = {
  inserted: number;
  failed: number;
  errors: { row: number; error: string }[];
};

export default function AdminLeads() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [leadMessages, setLeadMessages] = useState<LeadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Load delivery log whenever a lead drawer is opened.
  useEffect(() => {
    setSendErr(null);
    if (!editing) {
      setLeadMessages([]);
      return;
    }
    setMessagesLoading(true);
    adminApi.messaging
      .getLeadMessages(editing.id)
      .then((msgs) => setLeadMessages(msgs))
      .catch(() => setLeadMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [editing?.id]);

  // Manually (re)send the lead welcome WhatsApp/SMS and refresh the log.
  const sendMessage = async (leadId: number) => {
    setSending(true);
    setSendErr(null);
    try {
      const result = await adminApi.messaging.sendToLead(leadId);
      setLeadMessages(result.messages);
      if (!result.ok && result.error) setSendErr(result.error);
    } catch (e: any) {
      setSendErr(e?.message ?? String(e));
      // The attempt may still have been logged — refresh the history.
      adminApi.messaging
        .getLeadMessages(leadId)
        .then((msgs) => setLeadMessages(msgs))
        .catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const downloadTemplate = async () => {
    setImportErr(null);
    try {
      const [gyms, staff] = await Promise.all([
        adminApi.gyms.list() as Promise<{ id: number; name: string }[]>,
        adminApi.staff.list() as Promise<
          { id: number; name: string; isActive: boolean }[]
        >,
      ]);
      const activeStaff = staff.filter((s) => s.isActive);
      const wb = XLSX.utils.book_new();
      const leadsSheet = XLSX.utils.aoa_to_sheet([
        [
          "Name",
          "Phone",
          "Email",
          "City",
          "Branch No",
          "Employee ID",
          "Kind",
          "Status",
          "Source",
          "Notes",
        ],
        [
          "Ravi Kumar",
          "9876543210",
          "ravi@example.com",
          "Bangalore",
          gyms[0]?.id ?? "",
          activeStaff[0]?.id ?? "",
          "general",
          "new",
          "walk-in",
          "Interested in annual plan",
        ],
      ]);
      XLSX.utils.book_append_sheet(wb, leadsSheet, "Leads");
      const branchSheet = XLSX.utils.aoa_to_sheet([
        ["Branch No", "Branch Name"],
        ...gyms.map((g) => [g.id, g.name]),
      ]);
      XLSX.utils.book_append_sheet(wb, branchSheet, "Branch Numbers");
      const staffSheet = XLSX.utils.aoa_to_sheet([
        ["Employee ID", "Employee Name"],
        ...activeStaff.map((s) => [s.id, s.name]),
      ]);
      XLSX.utils.book_append_sheet(wb, staffSheet, "Employee IDs");
      XLSX.writeFile(wb, "leads-import-template.xlsx");
    } catch (e: any) {
      setImportErr(e?.message ?? String(e));
    }
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    setImportErr(null);
    setImportResult(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error("The file has no sheets");
      const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      if (raw.length < 2) {
        throw new Error("The sheet has no data rows below the header");
      }
      const fields = (raw[0] ?? []).map(
        (h) => HEADER_MAP[normalizeHeader(h)] ?? null,
      );
      if (!fields.includes("name") || !fields.includes("phone")) {
        throw new Error(
          'The header row must include "Name" and "Phone" columns (use the template)',
        );
      }
      const parsed = raw
        .slice(1)
        .map((cells) => {
          const row: Record<string, unknown> = {};
          fields.forEach((f, i) => {
            if (f) row[f] = String(cells[i] ?? "").trim();
          });
          return row;
        })
        .filter((r) =>
          Object.values(r).some((v) => String(v ?? "").trim() !== ""),
        );
      if (parsed.length === 0) throw new Error("No data rows found");
      const result = await adminApi.leads.import(parsed);
      setImportResult(result);
      load();
    } catch (e: any) {
      setImportErr(e?.message ?? String(e));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const load = () => {
    setBusy(true);
    setErr(null);
    adminApi.leads
      .list()
      .then((r) => setRows(r as Lead[]))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: rows.length };
    for (const s of STATUSES) m[s.key] = 0;
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!ql) return true;
      return (
        r.name.toLowerCase().includes(ql) ||
        r.phone.toLowerCase().includes(ql) ||
        r.email.toLowerCase().includes(ql) ||
        r.className.toLowerCase().includes(ql) ||
        r.gymName.toLowerCase().includes(ql) ||
        r.city.toLowerCase().includes(ql)
      );
    });
  }, [rows, filter, q]);

  const update = async (id: number, patch: Record<string, unknown>) => {
    try {
      const updated = await adminApi.leads.update(id, patch);
      setRows((rs) => rs.map((r) => (r.id === id ? (updated as Lead) : r)));
      if (editing && editing.id === id) setEditing(updated as Lead);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await adminApi.leads.remove(id);
      setRows((rs) => rs.filter((r) => r.id !== id));
      if (editing && editing.id === id) setEditing(null);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  return (
    <AdminLayout
      title="Leads (CRM)"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-lime-200 text-slate-700 text-sm font-semibold hover:bg-lime-50"
          >
            <Download className="h-4 w-4" /> Excel template
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white text-sm font-semibold shadow disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? "Importing…" : "Upload Excel"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      }
    >
      <div className="space-y-6">
        {(importErr || importResult) && (
          <AdminCard className="p-4">
            {importErr && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {importErr}
              </div>
            )}
            {importResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">
                    Imported {importResult.inserted} lead
                    {importResult.inserted === 1 ? "" : "s"}
                    {importResult.failed > 0
                      ? ` · ${importResult.failed} row${importResult.failed === 1 ? "" : "s"} skipped`
                      : ""}
                  </div>
                  <button
                    onClick={() => {
                      setImportResult(null);
                      setImportErr(null);
                    }}
                    className="p-1.5 rounded-md hover:bg-lime-50 text-slate-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, i) => (
                      <div key={i}>
                        Row {e.row}: {e.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AdminCard>
        )}
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`text-left rounded-2xl p-4 border transition ${
              filter === "all"
                ? "bg-gradient-to-br from-lime-500 to-green-500 text-white border-transparent shadow-md"
                : "bg-white border-lime-100 hover:border-lime-300"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              All Leads
            </div>
            <div className="text-2xl font-black mt-1">{counts.all}</div>
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`text-left rounded-2xl p-4 border transition ${
                filter === s.key
                  ? "bg-gradient-to-br from-lime-500 to-green-500 text-white border-transparent shadow-md"
                  : "bg-white border-lime-100 hover:border-lime-300"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {s.label}
              </div>
              <div className="text-2xl font-black mt-1">{counts[s.key] ?? 0}</div>
            </button>
          ))}
        </div>

        {/* Search + filter row */}
        <AdminCard className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, phone, email, gym, class..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-lime-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/60 text-sm"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-50 border border-lime-100 text-lime-700 text-xs font-bold">
              <Filter className="h-3.5 w-3.5" />
              {filter === "all" ? "All statuses" : STATUSES.find((s) => s.key === filter)?.label}
              <span className="ml-1 text-slate-500">({filtered.length})</span>
            </div>
          </div>
        </AdminCard>

        {err ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </div>
        ) : null}

        {/* Table */}
        <AdminCard>
          {busy ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              Loading leads...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Inbox className="h-10 w-10 mx-auto mb-2 text-lime-400" />
              <div className="font-bold">No leads yet</div>
              <div className="text-sm">
                When visitors book a class, their enquiry will appear here.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-lime-50/60 text-slate-600">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Lead</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Interested in</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Contact</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Received</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lime-50">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-lime-50/40 cursor-pointer"
                      onClick={() => setEditing(r)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.name}</div>
                        {r.city ? (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {r.city}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {r.className || r.gymName || (
                            <span className="text-slate-400">General enquiry</span>
                          )}
                        </div>
                        {r.className && r.gymName ? (
                          <div className="text-xs text-slate-500 mt-0.5">{r.gymName}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-lime-500" />
                          <a
                            href={`tel:${r.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono hover:text-lime-600"
                          >
                            {r.phone}
                          </a>
                        </div>
                        {r.email ? (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {r.email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={r.status}
                          onChange={(e) => update(r.id, { status: e.target.value })}
                          className={`text-[11px] font-bold uppercase tracking-wider rounded-full border px-2.5 py-1 ${statusClass(r.status)}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => remove(r.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Delete lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {/* Detail drawer */}
      {editing ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-lime-100 p-5 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lead #{editing.id} · {editing.source}
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {editing.name}
                </div>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="p-1 rounded-full hover:bg-lime-50 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`tel:${editing.phone}`}
                  className="rounded-xl border border-lime-100 bg-lime-50/50 p-3 hover:border-lime-300"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Phone
                  </div>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-1">
                    {editing.phone}
                  </div>
                </a>
                {editing.email ? (
                  <a
                    href={`mailto:${editing.email}`}
                    className="rounded-xl border border-lime-100 bg-lime-50/50 p-3 hover:border-lime-300"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Email
                    </div>
                    <div className="font-medium text-slate-900 text-sm mt-1 truncate">
                      {editing.email}
                    </div>
                  </a>
                ) : null}
              </div>

              <div className="rounded-xl border border-lime-100 p-4 space-y-2 text-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Interest
                </div>
                {editing.className ? (
                  <div className="font-bold text-slate-900">{editing.className}</div>
                ) : null}
                {editing.gymName ? (
                  <div className="text-slate-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-lime-500" /> {editing.gymName}
                  </div>
                ) : null}
                {editing.city ? (
                  <div className="text-slate-600">City: {editing.city}</div>
                ) : null}
                {editing.preferredDate || editing.preferredTime ? (
                  <div className="text-slate-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-lime-500" />
                    Visiting: {editing.preferredDate}
                    {editing.preferredTime ? ` at ${editing.preferredTime}` : ""}
                  </div>
                ) : null}
                {editing.message ? (
                  <div className="text-slate-700 italic border-l-2 border-lime-300 pl-3 mt-2">
                    "{editing.message}"
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => update(editing.id, { status: s.key })}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition ${
                        editing.status === s.key
                          ? "bg-gradient-to-r from-lime-500 to-green-500 text-white border-transparent shadow"
                          : `${s.color} hover:opacity-80`
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Assigned To
                </label>
                <input
                  defaultValue={editing.assignedTo}
                  onBlur={(e) =>
                    e.target.value !== editing.assignedTo &&
                    update(editing.id, { assignedTo: e.target.value })
                  }
                  placeholder="Sales rep name or email"
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Internal Notes
                </label>
                <textarea
                  defaultValue={editing.notes}
                  onBlur={(e) =>
                    e.target.value !== editing.notes &&
                    update(editing.id, { notes: e.target.value })
                  }
                  rows={5}
                  placeholder="Call notes, follow-up reminders, deal context..."
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-lime-100 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/60"
                />
                <div className="text-[10px] text-slate-400 mt-1">
                  Auto-saves when you click out of the field.
                </div>
              </div>

              {/* Message delivery log */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-lime-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      WhatsApp / SMS
                    </span>
                  </div>
                  <button
                    onClick={() => sendMessage(editing.id)}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-lime-500 to-green-500 text-white text-[11px] font-bold shadow disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    {sending ? "Sending…" : "Send WhatsApp/SMS"}
                  </button>
                </div>
                {sendErr && (
                  <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {sendErr}
                  </div>
                )}
                {messagesLoading ? (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                  </div>
                ) : leadMessages.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-1">
                    No messages sent yet.{" "}
                    <a
                      href="/admin/messaging"
                      className="text-lime-600 underline"
                    >
                      Configure messaging →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-xl border border-lime-50 bg-lime-50/40 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                            {msg.status === "sent" || msg.status === "delivered" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : msg.status === "failed" ? (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span className="capitalize">{msg.channel}</span>
                            <span className="text-slate-400">·</span>
                            <span
                              className={`capitalize ${
                                msg.status === "sent" || msg.status === "delivered"
                                  ? "text-green-600"
                                  : msg.status === "failed"
                                  ? "text-red-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {msg.status}
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono">
                            {new Date(msg.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="text-slate-600 border-l-2 border-lime-300 pl-2 italic">
                          {msg.body}
                        </div>
                        {msg.errorMessage && (
                          <div className="mt-1 text-red-600 text-[11px]">
                            Error: {msg.errorMessage}
                          </div>
                        )}
                        {msg.twilioSid && (
                          <div className="mt-1 text-slate-400 font-mono text-[11px]">
                            SID: {msg.twilioSid}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400">
                Received {new Date(editing.createdAt).toLocaleString("en-IN")} ·
                Last updated {new Date(editing.updatedAt).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
