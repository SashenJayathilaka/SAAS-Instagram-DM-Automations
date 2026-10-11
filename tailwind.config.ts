import plugin from "tailwindcss/plugin";
import type { Config } from "tailwindcss";
import { motionDuration } from "./lib/motion";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        "in-active": "#545454",
        connector: "#F0F1F6",
        "keyword-yellow": "#E1CE26",
        "keyword-purple": "#7C21D6",
        "keyword-red": "#EB441F",
        "keyword-green": "#2FE699",
        "light-blue": "#3352CC",
        "background-90": "#1D1D1D",
        "background-80": "#252525",
        "text-secondary": "#9B9CA0",
        elevated: "hsl(var(--surface-elevated))",
        "border-subtle": "hsl(var(--border-subtle))",
        "secondary-text": "hsl(var(--text-secondary))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
          subtle: "hsl(var(--primary-subtle))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "rf-bg":      "#0B1020",
        "rf-surface": "#0F172A",
        "rf-surface2":"#111827",
        "rf-border":  "#26324A",
        "rf-blue":    "#60A5FA",
        "rf-purple":  "rgb(var(--brand-purple) / <alpha-value>)",
        "rf-pink":    "hsl(var(--brand-pink))",
        "rf-orange":  "#F58529",
        "rf-magenta": "rgb(var(--brand-magenta) / <alpha-value>)",
        "rf-violet":  "#8134AF",
        "rf-indigo":  "#515BD4",
        "rf-green":   "#10B981",
        "rf-amber":   "#F59E0B",
        "rf-text":    "#F9FAFB",
        "rf-muted":   "#9CA3AF",
        "rf-subtle":  "#374151",
      },
      transitionDuration: Object.fromEntries(Object.entries(motionDuration).map(([key, value]) => [key, `${value * 1000}ms`])),
      transitionTimingFunction: { "ui-out": "cubic-bezier(0.22, 1, 0.36, 1)", "ui-state": "cubic-bezier(0.4, 0, 0.2, 1)" },
      backgroundImage: {
        "ap3k-gradient":
          "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 46%, #EC4899 74%, #FF6B35 100%)",
        "ap3k-gradient-soft":
          "linear-gradient(135deg, rgba(109,40,217,0.18), rgba(139,92,246,0.16), rgba(255,107,53,0.18))",
        "ap3k-radial":
          "radial-gradient(circle at 20% 0%, rgba(245,133,41,0.14), transparent 32%), radial-gradient(circle at 80% 12%, rgba(221,42,123,0.16), transparent 34%), radial-gradient(circle at 50% 55%, rgba(81,91,212,0.12), transparent 42%)",
      },
      boxShadow: {
        "surface": "var(--shadow-surface)",
        "overlay": "var(--shadow-overlay)",
        "ap3k-card": "var(--shadow-surface)",
        "ap3k-glow": "0 4px 14px rgba(109, 40, 217, 0.14)",
        "ap3k-blue": "0 18px 48px rgba(96, 165, 250, 0.22)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "gradient-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-pan": "gradient-pan 9s ease infinite",
        "float-slow": "float-slow 7s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), plugin(({ addVariant }) => {
    // Explicit light overrides leave existing dark surfaces and states intact.
    addVariant("light", "html:not(.dark) &");
  })],
} satisfies Config;

export default config;
