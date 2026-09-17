/**
 * Design tokens for Kindred.
 *
 * The visual personality is calm, premium, private, and intentional. We avoid
 * casino / dating-marketplace aesthetics (no Tinder red/pink, no loud gradients).
 * All colour, spacing, radius, and type decisions live here so screens never
 * hard-code raw values.
 */

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  positive: string;
  positiveSoft: string;
  caution: string;
  cautionSoft: string;
  destructive: string;
  destructiveSoft: string;
  border: string;
  borderStrong: string;
  overlay: string;
  skeleton: string;
}

const light: ThemeColors = {
  background: '#F7F5F1',
  surface: '#FFFFFF',
  surfaceElevated: '#FBFAF7',
  textPrimary: '#20201D',
  textSecondary: '#6E6A62',
  textTertiary: '#9A958B',
  textInverse: '#F7F5F1',
  accent: '#4F6F5E',
  accentSoft: '#E7EEE9',
  onAccent: '#FBFAF7',
  positive: '#3F7D5B',
  positiveSoft: '#E4EFE8',
  caution: '#9C7A34',
  cautionSoft: '#F2EAD8',
  destructive: '#9E4B3B',
  destructiveSoft: '#F1E1DC',
  border: '#E6E2DA',
  borderStrong: '#D6D1C7',
  overlay: 'rgba(20,19,17,0.45)',
  skeleton: '#ECE8E1',
};

const dark: ThemeColors = {
  background: '#121210',
  surface: '#1A1917',
  surfaceElevated: '#232220',
  textPrimary: '#F1EFE9',
  textSecondary: '#A8A399',
  textTertiary: '#78736A',
  textInverse: '#1A1917',
  accent: '#8FB39E',
  accentSoft: '#26302B',
  onAccent: '#12211A',
  positive: '#79B092',
  positiveSoft: '#1E2C24',
  caution: '#C6A365',
  cautionSoft: '#2E2819',
  destructive: '#C97D6C',
  destructiveSoft: '#2E211D',
  border: '#2C2A26',
  borderStrong: '#3A3833',
  overlay: 'rgba(0,0,0,0.55)',
  skeleton: '#26251F',
};

export const palette: Record<ColorScheme, ThemeColors> = { light, dark };

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
}

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  subheading: { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  callout: { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  footnote: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
} satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typography;

/** Standard hit target minimum for accessibility (44pt per WCAG/Apple HIG). */
export const minTouchTarget = 44;

export const durations = {
  fast: 150,
  base: 220,
  slow: 360,
} as const;
