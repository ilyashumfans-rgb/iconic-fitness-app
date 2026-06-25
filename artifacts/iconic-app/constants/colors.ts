/**
 * Iconic Fitness — bold & energetic dark theme with a bright lime accent.
 *
 * The palette is intentionally dark so the lime (#C7F000) primary pops. Only a
 * `light` key is defined; useColors() falls back to it for every appearance, so
 * the app renders the same energetic dark UI regardless of device setting.
 */

const colors = {
  light: {
    // Legacy aliases
    text: "#F4F7EE",
    tint: "#C7F000",

    // Core surfaces
    background: "#0A0C08",
    foreground: "#F4F7EE",

    // Cards / elevated surfaces
    card: "#14180F",
    cardForeground: "#F4F7EE",
    elevated: "#1B2113",

    // Primary action color
    primary: "#C7F000",
    primaryForeground: "#0A0C08",

    // Secondary surfaces
    secondary: "#1B2113",
    secondaryForeground: "#E6F0D6",

    // Muted / subdued
    muted: "#1B2113",
    mutedForeground: "#94A187",

    // Accent
    accent: "#1F2A12",
    accentForeground: "#C7F000",

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
    steps: "#C7F000",
    success: "#7CE38B",
    warning: "#FFCF5C",
  },

  radius: 20,
};

export default colors;
