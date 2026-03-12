/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0faf2',
          100: '#d8f3dc',
          200: '#b0e8bb',
          300: '#7dd494',
          400: '#4aba6a',
          500: '#2d9e4e',
          600: '#1f7d3c',
          700: '#1a5c38',  // main dark green
          800: '#164d30',
          900: '#103d26',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: [
          'Segoe UI', 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Telugu',
          'Noto Sans Tamil', 'Noto Sans Kannada', 'Noto Sans Gujarati',
          'Noto Sans Malayalam', 'Noto Sans Gurmukhi', 'Noto Sans Bengali',
          'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
