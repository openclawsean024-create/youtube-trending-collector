/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'yt-red': '#FF0000',
        'yt-red-dark': '#CC0000',
        'yt-bg': '#F9F9F9',
        'yt-white': '#FFFFFF',
        'yt-border': '#E5E5E5',
        'yt-text': '#0F0F0F',
        'yt-text-secondary': '#606060',
        'yt-hover': '#F2F2F2',
        'yt-skeleton': '#E5E5E5',
      },
    },
  },
  plugins: [],
};
