/**
 * Accept only in-app routes: a single leading slash, no protocol-relative
 * ("//host"), backslash, scheme, or control characters. Anything else is
 * dropped so a push/feed payload can never navigate outside the app.
 */
export function safeInternalLink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (s.length < 1 || s.length > 300) return null;
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(s)) return null;
  if (/^\/[^?#]*:/.test(s) || s.includes("://")) return null;
  return s;
}
