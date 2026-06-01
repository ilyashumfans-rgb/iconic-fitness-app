import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  priceInr: number;
  imageUrl: string;
  vendorPartnerId: number;
  vendorName?: string;
  qty: number;
};

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
    const ex = next.find((i) => i.productId === item.productId);
    if (ex) ex.qty = Math.min(99, ex.qty + qty);
    else next.push({ ...item, qty: Math.max(1, qty) });
    write(next);
  }, []);

  const remove = useCallback((productId: number) => {
    write(read().filter((i) => i.productId !== productId));
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    const next = read();
    const ex = next.find((i) => i.productId === productId);
    if (!ex) return;
    if (qty <= 0) write(next.filter((i) => i.productId !== productId));
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
