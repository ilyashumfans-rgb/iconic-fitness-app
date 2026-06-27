const IST = "Asia/Kolkata";

/** Calendar date (YYYY-MM-DD) in IST — matches the server's notion of "today". */
export function istDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);
}

export function istToday(): string {
  return istDateStr();
}

export function istDateNDaysAgo(n: number): string {
  return istDateStr(new Date(Date.now() - n * 86_400_000));
}

/** Local clock label, e.g. "7:30 AM". */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Friendly date label, e.g. "Mon, Jun 23". */
export function formatDateLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function isSameDayIso(isoA: string, isoB: string): boolean {
  return istDateStr(new Date(isoA)) === istDateStr(new Date(isoB));
}

/** Single-letter IST weekday for a YYYY-MM-DD date string, e.g. "M". */
export function istWeekdayShort(dateStr: string): string {
  // Anchor at midday UTC so the IST calendar day is unambiguous.
  const d = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    weekday: "narrow",
  }).format(d);
}
