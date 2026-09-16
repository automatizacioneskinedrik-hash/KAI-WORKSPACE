/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app.js",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#040025',
        'kinedrik-blue': '#0040A4',
        'off-white': '#E7E7E7',
        'grass-green': '#8ABC43',
        'digital-blue': '#2885FF',
        'sun-yellow': '#FBB42A',
        'tech-orange': '#FF5900',
        'tech-purple': '#BB8AFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        head: ['Sora', 'sans-serif'],
      }
    },
  },
  plugins: [],
}