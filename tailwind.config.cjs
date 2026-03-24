/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out',
        'pulse-soft': 'pulse-soft 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
