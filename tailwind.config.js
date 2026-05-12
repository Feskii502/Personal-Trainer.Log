/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--c-bg-base)',
          surface: 'var(--c-bg-surface)',
          elevated: 'var(--c-bg-elevated)',
        },
        border: {
          DEFAULT: 'var(--c-border)',
        },
        brand: {
          lime: '#D4FF3A',
          red: '#FF4D3A',
        },
        phase: {
          endurance: '#3ADBC7',
          hypertrophy: '#4A7DFF',
          strength: '#E94FA1',
          power: '#FF8A3A',
        },
        txt: {
          primary: 'var(--c-txt-primary)',
          secondary: 'var(--c-txt-secondary)',
          muted: 'var(--c-txt-muted)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Archivo"', 'system-ui', 'sans-serif'],
        body: ['Inter', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontVariantNumeric: {
        'tabular-nums': 'tabular-nums',
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
        pill: '22px',
      },
      keyframes: {
        pulseLime: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 255, 58, 0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 255, 58, 0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-lime': 'pulseLime 1.8s ease-out infinite',
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 180ms ease-out',
      },
    },
  },
  plugins: [],
};
