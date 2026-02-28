import type { Config } from 'tailwindcss'

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        surface: 'var(--color-surface)',
        'surface-light': 'var(--color-surface-light)',
        primary: '#6366f1',
        'primary-hover': '#818cf8',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        border: 'var(--color-border)',
        'glass-border': 'var(--color-glass-border)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
