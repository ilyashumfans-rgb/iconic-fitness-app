import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  priceInr: number;
  imageUrl: string;
  vendorPartnerId: number;
  vendorName?: string;
  size?: string;
  color?: string;
  qty: number;
};

// Cart lines are keyed by product + chosen variant so the same product in two
// different sizes/colours occupies distinct lines.
export function cartKey(item: {
  productId: number;
  size?: string;
  color?: string;
}): string {
  return `${item.productId}|${item.size ?? ""}|${item.color ?? ""}`;
}

const KEY = "iconic.cart.v1";
const EVT = "iconic.cart.change";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x.productId === "number");
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVT));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const next = read();
    const key = cartKey(item);
    const ex = next.find((i) => cartKey(i) === key);
    if (ex) ex.qty = Math.min(99, ex.qty + qty);
    else next.push({ ...item, qty: Math.max(1, qty) });
    write(next);
  }, []);

  const remove = useCallback((key: string) => {
    write(read().filter((i) => cartKey(i) !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    const next = read();
    const ex = next.find((i) => cartKey(i) === key);
    if (!ex) return;
    if (qty <= 0) write(next.filter((i) => cartKey(i) !== key));
    else {
      ex.qty = Math.max(1, Math.min(99, qty));
      write(next);
    }
  }, []);

  const clear = useCallback(() => write([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.priceInr * i.qty, 0);

  return { items, add, remove, setQty, clear, count, subtotal };
}
