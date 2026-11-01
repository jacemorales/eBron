/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cu: {
          blue: '#0B2545',
          dark: '#13315C',
          light: '#EEF4F8',
          gold: '#C59B27',
          goldHover: '#B0881E',
          accent: '#134074'
        }
      }
    },
  },
  plugins: [],
}
