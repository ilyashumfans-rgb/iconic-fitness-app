import { useEffect, useState, type FormEvent } from "react";
import { Trash2, FileText, ExternalLink } from "lucide-react";
import {
  StaffLayout,
  StaffCard,
  PermissionGate,
} from "@/components/staff/StaffLayout";
import {
  staffApi,
  type StaffPartner,
  type PartnerDocument,
} from "@/lib/staffApi";

function View() {
  const [partners, setPartners] = useState<StaffPartner[]>([]);
  const [partnersErr, setPartnersErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | "">("");
  const [docs, setDocs] = useState<PartnerDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [form, setForm] = useState({ name: "", url: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    staffApi.partners
      .list()
      .then(setPartners)
      .catch((e) =>
        setPartnersErr(
          e instanceof Error
            ? `${e.message}. You may not have the "View Partners" permission.`
            : "Failed to load partners",
        ),
      );
  }, []);

  const loadDocs = async (id: number) => {
    setLoadingDocs(true);
    try {
      const data = await staffApi.partners.listDocuments(id);
      setDocs(data.documents);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (typeof selected === "number") {
      void loadDocs(selected);
    } else {
      setDocs([]);
    }
  }, [selected]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (typeof selected !== "number") return;
    setBusy(true);
    setErr(null);
    try {
      await staffApi.partners.addDocument(selected, form);
      setForm({ name: "", url: "", notes: "" });
      setOk(true);
      await loadDocs(selected);
      setTimeout(() => setOk(false), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (docId: number) => {
    if (typeof selected !== "number") return;
    if (!window.confirm("Delete this document?")) return;
    await staffApi.partners.removeDocument(selected, docId);
    await loadDocs(selected);
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60";

  return (
    <StaffLayout title="Partner Documents">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <StaffCard className="p-6 lg:col-span-2">
          <h2 className="text-base font-bold text-white mb-4">Upload Document</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                Partner
              </label>
              {partnersErr ? (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                  {partnersErr}
                </div>
              ) : (
                <select
                  required
                  value={selected}
                  onChange={(e) =>
                    setSelected(e.target.value ? Number(e.target.value) : "")
                  }
                  className={inputCls}
                >
                  <option value="">Select a partner…</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                  Document Name
                </label>
                <input
                  required
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="GST certificate, Lease agreement…"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                  Document URL
                </label>
                <input
                  required
                  type="url"
                  className={inputCls}
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://drive.google.com/…"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Paste a link to the file (Google Drive, S3, Dropbox…).
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  className={`${inputCls} h-20 resize-none`}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anything important about this document…"
                />
              </div>
              {err && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  {err}
                </div>
              )}
              {ok && (
                <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  Document uploaded.
                </div>
              )}
              <button
                disabled={busy || typeof selected !== "number"}
                className="w-full px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {busy ? "Uploading…" : "Upload Document"}
              </button>
            </form>
          </div>
        </StaffCard>

        <StaffCard className="p-0 lg:col-span-3 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              {typeof selected === "number"
                ? "Documents on file"
                : "Select a partner to view documents"}
            </h2>
          </div>
          <div className="p-5">
            {typeof selected !== "number" ? (
              <div className="text-sm text-slate-500 text-center py-12">
                No partner selected.
              </div>
            ) : loadingDocs ? (
              <div className="text-sm text-slate-500 text-center py-12">
                Loading…
              </div>
            ) : docs.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-12">
                No documents yet. Upload one on the left.
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/60"
                  >
                    <div className="h-9 w-9 rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {d.name}
                      </div>
                      {d.notes && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {d.notes}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 mt-1">
                        Uploaded by {d.uploadedByEmail || "unknown"} on{" "}
                        {new Date(d.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-2.5 py-1 rounded bg-slate-700/60 text-slate-200 border border-slate-600/60 hover:border-orange-500/40 inline-flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                    <button
                      onClick={() => remove(d.id)}
                      className="text-xs px-2.5 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 inline-flex items-center gap-1 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </StaffCard>
      </div>
    </StaffLayout>
  );
}

export default function StaffPartnerDocuments() {
  return (
    <PermissionGate perm="partner.document_upload">
      <View />
    </PermissionGate>
  );
}
