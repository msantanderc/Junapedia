import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  content: [
    './index.html',
    // explicitly include root TSX files and the src folder; avoid scanning node_modules
    './pluxee-junaeb-guide.tsx',
    './components/**/*.{ts,tsx}',
    './types/**/*.{ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pluxee: {
          900: '#276221',
          800: '#3b8132',
          700: '#46923c',
          600: '#52a447',
          500: '#5bb450',
          400: '#72bf6a',
          300: '#8bca84',
          200: '#acd8a7',
          100: '#cce7c9'
        }
      }
    },
  },
  plugins: [tailwindcssAnimate],
}