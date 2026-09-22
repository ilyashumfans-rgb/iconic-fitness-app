import { attendanceDuration, attendanceLinkParams, attendanceTime, decodeAttendanceQr } from "./attendance";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Pure regression cases: no camera, account, API or real attendance writes. */
export function runAttendanceRegressionTests() {
  const token = `v1.12.${"a".repeat(43)}`;
  assert(decodeAttendanceQr(token) === token, "Raw token accepted");
  assert(decodeAttendanceQr(`iconic-app://check-in?code=${token}`) === token, "App QR decoded");
  for (const invalid of [
    `https://example.com/check-in?code=${token}`,
    `iconic-app://other?code=${token}`,
    `iconic-app://check-in?code=${token}&code=${token}`,
    `iconic-app://check-in?code=${token}&action=checkout`,
    `iconic-app://check-in?code=${token}#fragment`,
    "not a QR code",
  ]) {
    let rejected = false;
    try { decodeAttendanceQr(invalid); } catch { rejected = true; }
    assert(rejected, `Reject unsupported QR: ${invalid}`);
  }
  const duplicated = attendanceLinkParams([token, token], "checkout");
  assert(!!duplicated.error && !duplicated.code, "Repeated code rejected with friendly error");
  assert(!duplicated.error?.includes("trim"), "No implementation error shown");
  assert(attendanceLinkParams(token, ["checkout", "checkin"]).action === undefined, "Repeated action is not trusted");
  assert(attendanceLinkParams(token, "other").action === undefined, "Invalid action discarded");
  const checkout = attendanceLinkParams(token, "checkout");
  assert(checkout.returnTo.includes(`code=${token}`) && checkout.returnTo.includes("action=checkout"), "Auth redirect retains valid code and checkout");
  assert(attendanceLinkParams(undefined, "checkout").returnTo === "/check-in?action=checkout", "Action-only redirect retained");
  assert(attendanceLinkParams(undefined, undefined).returnTo === "/check-in", "Empty link opens scanner");
  assert(!!attendanceLinkParams("", "checkin").error, "Empty code rejected");
  assert(attendanceDuration(95) === "1h 35m", "Completed duration formatting");
  assert(attendanceDuration(0) === "0h 0m", "Zero duration formatting");
  const midnight = attendanceTime("2026-05-01T18:30:01.000Z");
  assert(midnight.includes("2 May 2026") && midnight.includes("12:00:01") && midnight.endsWith("IST"), "IST date rollover and exact seconds");
  assert(attendanceTime("invalid") === "Time unavailable", "Invalid timestamp handled");
}