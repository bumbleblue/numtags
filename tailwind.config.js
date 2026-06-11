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
        // Base16 Default Dark (Chris Kempson), named by role so the
        // hexes can be swapped without touching components.
        // paper-* and ink* mirror the CSS vars in app.css.
        paper: {
          // Surfaces by elevation: the base16 neutral ramp
          0: '#151515', // page background (base00)
          1: '#202020', // cards (base01)
          2: '#303030', // raised / subtle rules (base02)
          3: '#505050'  // box borders, structure (base03)
        },
        ink: {
          DEFAULT: '#e0e0e0', // primary text (base06)
          muted: '#b0b0b0',   // secondary text (base04)
          bright: '#f5f5f5'   // headings, emphasis (base07)
        },
        accent: {
          // base0D blue carries interactive emphasis
          DEFAULT: '#6a9fb5',  // buttons, active nav (base0D)
          hover: '#75b5aa',    // hover shift (base0C)
          muted: '#b0b0b0',    // (base04)
          recessed: '#505050'  // (base03)
        },
        // Status colors: the base16 accent row
        danger: '#ac4142',  // base08
        warning: '#d28445', // base09
        note: '#f4bf75',    // base0A — hints, import notes, medium difficulty
        success: '#90a959', // base0B
        info: '#aa759f'     // base0E — reserved, currently unused
      }
    }
  },
  plugins: []
}
