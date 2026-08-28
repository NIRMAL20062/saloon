/**
 * GLIDE Premium Brand Design System.
 * Target Aesthetics: Light-first Warm Ivory (#F8F9FA), Deep Charcoal (#111827),
 * and Electric Cobalt (#2563EB) brand accent highlights.
 * Editorial typography scale, subtle surface elevation, and refined corner radii.
 */

import { Platform } from 'react-native';

const bgCream = '#F6F1E8';
const surfaceWhite = '#FFFFFF';
const textDark = '#201A1D';
const textSecondary = '#756C70';
const brandPlum = '#512A45';
const brandPlumLight = '#F3EBF0';
const accentCoral = '#F06F61';
const accentMustard = '#E7C45A';
const borderCream = '#E5DDD3';
const successGreen = '#23845B';

export const Colors = {
  light: {
    text: textDark,
    textMuted: textSecondary,
    background: bgCream,
    surface: surfaceWhite,
    surfaceSecondary: bgCream,
    surfaceBorder: borderCream,
    tint: brandPlum,
    tintSurface: brandPlumLight,
    accent: brandPlum,
    accentSurface: brandPlumLight,
    coral: accentCoral,
    mustard: accentMustard,
    primaryBrand: brandPlum,
    icon: textSecondary,
    tabIconDefault: textSecondary,
    tabIconSelected: brandPlum,
    inputBackground: surfaceWhite,
    border: borderCream,
    placeholder: textSecondary,
    success: successGreen,
    successSurface: '#E8F5EE',
    danger: '#E53E3E',
    dangerSurface: '#FFF5F5',
    warning: accentMustard,
    warningSurface: '#FFFDF0',
    onTint: '#FFFFFF',
    lightSurface: bgCream,
  },

  dark: {
    text: textDark,
    textMuted: textSecondary,
    background: bgCream,
    surface: surfaceWhite,
    surfaceSecondary: bgCream,
    surfaceBorder: borderCream,
    tint: brandPlum,
    tintSurface: brandPlumLight,
    accent: brandPlum,
    accentSurface: brandPlumLight,
    coral: accentCoral,
    mustard: accentMustard,
    primaryBrand: brandPlum,
    icon: textSecondary,
    tabIconDefault: textSecondary,
    tabIconSelected: brandPlum,
    inputBackground: surfaceWhite,
    border: borderCream,
    placeholder: textSecondary,
    success: successGreen,
    successSurface: '#E8F5EE',
    danger: '#E53E3E',
    dangerSurface: '#FFF5F5',
    warning: accentMustard,
    warningSurface: '#FFFDF0',
    onTint: '#FFFFFF',
    lightSurface: bgCream,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const Shadow = {
  sm: {
    elevation: 2,
    shadowColor: '#201A1D',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  card: {
    elevation: 4,
    shadowColor: '#201A1D',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  glow: {
    elevation: 8,
    shadowColor: '#512A45',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  glowCyan: {
    elevation: 8,
    shadowColor: '#512A45',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
} as const;

export const Typography = {
  displayHero: { fontSize: 30, fontWeight: '800' as const, lineHeight: 36, letterSpacing: -0.5 },
  brandWordmark: { fontSize: 24, fontWeight: '900' as const, lineHeight: 30, letterSpacing: -0.5 },
  screenTitle: { fontSize: 24, fontWeight: '800' as const, lineHeight: 30, letterSpacing: -0.3 },
  sectionHeader: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, letterSpacing: -0.2 },
  sectionHeaderTracked: { fontSize: 13, fontWeight: '800' as const, lineHeight: 18, letterSpacing: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22, letterSpacing: -0.2 },
  bodyText: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  microText: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15 },
  microTracked: { fontSize: 10, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 1 },
};

/**
 * Partner App ("Emerald Business Trust") — a fixed, non-adaptive palette per
 * GLIDE's dual-role design system (docs/THEME_AND_ROLES_COLOR_GUIDE.md,
 * Section 3). Deliberately separate from `Colors` above rather than a third
 * key alongside `light`/`dark`: GLIDE does not support dark mode (a standing
 * product decision, not a gap to fill in later) and the Partner app's
 * palette is a fixed brand identity per role, not a user-toggleable theme —
 * so every `app/(partner)/` screen imports directly from here instead of
 * `useThemeColor`, and this is the one place these hex values are allowed to
 * live. Per the doc's Section 5 rules: never reuse these inside
 * `app/(customer)/` (which has its own palette in `Colors` above), and keep
 * the semantics fixed — emerald for primary/success/open, red for
 * destructive/error, amber for pending/attention.
 */
export const PartnerColors = {
  background: '#F8FAFC',
  cardSurface: '#FFFFFF',
  cardBorder: '#E2E8F0',
  rowDivider: '#F1F5F9',
  primary: '#0D7A53',
  onPrimary: '#FFFFFF',
  mintSurface: '#EBF5F0',
  mintBorder: '#D1FAE5',
  textPrimary: '#111827',
  textMuted: '#64748B',
  placeholder: '#94A3B8',
  pendingAlert: '#F59E0B',
  pendingAlertSurface: '#FFFBEB',
  pendingAlertBorder: '#FDE68A',
  danger: '#EF4444',
  dangerSurface: '#FFF5F5',
  dangerBorder: '#FEE2E2',
  shadow: '#0F172A',
} as const;

export function withAlpha(hexColor: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hexColor}${alphaHex}`;
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});



