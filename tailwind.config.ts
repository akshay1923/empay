import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        serif: ["var(--font-serif)"],
      },
      colors: {
        // Map the design tokens through to Tailwind so utilities
        // like `bg-bg`, `text-fg`, `border-border` work alongside the
        // raw CSS variables in globals.css.
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-hover": "var(--bg-hover)",
        "bg-active": "var(--bg-active)",
        "bg-tinted-red": "var(--bg-tinted-red)",
        "bg-tinted-yellow": "var(--bg-tinted-yellow)",

        fg: "var(--fg)",
        "fg-display": "var(--fg-display)",
        "fg-strong": "var(--fg-strong)",
        "fg-muted": "var(--fg-muted)",
        "fg-faint": "var(--fg-faint)",
        "fg-onaccent": "var(--fg-onaccent)",

        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "border-hairline": "var(--border-hairline)",

        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-press": "var(--accent-press)",
        "accent-soft": "var(--accent-soft)",
        "accent-text": "var(--accent-text)",

        secondary: "var(--secondary)",
        "secondary-hover": "var(--secondary-hover)",
        "secondary-soft": "var(--secondary-soft)",

        neutral: "var(--neutral)",
        blue: "var(--blue)",
        "blue-deep": "var(--blue-deep)",

        // Notion semantic tints (used inside callouts/blocks)
        "n-gray": "var(--color-gray)",
        "n-brown": "var(--color-brown)",
        "n-orange": "var(--color-orange)",
        "n-yellow": "var(--color-yellow)",
        "n-green": "var(--color-green)",
        "n-blue": "var(--color-blue)",
        "n-purple": "var(--color-purple)",
        "n-pink": "var(--color-pink)",
        "n-red": "var(--color-red)",
      },
      borderRadius: {
        "1": "var(--radius-1)",
        "2": "var(--radius-2)",
        "3": "var(--radius-3)",
        "4": "var(--radius-4)",
        "5": "var(--radius-5)",
      },
      boxShadow: {
        "1": "var(--shadow-1)",
        "2": "var(--shadow-2)",
        "3": "var(--shadow-3)",
        focus: "var(--shadow-focus)",
        popover: "var(--shadow-popover)",
      },
      spacing: {
        "spc-1": "var(--space-1)",
        "spc-2": "var(--space-2)",
        "spc-3": "var(--space-3)",
        "spc-4": "var(--space-4)",
        "spc-5": "var(--space-5)",
        "spc-6": "var(--space-6)",
        "spc-7": "var(--space-7)",
        "spc-8": "var(--space-8)",
        "spc-9": "var(--space-9)",
        "spc-10": "var(--space-10)",
        "spc-11": "var(--space-11)",
        "spc-12": "var(--space-12)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "slide-up 150ms cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
