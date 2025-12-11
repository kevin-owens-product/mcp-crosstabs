/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gwi-blue': '#0066CC',
        'gwi-dark': '#1a1a2e',
        'gwi-gray': '#f5f5f5',
      },
    },
  },
  plugins: [],
}
