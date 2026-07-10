import { useMemo, useState } from "react";
import type { PackageBookingRow } from "@/lib/partnerApi";

const ALL = "__all__";

function fmtDate(d: string): string {
  if (!d) return "—";
  const parsed = new Date(`${d}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: PackageBookingRow["status"] }) {
  const cls =
    status === "paid"
      ? "bg-green-100 text-green-800"
      : status === "failed"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function PackageBookingsTable({
  rows,
  summary,
}: {
  rows: PackageBookingRow[];
  summary?: string;
}) {
  const [branch, setBranch] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const branches = useMemo(
    () => Array.from(new Set(rows.map((r) => r.gymName))).sort(),
    [rows],
  );
  const filtered = rows.filter(
    (r) =>
      (branch === ALL || r.gymName === branch) &&
      (status === ALL || r.status === status),
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No membership package purchases yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border px-2 py-1.5 text-sm"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          <option value={ALL}>All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border px-2 py-1.5 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value={ALL}>All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        {summary ? (
          <span className="ml-auto text-sm text-muted-foreground">{summary}</span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3">Mobile</th>
              <th className="py-2 pr-3">Branch</th>
              <th className="py-2 pr-3">Package</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Start date</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Purchased</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{r.memberName}</td>
                <td className="py-2 pr-3">{r.mobile}</td>
                <td className="py-2 pr-3">{r.gymName}</td>
                <td className="py-2 pr-3">
                  {r.serviceName ? `${r.serviceName} · ` : ""}
                  {r.packageName}
                </td>
                <td className="py-2 pr-3">₹{r.amountInr.toLocaleString("en-IN")}</td>
                <td className="py-2 pr-3">{fmtDate(r.startDate)}</td>
                <td className="py-2 pr-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-2 text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
