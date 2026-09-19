import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

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
 * Payment links are returned by the billing system and must always be hosted
 * pages. Keeping this check here means every payment entry point gets the
 * same explicit failure for an empty, malformed, or unsafe URL.
 */
export function validatePaymentUrl(url: string): string {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) {
    throw new Error("The payment provider did not return a payment URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("The payment provider returned an invalid payment URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("The payment URL must use http or https.");
  }

  return value;
}

/**
 * Open a payment URL in the system browser (full Chrome/Safari), NOT the
 * in-app browser. UPI payments (GPay/PhonePe) need to hand off to another
 * app via an intent, which stalls with an endless spinner inside the in-app
 * browser tab on some devices. The system browser handles the handoff
 * reliably.
 */
export async function openPayment(url: string): Promise<void> {
  const paymentUrl = validatePaymentUrl(url);

  if (Platform.OS === "web") {
    // Do not use Linking on web: its fallback can navigate the Expo preview
    // iframe away from the app. A null return means the browser blocked the
    // popup, which the checkout screen can explain and offer to retry from a
    // direct button gesture.
    // `noopener` in window.open's features returns null even on successful
    // opens in some browsers. Open a blank same-origin window first, detach
    // its opener before navigation, and retain reliable popup-block detection.
    const opened = window.open("about:blank", "_blank");
    if (!opened) {
      throw new Error(
        "Your browser blocked the payment window. Select Continue to payment to try again.",
      );
    }
    try {
      opened.opener = null;
      opened.location.replace(paymentUrl);
    } catch {
      opened.close();
      throw new Error("Unable to open the payment page. Select Continue to payment to try again.");
    }
    return;
  }

  let linkingError: unknown;
  try {
    await Linking.openURL(paymentUrl);
    return;
  } catch (error) {
    linkingError = error;
  }

  try {
    await WebBrowser.openBrowserAsync(paymentUrl);
    return;
  } catch (browserError) {
    const reason =
      browserError instanceof Error
        ? browserError.message
        : linkingError instanceof Error
          ? linkingError.message
          : "the system could not open a browser";
    throw new Error(`Unable to open the payment page: ${reason}`);
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
