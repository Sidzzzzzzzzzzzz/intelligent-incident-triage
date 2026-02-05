/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", // future-proof if you add theme toggle
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },

      colors: {
        background: {
          DEFAULT: "#020617", // slate-950 refined
        },
        surface: {
          DEFAULT: "#0f172a", // slate-900
          elevated: "#111827",
        },
        border: {
          DEFAULT: "#1e293b", // slate-800
        },
        brand: {
          DEFAULT: "#3b82f6",
          light: "#60a5fa",
          dark: "#1d4ed8",
        },
        critical: "#ef4444",
        high: "#f97316",
        medium: "#eab308",
        low: "#22c55e",
      },

      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.25)",
        medium: "0 6px 20px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(59,130,246,0.2), 0 10px 40px rgba(59,130,246,0.15)",
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },

      animation: {
        fadeIn: "fadeIn 0.4s ease-out forwards",
        slideUp: "slideUp 0.4s ease-out forwards",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
