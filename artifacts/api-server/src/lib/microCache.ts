import type { NextFunction, Request, Response } from "express";

/**
 * Tiny in-process response cache ("micro-cache") for hot PUBLIC GET
 * endpoints. Under heavy load (lakhs of members), even a short TTL collapses
 * thousands of identical DB round-trips per second into one.
 *
 * Scope rules — only use on routes that:
 *  - are GET and fully public (no auth, no per-user variance), and
 *  - key entirely off the URL + query string.
 *
 * Successful (2xx) JSON responses are cached for `ttlMs`; everything else
 * passes through untouched. Entries are swept opportunistically so the map
 * can't grow unbounded from URL/query permutations.
 */

type Entry = { at: number; status: number; body: unknown };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 2000;

function sweep(now: number, ttlMs: number): void {
  if (store.size < MAX_ENTRIES) return;
  for (const [k, v] of store) {
    if (now - v.at > ttlMs) store.delete(k);
  }
  // Still oversized (all fresh)? Drop oldest-inserted entries.
  if (store.size >= MAX_ENTRIES) {
    for (const k of store.keys()) {
      store.delete(k);
      if (store.size < MAX_ENTRIES / 2) break;
    }
  }
}

/** Drop every cached response (used by tests / after admin catalog edits). */
export function clearMicroCache(): void {
  store.clear();
}

export function microCache(ttlMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "GET") {
      next();
      return;
    }
    const key = req.originalUrl;
    const now = Date.now();
    const hit = store.get(key);
    if (hit && now - hit.at < ttlMs) {
      res.setHeader("X-Cache", "HIT");
      res.status(hit.status).json(hit.body);
      return;
    }
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        sweep(now, ttlMs);
        store.set(key, { at: Date.now(), status: res.statusCode, body });
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };
    next();
  };
}
