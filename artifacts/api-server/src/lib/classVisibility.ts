// Product rule: a scheduled class only becomes visible — and bookable — to
// members on the member-facing pages exactly one day before it starts. Until
// then it stays hidden so the schedule shows only imminent, bookable classes.
export const CLASS_VISIBLE_BEFORE_MS = 24 * 60 * 60 * 1000;

/**
 * A class is visible/bookable to members when it is still upcoming and starts
 * within CLASS_VISIBLE_BEFORE_MS from now (i.e. within one day).
 */
export function isClassVisibleToMembers(
  startsAt: Date,
  now: number = Date.now(),
): boolean {
  const start = startsAt.getTime();
  return start > now && start - now <= CLASS_VISIBLE_BEFORE_MS;
}
