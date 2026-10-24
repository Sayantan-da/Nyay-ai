// Nyaya AI Design System - Professional Legal-Tech Tokens
// Primary Style: Warm Ivory / Editorial Off-White Surfaces, Charcoal/Navy Typography, Restrained Indigo Accent

export const LIGHT_THEME = {
  mode: "light",
  // Surfaces
  background: "#F8F7F4", // Warm ivory/off-white background
  surface: "#FFFFFF",    // Crisp white card surface
  surfaceSecondary: "#F2F0EB", // Soft warm tint for secondary elements
  surfaceHover: "#EBE9E2",
  card: "#FFFFFF",
  cardBorder: "#E5E3DC", // Subtle, thin warm border
  border: "#E2E0D8",
  borderSubtle: "#EEECE5",
  inputBorder: "#D8D6CE",
  inputFocusBorder: "#4F46E5",
  divider: "#ECEAE3",

  // Typography
  textPrimary: "#0F172A",   // Deep navy / charcoal
  textSecondary: "#475569", // Muted slate
  textMuted: "#808A9D",     // Soft secondary slate
  textInverse: "#FFFFFF",

  // Accents & Brand
  primary: "#4338CA",       // Restrained deep indigo
  primaryLight: "#4F46E5",  // Slate indigo
  primaryHover: "#3730A3",
  primaryBg: "#EEF2FF",     // 5% tint for highlights
  primaryBorder: "#C7D2FE",

  secondary: "#0284C7",     // Accessible teal/sky
  secondaryBg: "#E0F2FE",

  accent: "#D97706",        // Warm amber for statutory notes
  accentBg: "#FEF3C7",

  // Status & Badges
  success: "#059669",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  successText: "#065F46",

  warning: "#D97706",
  warningBg: "#FFFBEB",
  warningBorder: "#FDE68A",
  warningText: "#92400E",

  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  dangerText: "#991B1B",

  // Badges
  badgeHighBg: "#FEE2E2",
  badgeHighText: "#B91C1C",
  badgeMedBg: "#FEF3C7",
  badgeMedText: "#B45309",
  badgeLowBg: "#ECFDF5",
  badgeLowText: "#047857",

  // Shadow tokens
  shadowSm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  shadowMd: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  }
};

export const DARK_THEME = {
  mode: "dark",
  // Surfaces
  background: "#090D16",
  surface: "#111827",
  surfaceSecondary: "#172033",
  surfaceHover: "#1E293B",
  card: "#151F32",
  cardBorder: "#243248",
  border: "#1E2B3E",
  borderSubtle: "#172335",
  inputBorder: "#2E3E56",
  inputFocusBorder: "#6366F1",
  divider: "#1E2B3E",

  // Typography
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  textInverse: "#090D16",

  // Accents & Brand
  primary: "#6366F1",
  primaryLight: "#818CF8",
  primaryHover: "#4F46E5",
  primaryBg: "rgba(99, 102, 241, 0.12)",
  primaryBorder: "rgba(99, 102, 241, 0.3)",

  secondary: "#38BDF8",
  secondaryBg: "rgba(56, 189, 248, 0.12)",

  accent: "#FBBF24",
  accentBg: "rgba(251, 191, 36, 0.12)",

  // Status & Badges
  success: "#10B981",
  successBg: "rgba(16, 185, 129, 0.12)",
  successBorder: "rgba(16, 185, 129, 0.25)",
  successText: "#34D399",

  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.12)",
  warningBorder: "rgba(245, 158, 11, 0.25)",
  warningText: "#FBBF24",

  danger: "#EF4444",
  dangerBg: "rgba(239, 68, 68, 0.12)",
  dangerBorder: "rgba(239, 68, 68, 0.25)",
  dangerText: "#F87171",

  // Badges
  badgeHighBg: "rgba(239, 68, 68, 0.16)",
  badgeHighText: "#FCA5A5",
  badgeMedBg: "rgba(245, 158, 11, 0.16)",
  badgeMedText: "#FCD34D",
  badgeLowBg: "rgba(16, 185, 129, 0.16)",
  badgeLowText: "#6EE7B7",

  shadowSm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1
  },
  shadowMd: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40
};

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999
};

export const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: "700", letterSpacing: -0.4, lineHeight: 30 },
  h2: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3, lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2, lineHeight: 22 },
  body: { fontSize: 14, fontWeight: "400", lineHeight: 21 },
  bodyMedium: { fontSize: 14, fontWeight: "500", lineHeight: 21 },
  bodyBold: { fontSize: 14, fontWeight: "600", lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
  captionMedium: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  tiny: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 }
};
