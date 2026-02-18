import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f4f1ea',
        ink: '#1f2a2f',
        accent: '#c65d3a',
        accentSoft: '#ffe0d2',
        slateSoft: '#e8ecef'
      },
      boxShadow: {
        card: '0 8px 30px rgba(20, 37, 46, 0.1)'
      }
    }
  },
  plugins: []
} satisfies Config;
