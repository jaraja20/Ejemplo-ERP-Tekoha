/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe6ff', 200: '#bdd0ff', 300: '#93b0ff', 400: '#6486fb',
          500: '#3f5ff5', 600: '#2a41e8', 700: '#2232d1', 800: '#212ba8', 900: '#212a84', 950: '#161a4f',
        },
      },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)' },
    },
  },
  plugins: [],
}
