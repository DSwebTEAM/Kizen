/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      colors: {
        surface: {
          0: '#0a0a0f',
          1: '#0f0f17',
          2: '#14141f',
          3: '#1a1a28',
          4: '#202033',
        },
        border: {
          subtle: '#ffffff0d',
          default: '#ffffff18',
          strong: '#ffffff30',
        },
        accent: {
          DEFAULT: '#7c6aff',
          dim: '#7c6aff20',
          hover: '#9585ff',
          glow: '#7c6aff40',
        },
        muted: '#6b7280',
        text: {
          primary: '#f0f0f8',
          secondary: '#a0a0b8',
          tertiary: '#6060808',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      }
    },
  },
  plugins: [],
}
