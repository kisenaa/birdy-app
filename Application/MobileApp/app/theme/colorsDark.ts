const palette = {
  neutral900: "#FFFFFF",
  neutral800: "#F4F2F1",
  neutral700: "#D7CEC9",
  neutral600: "#B6ACA6",
  neutral500: "#978F8A",
  neutral400: "#564E4A",
  neutral300: "#3C3836",
  neutral200: "#191015",
  neutral100: "#000000",

  primary600: "#F4E0D9",
  primary500: "#E8C1B4",
  primary400: "#DDA28E",
  primary300: "#D28468",
  primary200: "#C76542",
  primary100: "#A54F31",

  secondary500: "#DCDDE9",
  secondary400: "#BCC0D6",
  secondary300: "#9196B9",
  secondary200: "#626894",
  secondary100: "#41476E",

  accent500: "#FFEED4",
  accent400: "#FFE1B2",
  accent300: "#FDD495",
  accent200: "#FBC878",
  accent100: "#FFBB50",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  overlay20: "rgba(25, 16, 21, 0.2)",
  overlay50: "rgba(25, 16, 21, 0.5)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
  // Add these missing Material Design colors
  /**
   * Primary color for main UI elements
   */
  primary: palette.primary500,
  /**
   * Text/content color on primary backgrounds
   */
  onPrimary: palette.neutral100,
  /**
   * Secondary color for supporting elements
   */
  secondary: palette.secondary500,
  /**
   * Text/content color on secondary backgrounds
   */
  onSecondary: palette.neutral100,
  /**
   * Surface color for cards, sheets, etc.
   */
  surface: palette.neutral100,
  /**
   * Text/content color on surface backgrounds
   */
  onSurface: palette.neutral800,
  /**
   * Outline color for borders and dividers
   */
  outline: palette.neutral400,
} as const
