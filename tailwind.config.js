/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Cutive Mono', 'monospace'],
        'sans': ['iA Writer Quattro', 'system-ui', 'sans-serif']
      },
      colors: {
        // "Field recordings" warm-dark palette. Keeps the nord-* slot
        // numbering (0-3 dark surfaces, 4-6 light text, 7-10 accent,
        // 11-15 semantic) so existing classes keep their meaning.
        nord: {
          // Surfaces: warm near-blacks
          0: '#1a1714',   // page background
          1: '#221e19',   // cards
          2: '#2e2823',   // raised / borders
          3: '#3d352c',   // lightest structure
          // Text: creams
          4: '#e8e0d1',  // primary text
          5: '#b9ab96',  // muted text
          6: '#f5efe4',  // brightest (headings)
          // Accent: lamplight amber (was frost blue)
          7: '#c8a96d',  // muted brass
          8: '#e3a84e',  // primary accent
          9: '#c98f33',  // accent hover
          10: '#a87830', // deep amber
          // Semantic: warmed aurora
          11: '#d4665a', // red
          12: '#d08770', // orange
          13: '#ebcb8b', // yellow
          14: '#a9b665', // green
          15: '#b48ead'  // purple
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
