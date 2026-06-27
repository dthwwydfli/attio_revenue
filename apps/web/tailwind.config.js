/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        foreground: "#f4f4f5",
        muted: "#71717a",
        border: "#27272a",
        card: "#18181b",
        accent: "#22c55e",
      },
    },
  },
  plugins: [],
};
