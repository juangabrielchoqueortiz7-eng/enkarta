import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enkarta brand
        enkarta: {
          cream: '#FAF7F2',
          gold: '#B8975A',
          dark: '#2C2519',
          sage: '#5a6e5a',
          beige: '#D4C5B9',
        },
        // Template-specific
        perla: {
          bg: '#FAF7F2',
          sage: '#5a6e5a',
          gold: '#b8975a',
          text: '#3d3d3d',
        },
        marmol: {
          bg: '#f5f2ef',
          gray: '#6b6b6b',
          gold: '#c9a96e',
          dark: '#2d2d2d',
        },
        terra: {
          bg: '#faf5f0',
          earth: '#8B6F47',
          sage: '#7a8b6f',
          warm: '#c4956a',
        },
        sobre: {
          bg: '#f8f4ef',
          navy: '#1a2332',
          cream: '#f0e6d3',
          gold: '#c9a96e',
        },
        carmesi: {
          bg: '#1a0a0a',
          red: '#8B0000',
          gold: '#c9a96e',
          cream: '#f5e6d3',
        },
        gerbera: {
          bg: '#fff8f0',
          pink: '#d4758c',
          sunset: '#e8a87c',
          warm: '#d16b5a',
        },
      },
      fontFamily: {
        // Las invitaciones leen variables CSS (definidas por FontScope cuando el
        // cliente personaliza la tipografía) con fallback a la fuente original.
        playfair: ['var(--ek-font-heading, "Playfair Display")', 'serif'],
        cormorant: ['var(--ek-font-body, "Cormorant Garamond")', 'serif'],
        cinzel: ['var(--ek-font-heading, Cinzel)', 'serif'],
        great: ['var(--ek-font-script, "Great Vibes")', 'cursive'],
        lora: ['var(--ek-font-body, Lora)', 'serif'],
        dmserif: ['DM Serif Display', 'serif'],
        nunito: ['var(--ek-font-body, Nunito)', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
