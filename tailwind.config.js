/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1e252b',
        card: '#2c3e50',
        accent: '#ffcc00',
        blue: '#3b82f6',
      }
    },
  },
  plugins: [],
}