import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      fontFamily: {
        sans: ['Archivo', 'Outfit', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['"Young Serif"', 'Italiana', 'serif'],
        accent: ['"Instrument Serif"', '"Cormorant Garamond"', 'serif'],
        body: ['Archivo', 'Outfit', 'sans-serif'],
      },
      letterSpacing: {
        display: '0.02em',
        label: '0.28em',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
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
        artist: {
          DEFAULT: "hsl(var(--artist))",
          foreground: "hsl(var(--artist-foreground))",
        },
        venue: {
          DEFAULT: "hsl(var(--venue))",
          foreground: "hsl(var(--venue-foreground))",
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
        noir: {
          DEFAULT: "hsl(var(--noir))",
          lift: "hsl(var(--noir-lift))",
        },
        ivory: "hsl(var(--ivory))",
        champagne: {
          light: "hsl(var(--champagne-light))",
          DEFAULT: "hsl(var(--champagne))",
          deep: "hsl(var(--champagne-deep))",
        },
        velvet: "hsl(var(--velvet))",
        smoke: "hsl(var(--smoke))",
        bone: {
          DEFAULT: "hsl(var(--bone))",
          lift: "hsl(var(--bone-lift))",
        },
        pine: {
          DEFAULT: "hsl(var(--pine))",
          deep: "hsl(var(--pine-deep))",
        },
        ink: "hsl(var(--ink))",
        ox: "hsl(var(--ox))",
        sand: "hsl(var(--sand))",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "2xl": "1.25rem",
        xl: "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        'ios': '0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 10px 20px -2px rgba(0, 0, 0, 0.2)',
        'ios-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.4), 0 20px 50px -10px rgba(0, 0, 0, 0.3)',
        'ios-glow': '0 0 30px -5px hsl(var(--primary) / 0.3)',
      },
      backdropBlur: {
        'ios': '20px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "ios-bounce": {
          "0%": { transform: "scale(0.95)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "accordion-up": "accordion-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "scale-in": "scale-in 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-up": "slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        "ios-bounce": "ios-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'ios-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
