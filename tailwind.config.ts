import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#07050d",
          900: "#0d0912",
          800: "#15101f",
          700: "#1f1830",
          600: "#2b2140",
        },
        crimson: {
          500: "#dc2645",
          600: "#b81d38",
          700: "#8f1529",
        },
        moon: {
          200: "#e7e2f7",
          300: "#c9c0e8",
          400: "#a99fce",
        },
        wolf: {
          purple: "#6d28d9",
        },
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Inter", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "day-sweep": {
          "0%": { backgroundColor: "#07050d" },
          "100%": { backgroundColor: "#241a33" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(220,38,69,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(220,38,69,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-in-out",
        "day-sweep": "day-sweep 1.2s ease-in-out",
        "pulse-glow": "pulse-glow 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
