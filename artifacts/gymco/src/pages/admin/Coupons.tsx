import { useEffect, useState } from "react";
import { AdminLayout, AdminCard } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, X, TicketPercent } from "lucide-react";

type Coupon = {
  id: number;
  code: string;
  description: string;
  discountType: "percent" | "flat";
  discountValue: number;
  maxDiscountInr: number;
  minAmountInr: number;
  appliesTo: "all" | "membership" | "pt";
  maxUses: number;
  usedCount: number;
  perUserLimit: number;
  expiresOn: string | null;
  isActive: boolean;
};

type FormState = {
  code: string;
  description: string;
  discountType: "percent" | "flat";
  discountValue: string;
  maxDiscountInr: string;
  minAmountInr: string;
  appliesTo: "all" | "membership" | "pt";
  maxUses: string;
  perUserLimit: string;
  expiresOn: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "",
  maxDiscountInr: "",
  minAmountInr: "",
  appliesTo: "all",
  maxUses: "",
  perUserLimit: "1",
  expiresOn: "",
  isActive: true,
};

const APPLIES_LABEL: Record<Coupon["appliesTo"], string> = {
  all: "Memberships + PT",
  membership: "Memberships only",
  pt: "PT sessions only",
};

export default function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setBusy(true);
    setErr(null);
    adminApi.coupons
      .list()
      .then((data) => setRows(data as Coupon[]))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const startCreate = () => {
    setForm(EMPTY);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (row: Coupon) => {
    setForm({
      code: row.code,
      description: row.description,
      discountType: row.discountType,
      discountValue: String(row.discountValue),
      maxDiscountInr: row.maxDiscountInr ? String(row.maxDiscountInr) : "",
      minAmountInr: row.minAmountInr ? String(row.minAmountInr) : "",
      appliesTo: row.appliesTo,
      maxUses: row.maxUses ? String(row.maxUses) : "",
      perUserLimit: String(row.perUserLimit),
      expiresOn: row.expiresOn ?? "",
      isActive: row.isActive,
    });
    setEditing(row);
    setCreating(false);
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.code.trim() || !form.discountValue.trim()) {
      setErr("Code and discount value are required");
      return;
    }
    setSaving(true);
    setErr(null);
    const body = {
      code: form.code,
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountInr: Number(form.maxDiscountInr) || 0,
      minAmountInr: Number(form.minAmountInr) || 0,
      appliesTo: form.appliesTo,
      maxUses: Number(form.maxUses) || 0,
      perUserLimit: Number(form.perUserLimit) || 0,
      expiresOn: form.expiresOn || null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await adminApi.coupons.update(editing.id, body);
      } else {
        await adminApi.coupons.create(body);
      }
      closeForm();
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Coupon) => {
    if (!window.confirm(`Delete coupon "${row.code}"?`)) return;
    try {
      await adminApi.coupons.remove(row.id);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const formOpen = creating || editing !== null;

  return (
    <AdminLayout title="Coupons">
      <div className="space-y-4">
        <AdminCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <TicketPercent className="h-4 w-4" /> Discount Coupons
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Create coupon codes members can apply when buying membership
                packages or PT sessions in the app. A coupon only counts as
                used when the payment succeeds.
              </p>
            </div>
            <Button onClick={startCreate} size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add coupon
            </Button>
          </div>
        </AdminCard>

        {err ? (
          <AdminCard>
            <p className="text-sm text-red-500">{err}</p>
          </AdminCard>
        ) : null}

        {formOpen ? (
          <AdminCard>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {editing ? `Edit ${editing.code}` : "New coupon"}
              </h3>
              <Button variant="ghost" size="icon" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Coupon code</Label>
                  <Input
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. NEWYEAR50"
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="e.g. New Year offer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Discount type</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        discountType: v as FormState["discountType"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="flat">Flat amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    {form.discountType === "percent"
                      ? "Discount (%)"
                      : "Discount (₹)"}
                  </Label>
                  <Input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discountValue: e.target.value }))
                    }
                    placeholder={form.discountType === "percent" ? "10" : "500"}
                  />
                </div>
                {form.discountType === "percent" ? (
                  <div>
                    <Label>Max discount ₹ (0 = no cap)</Label>
                    <Input
                      type="number"
                      value={form.maxDiscountInr}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          maxDiscountInr: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Applies to</Label>
                  <Select
                    value={form.appliesTo}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        appliesTo: v as FormState["appliesTo"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Memberships + PT</SelectItem>
                      <SelectItem value="membership">
                        Memberships only
                      </SelectItem>
                      <SelectItem value="pt">PT sessions only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Minimum purchase ₹ (optional)</Label>
                  <Input
                    type="number"
                    value={form.minAmountInr}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minAmountInr: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Expiry date (optional)</Label>
                  <Input
                    type="date"
                    value={form.expiresOn}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expiresOn: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Total uses allowed (0 = unlimited)</Label>
                  <Input
                    type="number"
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxUses: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Uses per member (0 = unlimited)</Label>
                  <Input
                    type="number"
                    value={form.perUserLimit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, perUserLimit: e.target.value }))
                    }
                    placeholder="1"
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, isActive: v }))
                    }
                  />
                  <span className="text-sm">
                    {form.isActive ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
              <div>
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  {editing ? "Save changes" : "Create coupon"}
                </Button>
              </div>
            </div>
          </AdminCard>
        ) : null}

        <AdminCard>
          {busy ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No coupons yet. Create your first one — members apply the code
              when paying in the app.
            </p>
          ) : (
            <div className="divide-y">
              {rows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold">
                        {row.code}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {row.discountType === "percent"
                          ? `${row.discountValue}% off${row.maxDiscountInr ? ` (max ₹${row.maxDiscountInr})` : ""}`
                          : `₹${row.discountValue} off`}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {APPLIES_LABEL[row.appliesTo]}
                      </span>
                      {!row.isActive ? (
                        <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-xs text-yellow-600">
                          Disabled
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.description ? `${row.description} · ` : ""}
                      Used {row.usedCount}
                      {row.maxUses ? ` of ${row.maxUses}` : ""} times
                      {row.minAmountInr
                        ? ` · min purchase ₹${row.minAmountInr}`
                        : ""}
                      {row.expiresOn ? ` · expires ${row.expiresOn}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
