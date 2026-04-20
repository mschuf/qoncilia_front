/** @type {import('tailwindcss').Config} */
import typographyPlugin from '@tailwindcss/typography';

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f9",
          100: "#d1edf0",
          200: "#a8dde3",
          300: "#73c6d0",
          400: "#42a8b8",
          500: "#2f8da0",
          600: "#286f81",
          700: "#245969",
          800: "#244a57",
          900: "#213f4a"
        }
      },
      boxShadow: {
        glow: "0 10px 30px rgba(27, 79, 114, 0.2)"
      }
    }
  },
  plugins: [typographyPlugin]
};
