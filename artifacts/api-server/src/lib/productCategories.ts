// Single source of truth for the storefront's default product categories.
//
// Categories are admin-managed via `product_categories`, but until an admin
// first opens the Categories page (which materializes these rows) the storefront
// and product forms fall back to this code default. This mirrors the
// "code-default + lazy materialize" pattern used elsewhere in the app.

export type DefaultCategory = {
  name: string;
  slug: string;
  sortOrder: number;
};

export const DEFAULT_PRODUCT_CATEGORIES: DefaultCategory[] = [
  { name: "Apparel", slug: "apparel", sortOrder: 0 },
  { name: "Equipment", slug: "equipment", sortOrder: 1 },
  { name: "Supplements", slug: "supplements", sortOrder: 2 },
  { name: "Accessories", slug: "accessories", sortOrder: 3 },
  { name: "Wellness", slug: "wellness", sortOrder: 4 },
];
