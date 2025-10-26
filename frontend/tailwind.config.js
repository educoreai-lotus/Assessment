/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        lightBg: '#f9fafb',
        darkBg: '#0f172a',
        lightCard: '#ffffff',
        darkCard: '#1e293b',
      },
    },
  },
  plugins: [],
};


