/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette verte MICA/SONABHY
        primary: {
          50:  '#DAF1DE',
          100: '#c5e8cb',
          200: '#8EB69B',
          300: '#6a9e7a',
          400: '#3d7a5c',
          500: '#235347',
          600: '#163832',
          700: '#0B2B26',
          800: '#051F20',
          900: '#020f10',
        },
        // Alias sémantiques pour un usage direct
        forest: {
          darkest:  '#051F20',
          darker:   '#0B2B26',
          dark:     '#163832',
          medium:   '#235347',
          light:    '#8EB69B',
          lightest: '#DAF1DE',
        },
        danger: '#dc2626',
        warning: '#d97706',
        success: '#16a34a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
