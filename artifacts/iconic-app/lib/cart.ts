import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  priceInr: number;
  imageUrl: string;
  size: string;
  color: string;
  qty: number;
};

const KEY = "iconic.cart.v1";

// Cart lines are keyed by product + chosen variant so the same product in two
// sizes/colors becomes two lines.
export function cartKey(i: {
  productId: number;
  size: string;
  color: string;
}): string {
  return `${i.productId}|${i.size}|${i.color}`;
}

// Module-level store with subscribers so every screen (tab badge, cart page)
// stays in sync without prop-drilling or a provider.
let items: CartItem[] = [];
let loadStarted = false;
// Set as soon as any mutation happens so a slow AsyncStorage read finishing
// later can never overwrite fresher in-memory state with stale persisted data.
let mutated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is CartItem =>
      !!i &&
      typeof i === "object" &&
      Number.isFinite((i as CartItem).productId) &&
      (i as CartItem).productId > 0 &&
      typeof (i as CartItem).name === "string" &&
      Number.isFinite((i as CartItem).priceInr) &&
      Number.isFinite((i as CartItem).qty) &&
      (i as CartItem).qty > 0,
  );
}

async function load(): Promise<void> {
  if (loadStarted) return;
  loadStarted = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // If the user already changed the cart while the read was in flight,
    // the in-memory state is fresher — keep it (it was persisted on mutate).
    if (mutated) return;
    items = raw ? sanitize(JSON.parse(raw)) : [];
    emit();
  } catch {
    if (!mutated) items = [];
  }
}

function persist() {
  mutated = true;
  void AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => undefined);
}

export function useCart() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    void load();
    return () => {
      listeners.delete(l);
    };
  }, []);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const key = cartKey(item);
    const existing = items.find((i) => cartKey(i) === key);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
      items = [...items];
    } else {
      items = [...items, { ...item, qty: Math.max(1, Math.min(99, qty)) }];
    }
    persist();
    emit();
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    if (qty <= 0) {
      items = items.filter((i) => cartKey(i) !== key);
    } else {
      items = items.map((i) =>
        cartKey(i) === key ? { ...i, qty: Math.min(99, qty) } : i,
      );
    }
    persist();
    emit();
  }, []);

  const remove = useCallback((key: string) => {
    items = items.filter((i) => cartKey(i) !== key);
    persist();
    emit();
  }, []);

  const clear = useCallback(() => {
    items = [];
    persist();
    emit();
  }, []);

  const count = useMemo(
    () => items.reduce((n, i) => n + i.qty, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );
  const totalInr = useMemo(
    () => items.reduce((n, i) => n + i.priceInr * i.qty, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  return { items, add, setQty, remove, clear, count, totalInr };
}
