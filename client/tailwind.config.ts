import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        leaf: { 50: '#f1f8f2', 100: '#eaf7ec', 200: '#d3ead7', 500: '#43a55a', 600: '#2e8b45', 700: '#176b35', 900: '#124d2a' },
        primary: '#2e8b45', forest: '#176b35', mist: '#eaf7ec', background: '#f8faf8',
        ink: '#1e2a22', muted: '#647269', cream: '#f8faf8', citrus: '#e6f1bb',
      },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] },
      boxShadow: { card: '0 8px 28px rgba(23, 61, 35, .07)', raised: '0 18px 50px rgba(23, 61, 35, .12)' },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
} satisfies Config
