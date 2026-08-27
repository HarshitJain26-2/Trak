import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface ColorTheme {
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerLowest: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceVariant: string;
  surfaceBright: string;
  background: string;

  // Primary
  primaryFixed: string;
  primaryFixedDim: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryFixed: string;
  onPrimaryContainer: string;

  // Secondary
  secondary: string;
  secondaryFixed: string;
  secondaryFixedDim: string;
  secondaryContainer: string;
  onSecondary: string;

  // Surface text
  onSurface: string;
  onSurfaceVariant: string;
  onBackground: string;

  // Tertiary
  tertiary: string;
  tertiaryContainer: string;

  // Error
  error: string;
  errorContainer: string;
  onError: string;

  // Outline
  outline: string;
  outlineVariant: string;

  // Inverse
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Status colors
  statusActive: string;
  statusBlocked: string;
  statusIdle: string;
  statusWarning: string;
  cardBg: string;
  glassBg: string;
  glassBorder: string;
  isDark: boolean;
}

export const DarkColors: ColorTheme = {
  surface: '#10131a',
  surfaceContainer: '#1d2026',
  surfaceContainerLow: '#191c22',
  surfaceContainerLowest: '#0b0e14',
  surfaceContainerHigh: '#272a31',
  surfaceContainerHighest: '#32353c',
  surfaceVariant: '#32353c',
  surfaceBright: '#363940',
  background: '#10131a',

  // Primary (neon green)
  primaryFixed: '#72ff70',
  primaryFixedDim: '#00e639',
  primaryContainer: '#00ff41',
  onPrimary: '#003907',
  onPrimaryFixed: '#002203',
  onPrimaryContainer: '#007117',

  // Secondary (blue)
  secondary: '#adc6ff',
  secondaryFixed: '#d8e2ff',
  secondaryFixedDim: '#adc6ff',
  secondaryContainer: '#4b8eff',
  onSecondary: '#002e69',

  // Surface text
  onSurface: '#e1e2eb',
  onSurfaceVariant: '#b9ccb2',
  onBackground: '#e1e2eb',

  // Tertiary
  tertiary: '#fbf7ff',
  tertiaryContainer: '#dad9ff',

  // Error
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',

  // Outline
  outline: '#84967e',
  outlineVariant: '#3b4b37',

  // Inverse
  inverseSurface: '#e1e2eb',
  inverseOnSurface: '#2e3037',
  inversePrimary: '#006e16',

  // Status colors
  statusActive: '#72ff70',
  statusBlocked: '#ffb4ab',
  statusIdle: '#4b8eff',
  statusWarning: '#ffd400',
  cardBg: '#161B22',
  glassBg: 'rgba(17,20,27,0.8)',
  glassBorder: 'rgba(255,255,255,0.05)',
  isDark: true,
};

export const LightColors: ColorTheme = {
  surface: '#f6f8fa',
  surfaceContainer: '#ffffff',
  surfaceContainerLow: '#f0f3f6',
  surfaceContainerLowest: '#e6ebf1',
  surfaceContainerHigh: '#eaeef2',
  surfaceContainerHighest: '#d8dee4',
  surfaceVariant: '#d8dee4',
  surfaceBright: '#ffffff',
  background: '#f6f8fa',

  // Primary (emerald green)
  primaryFixed: '#00872e',
  primaryFixedDim: '#006e23',
  primaryContainer: '#1a7f37',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#ffffff',
  onPrimaryContainer: '#ffffff',

  // Secondary (ocean blue)
  secondary: '#0969da',
  secondaryFixed: '#0969da',
  secondaryFixedDim: '#0550ae',
  secondaryContainer: '#ddf4ff',
  onSecondary: '#ffffff',

  // Surface text
  onSurface: '#1f2328',
  onSurfaceVariant: '#57606a',
  onBackground: '#1f2328',

  // Tertiary
  tertiary: '#8250df',
  tertiaryContainer: '#f1e05a',

  // Error
  error: '#cf222e',
  errorContainer: '#ffebe9',
  onError: '#ffffff',

  // Outline
  outline: '#d0d7de',
  outlineVariant: '#d8dee4',

  // Inverse
  inverseSurface: '#1f2328',
  inverseOnSurface: '#ffffff',
  inversePrimary: '#1a7f37',

  // Status colors
  statusActive: '#00872e',
  statusBlocked: '#cf222e',
  statusIdle: '#0969da',
  statusWarning: '#9a6700',
  cardBg: '#ffffff',
  glassBg: 'rgba(255,255,255,0.92)',
  glassBorder: 'rgba(0,0,0,0.08)',
  isDark: false,
};

export const Colors = LightColors;
export type ColorKey = keyof ColorTheme;

export function getThemeColors(mode: 'light' | 'dark' | 'system', systemScheme?: 'light' | 'dark' | null): ColorTheme {
  if (mode === 'dark') return DarkColors;
  if (mode === 'light') return LightColors;
  return systemScheme === 'dark' ? DarkColors : LightColors;
}

export function useThemeColors(): ColorTheme {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  return getThemeColors(themeMode, systemScheme);
}
