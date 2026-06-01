import { useEffect, useMemo, useState } from "react";
import { VendorLayout, VendorCard } from "@/components/vendor/VendorLayout";
import { vendorApi, type VendorOrder, type VendorProduct } from "@/lib/vendorApi";
import {
  Package,
  AlertTriangle,
  ReceiptText,
  IndianRupee,
  TrendingUp,
} from "lucide-react";

function StatTile({
  label,
  value,
  hint,
  iconBg,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <VendorCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{value}</div>
          <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
          {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
        </div>
        <div
          className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center text-white`}
        >
          {icon}
        </div>
      </div>
    </VendorCard>
  );
}

export default function VendorDashboard() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([vendorApi.products.list(), vendorApi.orders()])
      .then(([p, o]) => {
        setProducts(p);
        setOrders(o);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active").length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock < 5).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const revenue = orders.reduce(
      (sum, o) =>
        sum +
        o.items.reduce((s, it) => s + it.unitPriceInr * it.qty, 0),
      0,
    );
    return {
      products: products.length,
      activeProducts,
      lowStock,
      outOfStock,
      orders: orders.length,
      revenue,
    };
  }, [products, orders]);

  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  return (
    <VendorLayout title="Vendor Dashboard">
      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Products"
              value={stats.products}
              hint={`${stats.activeProducts} active`}
              iconBg="bg-lime-500"
              icon={<Package className="h-5 w-5 text-white" />}
            />
            <StatTile
              label="Low / Out of Stock"
              value={`${stats.lowStock} / ${stats.outOfStock}`}
              hint="Restock soon"
              iconBg="bg-green-500"
              icon={<AlertTriangle className="h-5 w-5 text-white" />}
            />
            <StatTile
              label="Orders"
              value={stats.orders}
              hint="All-time"
              iconBg="bg-lime-500"
              icon={<ReceiptText className="h-5 w-5 text-white" />}
            />
            <StatTile
              label="Revenue"
              value={inr.format(stats.revenue)}
              hint="From your items"
              iconBg="bg-emerald-500"
              icon={<IndianRupee className="h-5 w-5 text-white" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VendorCard>
              <div className="px-5 py-4 border-b border-lime-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">Low stock alerts</div>
                  <div className="text-xs text-slate-500">
                    Items with fewer than 5 units left
                  </div>
                </div>
                <TrendingUp className="h-4 w-4 text-lime-500" />
              </div>
              {products.filter((p) => p.stock < 5).length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  Everything in stock. Nice work.
                </div>
              ) : (
                <ul className="divide-y divide-lime-100">
                  {products
                    .filter((p) => p.stock < 5)
                    .slice(0, 8)
                    .map((p) => (
                      <li
                        key={p.id}
                        className="px-5 py-3 flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {p.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.category}
                          </div>
                        </div>
                        <div
                          className={`text-xs font-bold px-2 py-1 rounded-md ${
                            p.stock === 0
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-green-50 text-green-700 border border-green-200"
                          }`}
                        >
                          {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </VendorCard>

            <VendorCard>
              <div className="px-5 py-4 border-b border-lime-100">
                <div className="text-sm font-bold">Recent orders</div>
                <div className="text-xs text-slate-500">
                  Last 8 orders containing your items
                </div>
              </div>
              {orders.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  No orders yet.
                </div>
              ) : (
                <ul className="divide-y divide-lime-100">
                  {orders.slice(0, 8).map((o) => {
                    const myTotal = o.items.reduce(
                      (s, it) => s + it.unitPriceInr * it.qty,
                      0,
                    );
                    return (
                      <li
                        key={o.id}
                        className="px-5 py-3 flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            #{o.id} · {o.customerName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {o.shippingCity} ·{" "}
                            {new Date(o.createdAt).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {inr.format(myTotal)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </VendorCard>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
