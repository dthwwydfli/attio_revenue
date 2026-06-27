/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        foreground: "#f4f4f5",
        muted: "#a0a0a0",
        border: "#27272a",
        card: "#18181b",
        surface: "#0a1a1a",
        "surface-elevated": "#1a2a2a",
        accent: "#22c55e",
        "accent-pink": "#ff4d8b",
        "accent-teal": "#1a3a3a",
        "accent-lavender": "#b8a4ed",
        "accent-peach": "#ffb084",
        "accent-ochre": "#e8b94a",
        "accent-mint": "#a4d4c5",
      },
      fontFamily: {
        display: ["var(--font-syne)", "Inter", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        clay: "24px",
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "flow-pulse": "flow-pulse 2s ease-in-out infinite",
        "beam-dash": "beam-dash 1.4s linear infinite",
        "flow-sweep": "flow-sweep 3.5s linear infinite",
        marquee: "marquee 30s linear infinite",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "flow-pulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
        "beam-dash": {
          to: { strokeDashoffset: "-24" },
        },
        "flow-sweep": {
          "0%": { left: "-12%" },
          "100%": { left: "112%" },
        },
      },
    },
  },
  plugins: [],
};
