/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'grass-pattern': 'repeating-linear-gradient(0deg, #2e7d32, #2e7d32 40px, #276b2a 40px, #276b2a 80px)',
        'net-pattern': 'linear-gradient(to right, rgba(255,255,255,0.7) 2px, transparent 2px), linear-gradient(to bottom, rgba(255,255,255,0.7) 2px, transparent 2px)',
      }
    },
  },
  plugins: [],
}