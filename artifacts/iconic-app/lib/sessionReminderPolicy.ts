export function sessionReminderKey(link: string | undefined): string | null {
  const match = /^\/network-coach\/call\?bookingId=([1-9]\d*)&role=(member|trainer)$/.exec(link ?? "");
  return match ? `nc.push.${match[2]}.${match[1]}` : null;
}

export function shouldShowSessionAlert(input: {
  link?: string; createdAt: string; alreadyShown: boolean; pushRegistered: boolean; now?: number;
}) {
  const age = (input.now ?? Date.now()) - Date.parse(input.createdAt);
  return sessionReminderKey(input.link) !== null && !input.alreadyShown && !input.pushRegistered
    && Number.isFinite(age) && age >= 0 && age < 10 * 60_000;
}
