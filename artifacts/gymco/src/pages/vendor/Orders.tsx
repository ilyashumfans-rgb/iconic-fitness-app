import { useEffect, useState } from "react";
import { VendorLayout, VendorCard } from "@/components/vendor/VendorLayout";
import { vendorApi, type VendorOrder } from "@/lib/vendorApi";
import { ReceiptText, Printer } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-lime-50 text-lime-700 border-lime-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const VENDOR_STATUSES = [
  "placed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function VendorOrders() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<VendorOrder | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = () => {
    vendorApi
      .orders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const changeStatus = async (orderId: number, status: string) => {
    setSavingId(orderId);
    try {
      await vendorApi.updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                vendorStatus: status,
                items: o.items.map((it) => ({ ...it, status })),
              }
            : o,
        ),
      );
    } catch {
      load();
    } finally {
      setSavingId(null);
    }
  };

  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const myTotal = (o: VendorOrder) =>
    o.items.reduce((s, it) => s + it.unitPriceInr * it.qty, 0);

  return (
    <VendorLayout title="Orders & Bills">
      <VendorCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-lime-100 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-lime-500" />
          <div className="text-sm font-bold">Orders containing your items</div>
          <div className="text-xs text-slate-500">({orders.length})</div>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No orders yet. They'll show up here as soon as someone buys your
            products.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-lime-100">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Ship to</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Your total</th>
                <th className="px-5 py-3">Your status</th>
                <th className="px-5 py-3 text-right">Bill</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-lime-100/60 hover:bg-lime-50/50"
                >
                  <td className="px-5 py-3">
                    <div className="font-bold">#{o.id}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold">{o.customerName}</div>
                    <div className="text-xs text-slate-500">
                      {o.customerPhone}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {o.shippingCity} · {o.shippingPincode}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {o.items.length}
                  </td>
                  <td className="px-5 py-3 font-bold">
                    {inr.format(myTotal(o))}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={o.vendorStatus}
                      disabled={savingId === o.id}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                      className={`text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-md border focus:outline-none focus:ring-2 focus:ring-lime-500/50 disabled:opacity-60 ${
                        STATUS_STYLES[o.vendorStatus] ??
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {VENDOR_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setOpen(o)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-lime-50 text-lime-700 border border-lime-200 hover:bg-lime-100"
                    >
                      <ReceiptText className="h-3.5 w-3.5" /> View bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </VendorCard>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:bg-transparent print:p-0">
          <div className="bg-white border border-lime-100 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl print:shadow-none print:border-0 print:max-h-none print:rounded-none">
            <div className="px-5 py-4 border-b border-lime-100 flex items-center justify-between print:hidden">
              <div className="text-sm font-bold">Order bill</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-lime-50 text-lime-700 border border-lime-200 hover:bg-lime-100"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  onClick={() => setOpen(null)}
                  className="text-xs px-2 py-1 rounded hover:bg-lime-50 text-slate-500"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-lime-500 to-green-500 bg-clip-text text-transparent">
                    Iconic Fitness
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-lime-600 font-bold">
                    Vendor Bill
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-bold text-slate-900">Order #{open.id}</div>
                  <div>{new Date(open.createdAt).toLocaleString("en-IN")}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-lime-100 p-3">
                  <div className="font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Bill to
                  </div>
                  <div className="font-semibold text-slate-900">
                    {open.customerName}
                  </div>
                  <div className="text-slate-600">{open.customerEmail}</div>
                  <div className="text-slate-600">{open.customerPhone}</div>
                </div>
                <div className="rounded-lg border border-lime-100 p-3">
                  <div className="font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Ship to
                  </div>
                  <div className="text-slate-700">{open.shippingAddress}</div>
                  <div className="text-slate-700">
                    {open.shippingCity} - {open.shippingPincode}
                  </div>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-lime-100">
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {open.items.map((it) => (
                    <tr key={it.id} className="border-b border-lime-100/60">
                      <td className="py-2">
                        {it.productName}
                        {it.variant ? (
                          <span className="text-xs text-slate-500">
                            {" "}
                            · {it.variant}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right">{it.qty}</td>
                      <td className="py-2 text-right">
                        {inr.format(it.unitPriceInr)}
                      </td>
                      <td className="py-2 text-right font-bold">
                        {inr.format(it.unitPriceInr * it.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-3 text-right font-bold">
                      Subtotal (your items)
                    </td>
                    <td className="pt-3 text-right font-extrabold text-lime-600">
                      {inr.format(myTotal(open))}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-lime-100">
                Payment method: {open.paymentMethod.toUpperCase()} · Status:{" "}
                {open.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
