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
