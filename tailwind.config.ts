import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FEF6EE',
          100: '#FDEAD7',
          200: '#FAD1AE',
          300: '#F7B17A',
          400: '#F28744',
          500: '#CC5E0F', // logo orange — fills & large text
          600: '#B54F0A', // orange TEXT at body size (WCAG AA 5.14:1)
          700: '#A34509', // hover / high contrast
          800: '#7C340B',
          900: '#45260A', // logo brown
        },
        cream: {
          DEFAULT: '#FDF0E0',
          light: '#FFF8EF',
        },
        ink: {
          DEFAULT: '#2B1708',
          muted: '#6B4A2A',
          subtle: '#8A6A46',
        },
        line: {
          DEFAULT: '#EADDCB',
          strong: '#D9C7AE',
        },
        veg: '#0A8043',
        nonveg: '#9B2C2C',
        success: {
          DEFAULT: '#1B7F3B',
          bg: '#E8F5ED',
        },
        warning: {
          DEFAULT: '#8A5A00',
          bg: '#FEF5E0',
        },
        error: {
          DEFAULT: '#C0261A',
          bg: '#FDECEA',
        },
        info: {
          DEFAULT: '#1A5FA8',
          bg: '#E8F1FB',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(43,23,8,.08), 0 1px 2px rgba(43,23,8,.04)',
        'card-hover': '0 4px 12px rgba(43,23,8,.10)',
        sticky: '0 -2px 12px rgba(43,23,8,.08)',
      },
    },
  },
  plugins: [],
};

export default config;

