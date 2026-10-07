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
        bob: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "piece-drop": {
          "0%": { transform: "scale(1.35) translateY(-6px)", opacity: "0" },
          "70%": { transform: "scale(0.96) translateY(0)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        flicker: {
          "0%,100%": { transform: "scale(1, 1) skewX(0deg)", opacity: "1" },
          "25%": { transform: "scale(0.96, 1.06) skewX(2deg)", opacity: "0.92" },
          "50%": { transform: "scale(1.03, 0.95) skewX(-2deg)", opacity: "1" },
          "75%": { transform: "scale(0.98, 1.04) skewX(1deg)", opacity: "0.95" },
        },
        firelight: {
          "0%,100%": { opacity: "0.85", transform: "translate(-50%, -50%) scale(1)" },
          "50%": { opacity: "1", transform: "translate(-50%, -50%) scale(1.05)" },
        },
        "card-flip": {
          "0%": { transform: "perspective(400px) rotateY(90deg)", opacity: "0" },
          "100%": { transform: "perspective(400px) rotateY(0deg)", opacity: "1" },
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
        bob: "bob 3s ease-in-out infinite",
        "card-flip": "card-flip 0.5s ease-out both",
        flicker: "flicker 1.2s ease-in-out infinite",
        "piece-drop": "piece-drop 0.35s ease-out both",
        firelight: "firelight 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
