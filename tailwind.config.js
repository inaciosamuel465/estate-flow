/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2b6cee",
        "background-light": "#f8fafc",
        "card-light": "#ffffff",
        "text-primary": "#0f172a",
        "text-secondary": "#64748b",
        "surface-light": "#ffffff",
        "border-light": "#e2e8f0",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      animation: {
        'tilt': 'tilt 10s infinite linear',
        'shimmer': 'shimmer 2s infinite linear',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        tilt: {
          '0%, 50%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(1deg)' },
          '75%': { transform: 'rotate(-1deg)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      },
      boxShadow: {
        'premium': '0 20px 50px rgba(0, 0, 0, 0.1)',
        'neon': '0 0 15px rgba(43, 108, 238, 0.5)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
