/**
 * Iconic Fitness — palette built around the Iconic green (logo #7FC240).
 *
 * Two full palettes are defined: `light` (clean, white-based) and `dark`
 * (deep near-black). The active palette is chosen by the ThemeProvider
 * (hooks/useTheme) via useColors(), so the app supports a real light/dark
 * toggle. Both palettes share identical keys so every component just works.
 */

const colors = {
  light: {
    // Legacy aliases
    text: "#16180F",
    tint: "#5E9E2E",

    // Core surfaces
    background: "#FFFFFF",
    foreground: "#16180F",

    // Cards / elevated surfaces
    card: "#FFFFFF",
    cardForeground: "#16180F",
    elevated: "#F2F5EC",

    // Primary action color (logo green, deepened so white text passes contrast)
    primary: "#0BE607",
    primaryForeground: "#0A0C08",

    // Brand button gradient (logo green), used for primary buttons app-wide
    primaryGradient: ["#0BE607", "#05A303"],

    // Secondary surfaces
    secondary: "#EEF2E6",
    secondaryForeground: "#2A3320",

    // Muted / subdued
    muted: "#F2F5EC",
    mutedForeground: "#6B7560",

    // Accent
    accent: "#E9F3DC",
    accentForeground: "#3C6B12",

    // Destructive
    destructive: "#E5484D",
    destructiveForeground: "#FFFFFF",

    // Borders / inputs
    border: "#E2E7D8",
    input: "#EEF2E6",

    // Domain accents (rings, charts, badges) — tuned for light surfaces
    water: "#1FA0C4",
    calorie: "#E8732B",
    protein: "#8E5BE0",
    steps: "#5E9E2E",
    success: "#2F9E45",
    warning: "#C9931A",
  },

  dark: {
    // Legacy aliases
    text: "#F4F7EE",
    tint: "#7FC240",

    // Core surfaces
    background: "#0A0C08",
    foreground: "#F4F7EE",

    // Cards / elevated surfaces
    card: "#14180F",
    cardForeground: "#F4F7EE",
    elevated: "#1B2113",

    // Primary action color (bright logo green on dark)
    primary: "#0BE607",
    primaryForeground: "#0A0C08",

    // Brand button gradient (logo green), used for primary buttons app-wide
    primaryGradient: ["#0BE607", "#05A303"],

    // Secondary surfaces
    secondary: "#1B2113",
    secondaryForeground: "#E6F0D6",

    // Muted / subdued
    muted: "#1B2113",
    mutedForeground: "#94A187",

    // Accent
    accent: "#1F2A12",
    accentForeground: "#7FC240",

    // Destructive
    destructive: "#FF6B6B",
    destructiveForeground: "#0A0C08",

    // Borders / inputs
    border: "#262E1A",
    input: "#1B2113",

    // Domain accents (rings, charts, badges)
    water: "#43D6F7",
    calorie: "#FF9248",
    protein: "#B98BFF",
    steps: "#7FC240",
    success: "#7CE38B",
    warning: "#FFCF5C",
  },

  radius: 20,
};

export default colors;
