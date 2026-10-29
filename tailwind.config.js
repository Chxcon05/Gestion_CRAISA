/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        craisa: { primary: '#143F7F', deep: '#0B2450', dark: '#061831', accent: '#1F7BFF' },
        agricola: '#AA182C', construccion: '#D47E00', carga: '#3DAE2B', precision: '#004B70', postventa: '#58595B', institucional: '#143F7F',
      },
      fontFamily: { display: ['"Archivo"', 'system-ui', 'sans-serif'], body: ['"Inter"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
