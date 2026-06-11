/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        // JD-style near-square boxes: `rounded` is a hair off square.
        DEFAULT: '2px'
      },
      fontFamily: {
        // One typeface for everything: Quattro is near-monospaced and
        // its digits share a width, which is all the notation needs.
        'mono': ['iA Writer Quattro', 'monospace'],
        'sans': ['iA Writer Quattro', 'system-ui', 'sans-serif']
      },
      colors: {
        // "Field recordings" warm-ish monochrome palette. Keeps the
        // nord-* slot numbering (0-3 dark surfaces, 4-6 light text,
        // 7-10 accent, 11-15 semantic) so existing classes keep their
        // meaning. Accent slots are monochrome creams: emphasis comes
        // from contrast, not hue.
        nord: {
          // Surfaces: near-neutral darks, a whisper of warmth
          0: '#121110',   // page background
          1: '#181716',   // cards
          2: '#21201e',   // raised / subtle rules
          3: '#34322e',   // box borders, structure
          // Text: warm-neutral whites
          4: '#e5e3de',  // primary text
          5: '#93908a',  // muted text
          6: '#f2f1ed',  // brightest (headings)
          // Accent: monochrome
          7: '#b1aea7',  // muted
          8: '#efede8',  // primary accent (buttons, active nav)
          9: '#d6d3cd',  // accent hover
          10: '#7b7872', // recessed
          // Semantic: desaturated
          11: '#c46a5e', // red
          12: '#c08568', // orange
          13: '#cdb380', // yellow
          14: '#97a173', // green
          15: '#a58a9d'  // purple
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
