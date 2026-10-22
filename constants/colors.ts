import { Platform } from 'react-native';

// Hacker/Terminal Theme - Matrix inspired
export const COLORS = {
  primary: '#00FF41',
  background: '#0D1117',
  card: '#161B22',
  textPrimary: '#00FF41',
  textSecondary: '#39FF14',
  textOnPrimary: '#000000',
  surface: '#0D1117',
  border: '#30363D',
  shadow: '#00FF41',
  warning: '#FFD700',
  success: '#00FF41',
  danger: '#FF0040',
} as const;

export const CAMPUS = {
  // Backgrounds
  bg: '#000000',
  bgDeep: '#010101',

  // Surfaces and cards
  surface: '#0D0D0D',
  surfaceStrong: '#111111',
  inputBg: '#0A0A0A',
  border: '#00FF41',

  // Primary actions
  primary: '#00FF41',
  primaryDeep: '#00CC33',
  accent: '#00FFFF',
  mint: '#00FF88',

  // Readable text
  text: '#00FF41',
  textMuted: '#00CC33',
  textFaint: '#008F11',

  // Status colors
  danger: '#FF0040',
  dangerBg: '#1A0000',
  dangerBorder: '#FF0040',

  warning: '#FFD700',
  warningBg: '#1A1500',
  warningBorder: '#FFD700',

  success: '#00FF41',
  successBg: '#001A00',
  successBorder: '#00FF41',

  // Additional UI colors
  info: '#00FFFF',
  infoBg: '#001A1A',
  infoBorder: '#00FFFF',

  // Text and icon emphasis
  textOnPrimary: '#000000',
  iconMuted: '#00CC33',
  divider: '#00FF41',
  overlay: 'rgba(0, 255, 65, 0.1)',

  // Typography
  mono: Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'Courier New, monospace',
  }) as string,
} as const;

export type CampusTheme = typeof CAMPUS;
