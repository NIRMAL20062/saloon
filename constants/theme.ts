/**
 * GLIDE Brand Design System (PUMA / NIKE / APPLE / COS Style).
 * Single Brand Accent: Electric Cobalt (#315CFF).
 * Surfaces: Pure White (#FFFFFF) & Pitch Black (#09090B).
 * Architecture: High-contrast typography, large photography, 1px subtle dividers,
 * zero cluttered UI chrome, and ultra-clean whitespace.
 */

import { Platform } from 'react-native';

const brandCobalt = '#315CFF';
const brandCobaltLight = '#254BD8';

export const Colors = {
  light: {
    text: '#09090B',
    textMuted: '#6B7280',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceBorder: '#E5E7EB',
    tint: brandCobaltLight,
    tintSurface: '#EFF3FF',
    accent: brandCobaltLight,
    accentSurface: '#EFF3FF',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: brandCobaltLight,
    inputBackground: '#F9FAFB',
    border: '#E5E7EB',
    placeholder: '#9CA3AF',
    success: '#10B981',
    successSurface: '#ECFDF5',
    danger: '#EF4444',
    dangerSurface: '#FEF2F2',
    warning: '#F59E0B',
    warningSurface: '#FFFBEB',
    onTint: '#FFFFFF',
  },
  dark: {
    text: '#FAFAFA',
    textMuted: '#8E95A5',
    background: '#09090B',
    surface: '#09090B',
    surfaceBorder: '#1E222D',
    tint: brandCobalt,
    tintSurface: '#161E38',
    accent: brandCobalt,
    accentSurface: '#161E38',
    icon: '#8E95A5',
    tabIconDefault: '#525866',
    tabIconSelected: brandCobalt,
    inputBackground: '#121318',
    border: '#1E222D',
    placeholder: '#525866',
    success: '#10B981',
    successSurface: '#064E3B',
    danger: '#F87171',
    dangerSurface: '#451A1A',
    warning: '#FBBF24',
    warningSurface: '#451A03',
    onTint: '#FFFFFF',
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
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const Shadow = {
  sm: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  card: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  glow: {
    elevation: 6,
    shadowColor: '#315CFF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  glowCyan: {
    elevation: 6,
    shadowColor: '#315CFF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
} as const;

export const Typography = {
  displayHero: { fontSize: 32, fontWeight: '900' as const, lineHeight: 38, letterSpacing: -0.8 },
  screenTitle: { fontSize: 26, fontWeight: '800' as const, lineHeight: 32, letterSpacing: -0.5 },
  sectionHeader: { fontSize: 16, fontWeight: '800' as const, lineHeight: 22, letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700' as const, lineHeight: 20, letterSpacing: -0.2 },
  bodyText: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' as const, lineHeight: 16, letterSpacing: 0.2 },
  microText: { fontSize: 11, fontWeight: '600' as const, lineHeight: 15, letterSpacing: 0.4 },
};

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

