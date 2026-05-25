const BASE = "/api";

export type Vendor = {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  status: string;
  kind: "vendor" | "both";
  notes?: string;
  createdAt?: string;
};

export type VendorProduct = {
  id: number;
  vendorPartnerId: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  priceInr: number;
  originalPriceInr: number;
  imageUrl: string;
  gallery: string[];
  stock: number;
  status: string;
  createdAt: string;
};

export type VendorOrderItem = {
  id: number;
  orderId: number;
  productId: number;
  vendorPartnerId: number;
  productName: string;
  unitPriceInr: number;
  qty: number;
};

export type VendorOrder = {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPincode: string;
  totalInr: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: VendorOrderItem[];
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const vendorApi = {
  // Auth — vendor-specific endpoints gate by `kind`. Products/orders reuse the
  // partner endpoints (server scopes them to the logged-in partner ID anyway).
  login: (email: string, password: string) =>
    request<Vendor>("/vendor/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>("/vendor/logout", { method: "POST" }),
  me: () => request<Vendor>("/vendor/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>("/partner/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  products: {
    list: () => request<VendorProduct[]>("/partner/products"),
    create: (body: Record<string, unknown>) =>
      request<VendorProduct>("/partner/products", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<VendorProduct>(`/partner/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/partner/products/${id}`, { method: "DELETE" }),
  },
  orders: () => request<VendorOrder[]>("/partner/orders"),
};
