export function normalizeIndianMobile(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, "");
  const local = digits.startsWith("+91") ? digits.slice(3) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

export function maskMobile(mobile: string): string {
  return `+91 ••••••${mobile.slice(-4)}`;
}

export function secondsRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/**
 * Claims a completed code once for automatic verification. Manual retries do
 * not use this guard, so a failed or expired request never traps the user.
 */
export class OtpAutoSubmit {
  private claimedKeys = new Set<string>();

  claim(challengeId: string, code: string): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    const key = `${challengeId}:${code}`;
    if (this.claimedKeys.has(key)) return false;
    this.claimedKeys.add(key);
    return true;
  }
}

/** Every asynchronous continuation must still belong to the visible challenge. */
export class OtpAttempt {
  private generation = 0;
  private controller: AbortController | undefined;

  get signal() { return this.controller?.signal; }

  begin() {
    this.cancel();
    this.controller = new AbortController();
    const generation = this.generation;
    return () => generation === this.generation && !this.controller?.signal.aborted;
  }

  cancel() {
    this.generation += 1;
    this.controller?.abort();
  }
}