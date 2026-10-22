import { Platform } from 'react-native';

// === Design Token System ===
// All tokens reference CAMPUS colors for consistent theming

// Radius scale (px)
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
  card: 22,
} as const;

// Shadow scale (px and opacity)
export const shadow = {
  none: { opacity: 0, offset: { width: 0, height: 0 }, radius: 0 } as const,
  xs: { opacity: 0.15, offset: { width: 0, height: 2 }, radius: 4 } as const,
  sm: { opacity: 0.2, offset: { width: 0, height: 4 }, radius: 8 } as const,
  md: { opacity: 0.25, offset: { width: 0, height: 6 }, radius: 12 } as const,
  lg: { opacity: 0.35, offset: { width: 0, height: 10 }, radius: 20 } as const,
  xl: { opacity: 0.45, offset: { width: 0, height: 16 }, radius: 32 } as const,
  card: { opacity: 0.35, offset: { width: 0, height: 8 }, radius: 24 } as const,
} as const;

// Border width scale (px)
export const borderWidth = {
  none: 0,
  thin: 1,
  normal: 1.5,
  thick: 2,
  card: 1,
} as const;

// Opacity scale
export const opacity = {
  disabled: 0.4,
  overlay: 0.5,
  surface: 0.8,
  glass: 0.6,
} as const;

// Z-index scale
export const zIndex = {
  base: 0,
  overlay: 10,
  modal: 100,
  toast: 200,
} as const;

// === Typography Tokens ===
// All font sizes relative to base 16px; line-heights and weights for each scale

export type FontWeight = 'thin' | 'extralight' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';

export const typography = {
  // Font family
  fontFamily: {
    // System sans-serif (iOS/Safe area compatible)
    system: '-apple-system, system-ui, sans-serif',
    // System monospace
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    }) as string,
    // Campus tech monospace for labels, code, accents
    techMono: 'SF Mono, Menlo, Monaco, "Courier New", monospace',
  } as const,

  // Type scale: [size, lineHeight, weight]
  // Base: 16px = 1rem
  display1: [36, 44, '800'] as const,    // Large headings
  display2: [30, 36, '800'] as const,    // Section headers
  headline: [24, 32, '700'] as const,    // Page titles
  title: [22, 28, '700'] as const,       // Card titles
  subtitle: [18, 24, '500'] as const,    // Subtitles
  body: [16, 24, '400'] as const,        // Body text
  caption: [14, 20, '400'] as const,     // Captions
  overline: [12, 16, '600'] as const,    // Overlines/labels
  button: [17, 22, '600'] as const,      // Button text
  small: [13, 18, '500'] as const,       // Small text

  // Derived sizes (computed from scale)
  get size() {
    return this.body[0];
  },
} as const;

// === Spacing Scale ===
// All spacings in pixels, based on 8px increment scale
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// === Component-specific token mappings ===
// Maps component props to token values for consistent theming

export const componentTokens = {
  // Button padding
  buttonPadding: { vertical: 14, horizontal: 20 } as const,

  // Input padding
  inputPadding: { horizontal: 14, vertical: 14 } as const,

  // Card
  cardPadding: 18 as const,

  // Form labels
  labelFontSize: 11 as const,
  labelLineHeight: 16 as const,

  // Status badge
  badgePadding: { horizontal: 8, vertical: 4 } as const,

  // Empty state
  emptyGap: 24 as const,

  // Tab bar
  tabBarHeight: 60 as const,

  // Avatar
  avatarSize: 64 as const,
  avatarBorderRadius: 32 as const,
} as const;