const domain = process.env.EXPO_PUBLIC_DOMAIN;
const base = domain ? `https://${domain}` : "";

/**
 * Resolve an image path coming from the API into an absolute URL the native
 * <Image> component can load. Absolute http(s) URLs (e.g. Unsplash hero images)
 * are returned untouched; relative API paths (e.g. /api/storage/db-images/12)
 * get the server domain prepended.
 */
export function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
