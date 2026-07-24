// Trak design tokens — extracted from Stitch tailwind.config
export const Colors = {
  // Backgrounds
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
  statusActive: '#72ff70',   // neon green
  statusBlocked: '#ffb4ab',  // error/red
  statusIdle: '#4b8eff',     // secondary-container blue
  statusWarning: '#ffd400',  // yellow
} as const;

export type ColorKey = keyof typeof Colors;
