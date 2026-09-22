/** Parsing is not verification: the server authenticates every signed QR token. */
export function decodeAttendanceQr(value: string): string {
  let token = value.trim();
  if (token.startsWith("iconic-app://")) {
    const url = new URL(token);
    if (url.protocol !== "iconic-app:" || url.hostname !== "check-in" ||
        (url.pathname !== "" && url.pathname !== "/") || url.hash ||
        [...url.searchParams.keys()].some(key => key !== "code") ||
        url.searchParams.getAll("code").length !== 1) {
      throw new Error("This is not an Iconic attendance QR code.");
    }
    token = url.searchParams.get("code") ?? "";
  }
  if (!/^[A-Za-z0-9_.-]{16,4096}$/.test(token)) {
    throw new Error("Invalid attendance QR. Scan the code displayed at your gym.");
  }
  return token;
}

export function attendanceLinkParams(code: unknown, action: unknown): {
  code?: string;
  action?: "checkin" | "checkout";
  error?: string;
  returnTo: string;
} {
  const normalizedAction = action === "checkin" || action === "checkout" ? action : undefined;
  let normalizedCode: string | undefined;
  let error: string | undefined;
  if (code !== undefined) {
    if (typeof code !== "string") {
      error = "Invalid attendance link. Use a QR code with one code parameter, or scan again at your gym.";
    } else {
      try { normalizedCode = decodeAttendanceQr(code); }
      catch { error = "Invalid attendance link. Scan the attendance QR displayed at your gym."; }
    }
  }
  const params = new URLSearchParams();
  if (normalizedCode) params.set("code", normalizedCode);
  if (normalizedAction) params.set("action", normalizedAction);
  const query = params.toString();
  return { code: normalizedCode, action: normalizedAction, error, returnTo: `/check-in${query ? `?${query}` : ""}` };
}

export function attendanceTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }).format(date) + " IST";
}

export function attendanceDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`;
}