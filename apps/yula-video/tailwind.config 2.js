/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yula: {
          bg: '#050505',
          surface: '#0a0a0a',
          border: 'rgba(255, 255, 255, 0.1)',
          amber: '#F59E0B',
          'amber-glow': '#FF8800',
          purple: '#7C3AED',
          'purple-deep': '#5B21B6',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'absorb': 'absorb 1s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 158, 11, 0.6)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'absorb': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(0.8)', opacity: '0.5' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
