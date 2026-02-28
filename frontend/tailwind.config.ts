import type { Config } from 'tailwindcss'

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        'surface-light': '#1e293b',
        primary: '#6366f1',
        'primary-hover': '#818cf8',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        border: '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
