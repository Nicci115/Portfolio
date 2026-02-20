import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#09090b', // Zinc 950
        surface: '#18181b',    // Zinc 900
        border: '#27272a',     // Zinc 800
        accent: {
          DEFAULT: '#3B82F6', // The One True Accent
          hover: '#2563EB',
          glow: '#3B82F6',
        },
        muted: '#a1a1aa',     // Zinc 400
      },
      fontFamily: {
        sans: ['Geist Sans', ...defaultTheme.fontFamily.sans],
        mono: ['Geist Mono', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
} satisfies Config;
