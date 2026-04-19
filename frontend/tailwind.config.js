/** @type {import('tailwindcss').Config} */
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: rgb('primary'),
        "primary-container": rgb('primary-container'),
        "on-primary": rgb('on-primary'),
        secondary: rgb('secondary'),
        "secondary-container": rgb('secondary-container'),
        "on-secondary-container": rgb('on-secondary-container'),
        tertiary: rgb('tertiary'),
        "tertiary-container": rgb('tertiary-container'),
        error: rgb('error'),
        "error-container": rgb('error-container'),
        "on-error-container": rgb('on-error-container'),
        background: rgb('background'),
        "on-background": rgb('on-background'),
        surface: rgb('surface'),
        "on-surface": rgb('on-surface'),
        "on-surface-variant": rgb('on-surface-variant'),
        "surface-container": rgb('surface-container'),
        "surface-container-low": rgb('surface-container-low'),
        "surface-container-lowest": rgb('surface-container-lowest'),
        "surface-container-high": rgb('surface-container-high'),
        "surface-container-highest": rgb('surface-container-highest'),
        outline: rgb('outline'),
        "outline-variant": rgb('outline-variant'),
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        display: ["'Space Grotesk'", "Manrope", "sans-serif"],
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-30px) translateX(20px)' },
        },
        'float-slower': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) scale(1)' },
          '50%': { transform: 'translateY(40px) translateX(-20px) scale(1.1)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'float-slow': 'float-slow 12s ease-in-out infinite',
        'float-slower': 'float-slower 18s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
        'marquee': 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
}
