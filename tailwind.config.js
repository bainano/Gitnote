/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./electron/**/*.{js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
      },
      colors: {
        apple: {
          bg: '#FAFAFA',
          surface: '#FFFFFF',
          border: '#E5E5E5',
          borderLight: '#F0F0F0',
          text: '#1D1D1F',
          textSecondary: '#6E6E73',
          blue: '#007AFF',
          blueHover: '#0063CC',
          gray: '#F5F5F7',
          grayHover: '#E8E8ED',
        },
        'apple-dark': {
          bg: '#1C1C1E',
          surface: '#2C2C2E',
          border: '#48484A',
          borderLight: '#3A3A3C',
          text: '#F5F5F7',
          textSecondary: '#98989D',
          blue: '#0A84FF',
          blueHover: '#409CFF',
          gray: '#3A3A3C',
          grayHover: '#48484A',
        },
      },
      spacing: {
        'sidebar': '260px',
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};