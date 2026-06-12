/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(258, 90%, 66%)",
          hover: "hsl(258, 90%, 72%)",
          glow: "rgba(139, 92, 246, 0.25)",
        },
        gold: {
          DEFAULT: "hsl(45, 93%, 58%)",
          glow: "rgba(245, 158, 11, 0.2)",
        },
        emerald: "hsl(150, 84%, 40%)",
        crimson: "hsl(346, 84%, 61%)",
        bg: {
          primary: "hsl(222, 47%, 9%)",
          secondary: "hsl(222, 47%, 6%)",
        }
      }
    },
  },
  plugins: [],
}
