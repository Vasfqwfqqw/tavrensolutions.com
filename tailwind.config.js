/** @type {import('tailwindcss').Config} */
export default {
  // Scan the editable source AND the JS that injects product-card markup at runtime.
  content: ['./src/**/*.{html,md}', './js/**/*.js', './build/**/*.mjs'],
  // Classes added dynamically by products.js / buy-button.js are listed here so the
  // purge step never strips them (they don't appear literally in scanned files).
  safelist: [
    'opacity-50',
    'opacity-100',
    'pointer-events-none',
    'cursor-not-allowed',
    'hidden',
    'is-enabled',
    'is-error',
    'is-success',
  ],
  theme: {
    extend: {
      colors: {
        // Locked Tavren brand palette — source of truth: tavren-brand skill.
        navy: {
          DEFAULT: '#0F3D73', // Primary — Sapphire navy (also body text)
          600: '#185FA5', // subheading tint
          700: '#123E70',
          900: '#0B2C54', // deep shade for gradients
        },
        azure: {
          // Brand accent is #2F80ED. For small text, links and solid CTA fills on
          // light backgrounds that hue fails WCAG AA (≈3.86:1 on white). We use a
          // marginally darker shade as the functional default (passes AA, ≈5.4:1)
          // and keep the bright brand hue for large/decorative/on-navy accents.
          DEFAULT: '#2068C9',
          bright: '#2F80ED', // brand accent — large text, borders, on-navy, decorative
          soft: '#9CC2F2', // pale tint for small text on the navy hero
        },
        slate: {
          DEFAULT: '#606F7B', // Neutral — UI chrome/borders/labels. NEVER body text.
        },
        cloud: '#F1F5F8', // Background — Cool light gray
      },
      fontFamily: {
        display: ['"Red Hat Display"', 'system-ui', 'sans-serif'],
        sans: ['"Red Hat Text"', 'system-ui', 'sans-serif'],
        mono: ['"Red Hat Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        prose: '68ch',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,61,115,0.04), 0 8px 24px -12px rgba(15,61,115,0.12)',
        'card-hover': '0 2px 4px rgba(15,61,115,0.06), 0 16px 40px -16px rgba(15,61,115,0.20)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
