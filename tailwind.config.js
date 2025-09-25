/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        // Nord color palette
        nord: {
          // Polar Night
          0: '#2e3440',   // nord0 - darkest
          1: '#3b4252',   // nord1
          2: '#434c5e',   // nord2
          3: '#4c566a',   // nord3 - lightest
          // Snow Storm
          4: '#d8dee9',  // nord4 - lightest
          5: '#e5e9f0',  // nord5
          6: '#eceff4',  // nord6 - darkest
          // Frost
          7: '#8fbcbb',  // nord7
          8: '#88c0d0',  // nord8
          9: '#81a1c1',  // nord9
          10: '#5e81ac', // nord10
          // Aurora
          11: '#bf616a', // nord11 - red
          12: '#d08770', // nord12 - orange
          13: '#ebcb8b', // nord13 - yellow
          14: '#a3be8c', // nord14 - green
          15: '#b48ead'  // nord15 - purple
        },
        primary: {
          50: '#f0f4ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0A3BFF',
          600: '#0831d9',
          700: '#0625a3',
          800: '#051d73',
          900: '#031447'
        }
      }
    }
  },
  plugins: []
}
