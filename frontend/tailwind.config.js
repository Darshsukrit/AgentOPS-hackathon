/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Core backgrounds */
        bg: {
          base: '#0A0A0A',
          elevated: '#111111',
          surface: '#181818',
          overlay: '#1F1F1F',
        },
        /* Text */
        text: {
          primary: '#F5F5F5',
          secondary: '#A1A1A1',
          muted: '#6B6B6B',
          inverse: '#0A0A0A',
        },
        /* Borders */
        border: {
          DEFAULT: '#2A2A2A',
          subtle: '#1F1F1F',
          strong: '#3A3A3A',
        },
        /* Accents - grayscale only */
        accent: {
          DEFAULT: '#D1D1D1',
          muted: '#888888',
          strong: '#F5F5F5',
        },
        /* Status */
        status: {
          active: '#4ADE80',
          idle: '#A1A1A1',
          warning: '#FACC15',
          error: '#F87171',
          info: '#60A5FA',
        },
        /* Risk */
        risk: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#FACC15',
          low: '#4ADE80',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.5)',
        'glass': '0 8px 32px 0 rgba(0,0,0,0.36)',
        'modal': '0 25px 50px -12px rgba(0,0,0,0.6)',
        'sidebar': '1px 0 0 0 #2A2A2A',
        'inner-top': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        DEFAULT: '12px',
        md: '16px',
        lg: '24px',
        xl: '40px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
