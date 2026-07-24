/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 content
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Trak design tokens
        surface: '#10131a',
        'surface-container': '#1d2026',
        'surface-container-low': '#191c22',
        'surface-container-lowest': '#0b0e14',
        'surface-container-high': '#272a31',
        'surface-container-highest': '#32353c',
        'surface-variant': '#32353c',
        'surface-bright': '#363940',
        background: '#10131a',

        // Primary
        'primary-fixed': '#72ff70',
        'primary-fixed-dim': '#00e639',
        'primary-container': '#00ff41',
        'on-primary': '#003907',
        'on-primary-fixed': '#002203',

        // Secondary
        secondary: '#adc6ff',
        'secondary-fixed': '#d8e2ff',
        'secondary-container': '#4b8eff',
        'on-secondary': '#002e69',

        // Surface text
        'on-surface': '#e1e2eb',
        'on-surface-variant': '#b9ccb2',

        // Error
        error: '#ffb4ab',
        'error-container': '#93000a',

        // Outline
        outline: '#84967e',
        'outline-variant': '#3b4b37',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        margin: '20px',
        gutter: '16px',
        'touch-target': '44px',
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
