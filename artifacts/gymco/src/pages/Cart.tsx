import { Link } from "wouter";
import { useCart } from "@/lib/cart";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";

export default function Cart() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-3xl font-black tracking-tight">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">
          Browse the store and add some gear to get started.
        </p>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-gradient-brand text-white font-bold"
        >
          Go to store <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
        Your cart
      </h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map((i) => (
            <div
              key={i.productId}
              className="flex items-center gap-4 p-3 rounded-2xl bg-card border border-border"
            >
              <Link
                href={`/store/${i.slug}`}
                className="block w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0"
              >
                <img
                  src={i.imageUrl}
                  alt={i.name}
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/store/${i.slug}`}
                  className="font-bold text-foreground hover:underline truncate block"
                >
                  {i.name}
                </Link>
                {i.vendorName && (
                  <div className="text-xs text-muted-foreground">
                    {i.vendorName}
                  </div>
                )}
                <div className="text-sm text-foreground font-semibold mt-1">
                  ₹{i.priceInr.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="inline-flex items-center bg-background border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => cart.setQty(i.productId, i.qty - 1)}
                  className="px-2.5 py-1 text-base font-bold text-muted-foreground hover:text-foreground"
                >
                  −
                </button>
                <span className="px-3 font-bold text-sm">{i.qty}</span>
                <button
                  onClick={() => cart.setQty(i.productId, i.qty + 1)}
                  className="px-2.5 py-1 text-base font-bold text-muted-foreground hover:text-foreground"
                >
                  +
                </button>
              </div>
              <div className="hidden sm:block text-right w-24 font-extrabold text-foreground">
                ₹{(i.priceInr * i.qty).toLocaleString("en-IN")}
              </div>
              <button
                onClick={() => cart.remove(i.productId)}
                className="p-2 text-muted-foreground hover:text-red-500"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <aside className="p-5 rounded-2xl bg-card border border-border h-fit sticky top-24">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-3">
            Order summary
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              Items ({cart.count})
            </span>
            <span className="font-semibold">
              ₹{cart.subtotal.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-semibold text-emerald-500">Free</span>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-border">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold">
              ₹{cart.subtotal.toLocaleString("en-IN")}
            </span>
          </div>
          <Link
            href="/checkout"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-brand text-white font-bold shadow-[0_8px_24px_-8px_hsl(96_56%_55%/0.7)] hover:opacity-95"
          >
            Checkout <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={cart.clear}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Clear cart
          </button>
        </aside>
      </div>
    </div>
  );
}
