import AsyncStorage from "@react-native-async-storage/async-storage";

// Mobile number the user verified against the gym system (YoActiv) on the
// sign-in/up screen *before* authenticating. Once they finish login/signup,
// the root PendingMobileLink component writes it to their profile so their
// membership auto-connects, then clears it.
//
// The stash is short-lived (TTL below) and PendingMobileLink only auto-links
// when the signed-in account has no mobile on file — so a stale number left
// on a shared device can never overwrite a different member's link.
const STORAGE_KEY = "iconic.pendingYoactivMobile";

// A verified number is only trusted for 30 minutes — long enough to finish
// signup, short enough that yesterday's entry on a shared device is ignored.
const TTL_MS = 30 * 60 * 1000;

export async function setPendingMobile(mobile: string): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mobile, verifiedAt: Date.now() }),
    );
  } catch {
    // Best effort — the member can still add their mobile on the Profile tab.
  }
}

export async function getPendingMobile(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    let mobile = "";
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof (parsed as { mobile?: unknown }).mobile !== "string" ||
        typeof (parsed as { verifiedAt?: unknown }).verifiedAt !== "number"
      ) {
        await clearPendingMobile();
        return null;
      }
      const { verifiedAt } = parsed as { mobile: string; verifiedAt: number };
      if (!Number.isFinite(verifiedAt) || Date.now() - verifiedAt > TTL_MS) {
        await clearPendingMobile();
        return null;
      }
      mobile = (parsed as { mobile: string }).mobile;
    } catch {
      // Legacy/corrupt value — drop it rather than trust it.
      await clearPendingMobile();
      return null;
    }
    const digits = mobile.replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : null;
  } catch {
    return null;
  }
}

export async function clearPendingMobile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
