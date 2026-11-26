/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#FDF2F4',
          100: '#FBE5E9',
          200: '#F7C6D0',
          300: '#EF98A9',
          400: '#E25E77',
          500: '#C72545',
          600: '#A61937',
          700: '#800020',
          800: '#560619',
          900: '#3A0310',
          950: '#1F0208',
        },
        gold: {
          50: '#FFFDF0',
          100: '#FFF6BF',
          200: '#FFED8F',
          300: '#F3DB59',
          400: '#E5C158',
          500: '#D4AF37',
          600: '#B8860B',
          700: '#946500',
          800: '#754B06',
          900: '#523307',
          950: '#3A2003',
        },
        cream: {
          50: '#FFFFFF',
          100: '#FFFDF9',
          200: '#FAF7F2',
          300: '#F5EFE6',
          400: '#EAE1D3',
          500: '#DBCFBE',
        },
        royal: {
          dark: '#140105',
          card: '#29040D',
          border: 'rgba(212, 175, 55, 0.25)',
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 4px 20px -2px rgba(212, 175, 55, 0.35)',
        'maroon-glow': '0 4px 25px -3px rgba(128, 0, 32, 0.4)',
        'card-hover': '0 12px 30px -5px rgba(128, 0, 32, 0.15), 0 0 15px 0 rgba(212, 175, 55, 0.2)',
      }
    },
  },
  plugins: [],
}
