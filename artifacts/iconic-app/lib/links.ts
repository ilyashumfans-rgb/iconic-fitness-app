import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

const domain = process.env.EXPO_PUBLIC_DOMAIN;

/** Public-facing GYMCO/Iconic website + linked surfaces, served via the proxy. */
export const websiteUrl = domain
  ? `https://${domain}`
  : "https://iconicfitnessindia.com";
export const exploreUrl = `${websiteUrl}/explore`;
export const storeUrl = `${websiteUrl}/store`;
export const membershipsUrl = `${websiteUrl}/memberships`;
export const promoVideoUrl = `${websiteUrl}/gymco-promo/`;

/**
 * Open a payment URL in the system browser (full Chrome/Safari), NOT the
 * in-app browser. UPI payments (GPay/PhonePe) need to hand off to another
 * app via an intent, which stalls with an endless spinner inside the in-app
 * browser tab on some devices. The system browser handles the handoff
 * reliably.
 */
export async function openPayment(url: string): Promise<void> {
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // Nothing else we can do — fail quietly rather than crash.
    }
  }
}

/** Open a URL in an in-app browser, falling back to the system browser. */
export async function openExternal(url: string): Promise<void> {
  if (!url) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      // Nothing else we can do — fail quietly rather than crash.
    }
  }
}
