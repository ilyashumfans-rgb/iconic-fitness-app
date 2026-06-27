import colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";

/**
 * Returns the design tokens for the active color scheme.
 *
 * The scheme is driven by the ThemeProvider (hooks/useTheme), which supports an
 * explicit light/dark toggle plus a "system" mode that follows the device. The
 * returned object contains all color tokens for the active palette plus
 * scheme-independent values like `radius`.
 */
export function useColors() {
  const { scheme } = useTheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
