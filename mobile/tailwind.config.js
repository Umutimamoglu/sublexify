/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand renkleri
        brand: {
          50:  '#EFF8FF',
          100: '#DBEFFE',
          200: '#B9DFFE',
          300: '#7CC8FD',
          400: '#38AAFA',
          500: '#0E8CE8',
          600: '#026BB5',
          700: '#0256A0',
        },
        // CEFR zorluk seviyeleri (tokens.ts'den)
        diff: {
          A1: '#22C55E',
          A2: '#84CC16',
          B1: '#F59E0B',
          B2: '#F97316',
          C1: '#EF4444',
          C2: '#9333EA',
        },
      },
    },
  },
  plugins: [],
};
