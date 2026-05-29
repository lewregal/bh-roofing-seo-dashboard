import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B2545",
        surface: { DEFAULT: "#0f1626", card: "#151d30", border: "#243049" },
        good: "#22c55e",
        bad: "#ef4444",
        accent: "#3b82f6",
      },
    },
  },
  plugins: [],
};
export default config;
