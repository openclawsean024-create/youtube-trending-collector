/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'yt-red': '#FF0000',
        'yt-red-dark': '#CC0000',
        'yt-bg': '#0B0F19',
        'yt-card': '#1F2937',
        'yt-secondary': '#0F172A',
        'yt-border': '#374151',
        'yt-text': '#F9FAFB',
        'yt-text-secondary': '#9CA3AF',
        'yt-hover': '#374151',
        'yt-skeleton': '#374151',
        'yt-input-bg': '#1F2937',
        'yt-input-border': '#4B5563',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
