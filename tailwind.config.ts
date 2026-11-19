import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0a0714", surface: "#130d24", card: "#1a1130", border: "#2a1f45",
          purple: "#a855f7", "purple-dark": "#7c3aed", blue: "#38bdf8", "blue-dark": "#0ea5e9",
          gold: "#fbbf24", "gold-dark": "#f59e0b",
        },
      },
      fontFamily: { sans: ["Inter", "system-ui", "-apple-system", "sans-serif"] },
      boxShadow: { glow: "0 0 24px rgba(168,85,247,0.35)", "glow-gold": "0 0 24px rgba(251,191,36,0.35)" },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-500px 0" }, "100%": { backgroundPosition: "500px 0" } },
      },
      animation: { "fade-in": "fade-in 0.4s ease-out both", shimmer: "shimmer 1.4s linear infinite" },
    },
  },
  plugins: [],
};
export default config;