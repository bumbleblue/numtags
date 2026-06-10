<svelte:head>
  <title>Notation System - numtags</title>
  <meta name="description" content="Learn how the numeric notation system works for barbershop tags" />
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8">
  <!-- Hero Section -->
  <div class="text-center">
    <h1 class="text-4xl font-bold text-nord-4 mb-4">Notation System</h1>
    <p class="text-xl text-nord-5">
      A guide to reading and writing barbershop tags in numeric notation
    </p>
    <p class="text-xl text-nord-5">
      Version 2.0.0
    </p>
  </div>

  <!-- Table of Contents -->
  <div class="bg-nord-2 border border-nord-8 rounded shadow-sm p-6">
    <h2 class="text-xl font-semibold text-nord-4 mb-4 flex items-center">
      Table of Contents
    </h2>
    <nav class="space-y-2">
      <a href="#why-numeric" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Why use numeric notation?
      </a>
      <a href="#how-it-works" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> How does it work?
      </a>
      <a href="#which-note" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Which note is it?
      </a>
      <a href="#rhythm" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Rhythm
      </a>
      <a href="#typing" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Typing a tag
      </a>
      <a href="#layout" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Layout
      </a>
      <a href="#example" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Example
      </a>
      <a href="#glossary" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Glossary
      </a>
    </nav>
  </div>

  <!-- Why use numeric notation? -->
  <div id="why-numeric" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Why use numeric notation?</h2>
    <p class="text-nord-5 mb-4">
      Numeric notation is an attempt to simplify music notation. Barbershop music is hard enough to sing, if we can abstract away some notation and save mental load while reading music, maybe we can spend more time singing.
    </p>
    <p class="text-nord-5">
      Many of the decisions are made to be clear and concise, even when it breaks with some musical tradition.
    </p>
  </div>

  <!-- How does it work? -->
  <div id="how-it-works" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">How does it work?</h2>
    <p class="text-nord-5 mb-4">
      numtags uses a movable-Do system: numbers represent scale degrees relative to the tonic, so the same notation works in any key.
    </p>

    <div class="bg-nord-2 rounded p-4 mb-4">
      <pre class="tag-notation text-sm">
1 = Root (Do)
2 = Second (Re)
3 = Third (Mi)
4 = Fourth (Fa)
5 = Fifth (So)
6 = Sixth (La)
7 = Seventh (Ti)
      </pre>
    </div>

    <p class="text-nord-5">
      This system works in any key signature, making it incredibly flexible for different vocal ranges and arrangements.
    </p>
  </div>

  <!-- Which note is it? -->
  <div id="which-note" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Which note is it?</h2>
    <p class="text-nord-5 mb-4">
      To indicate a higher or lower octave, add <code class="bg-nord-2 px-1 rounded">'</code> (up) or <code class="bg-nord-2 px-1 rounded">,</code> (down) after the number — once per octave. numtags shows these as dots above or below the digit. Octaves are understood in relation to the key, not relative to the previous note: <code class="bg-nord-2 px-1 rounded">5, 5'</code> in the key of C4 means <code class="bg-nord-2 px-1 rounded">G3 G5</code>, not <code class="bg-nord-2 px-1 rounded">G3 G4</code>. Stack them for two octaves: <code class="bg-nord-2 px-1 rounded">5''</code> or <code class="bg-nord-2 px-1 rounded">5,,</code>.
    </p>
    <p class="text-nord-5 mb-4">
      Flats and sharps are written in front of the number as <code class="bg-nord-2 px-1 rounded">b</code> and <code class="bg-nord-2 px-1 rounded">#</code> — <code class="bg-nord-2 px-1 rounded">#2</code> or <code class="bg-nord-2 px-1 rounded">b3</code>, shown as ♯2 and ♭3. Of course, <code class="bg-nord-2 px-1 rounded">#2</code> and <code class="bg-nord-2 px-1 rounded">b3</code> are the same note. Numeric notation tries to keep it clear - if the previous note was <code class="bg-nord-2 px-1 rounded">#2</code>, we keep using <code class="bg-nord-2 px-1 rounded">#2</code>. Otherwise we choose the one that best explains the note in relation to the chord or the key. Every note is spelled explicitly every time: three sharp-twos are <code class="bg-nord-2 px-1 rounded">#2 #2 #2</code> (not <code class="bg-nord-2 px-1 rounded">#2 2 2</code>). This also means that the symbol ♮ (natural) is no longer needed, breaking with musical tradition.
    </p>
  </div>

  <!-- Rhythm -->
  <div id="rhythm" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Rhythm</h2>
    <p class="text-nord-5 mb-4">
      The notation is a beat grid, not an engraving: each symbol is one cell, read as roughly one beat (a quarter note). It is intentionally loose — a memory aid for singers who already half-know the tune — so beats need not sum exactly to the time signature. Get the pitches and contour right; precise rhythm is the reader's job.
    </p>
    <p class="text-nord-5 mb-4">
      A <code class="bg-nord-2 px-1 rounded">|</code> marks a measure boundary. <code class="bg-nord-2 px-1 rounded">-</code> holds the previous note one more beat — repeat it for longer holds (<code class="bg-nord-2 px-1 rounded">3 - -</code> is three beats). It is the only hold symbol: earlier versions used a longer dash for a half-note hold; that distinction is gone.
    </p>
    <p class="text-nord-5 mb-4">
      Faster notes get a slash: <code class="bg-nord-2 px-1 rounded">3/</code> is an eighth, <code class="bg-nord-2 px-1 rounded">3//</code> a sixteenth — and two fast notes are two cells (<code class="bg-nord-2 px-1 rounded">6/ 5/</code>), never packed into one. <code class="bg-nord-2 px-1 rounded">3.</code> is dotted (add one half). <code class="bg-nord-2 px-1 rounded">0</code> is a rest. <code class="bg-nord-2 px-1 rounded">~4</code> ties the note to the previous beat — same pitch and syllable, no re-attack — shown with a tie arc. <code class="bg-nord-2 px-1 rounded">X</code> is a posted note: hold until the director cuts, no beat-counting required.
    </p>
  </div>

  <!-- Typing a tag -->
  <div id="typing" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Typing a tag</h2>
    <p class="text-nord-5 mb-4">
      What you type is what's stored: the notation is plain ASCII you can write on any keyboard, in any editor. The pretty marks — ♯ and ♭ signs, octave dots, tie arcs — are drawn by numtags when it displays a tag. There are no special characters to hunt for.
    </p>
    <p class="text-nord-5">
      Spacing between symbols is cosmetic: only the symbols themselves, <code class="bg-nord-2 px-1 rounded">|</code> boundaries, and the lyric line's cells carry meaning. The live preview in the editor shows the beat grid snapping into alignment as you type.
    </p>
  </div>

  <!-- Layout -->
  <div id="layout" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Layout</h2>
    <p class="text-nord-5 mb-4">
      As with all barbershop music, the order of the voices (from top row to bottom row) is tenor, lead, baritone, bass.
    </p>
    <p class="text-nord-5 mb-4">
      The lyrics go on a line below the four voices. In the lyric line, a space advances to the next beat, <code class="bg-nord-2 px-1 rounded">_</code> marks a beat with no new syllable (a held note or a rest), and a hyphen splits a word across consecutive beats: <code class="bg-nord-2 px-1 rounded">slee-py</code> is two beats.
    </p>
    <p class="text-nord-5 mb-4">
      Four voice lines plus their lyric line(s) make a staff; long tags use several staffs separated by a blank line. Beats before the first <code class="bg-nord-2 px-1 rounded">|</code> are a pickup — they tuck in just before the first full measure.
    </p>
    <p class="text-nord-5">
      On screen, a tag can be shown as wrapped systems (like printed choral music, scrolling down) or as one continuous line (swiping sideways) — toggle between them on any tag page.
    </p>
  </div>

  <!-- Example -->
  <div id="example" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Example</h2>

    <div class="space-y-6">
      <div class="bg-nord-2 rounded p-4">
        <pre class="tag-notation text-sm">
Tenor:     3 - 3 - | 4 ~4 3 - |
Lead:      1 - 1 - | 1 ~7, 1 - |
Baritone:  5, - b7, - | 6, ~5, 5, - |
Bass:      1, - 5, - | 4, ~2, 1, - |
           "My town, my town."
        </pre>
      </div>

      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-3">In the key of C, this would be</h3>
        <div class="bg-nord-2 rounded p-4 mb-4">
          <pre class="tag-notation text-sm">
Tenor:     E - E - | F ~F E - |
Lead:      C - C - | C ~B C - |
Baritone:  G - ♭B - | A ~G G - |
Bass:      C - G - | F ~D C - |
           "My town, my town."
          </pre>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-3">In the key of F, this would be</h3>
        <div class="bg-nord-2 rounded p-4">
          <pre class="tag-notation text-sm">
Tenor:     A - A - | ♭B ~♭B A - |
Lead:      F - F - | F ~E F - |
Baritone:  C - ♭E - | D ~C C - |
Bass:      F - C - | ♭B ~G F - |
           "My town, my town."
          </pre>
        </div>
      </div>
    </div>
  </div>

  <!-- Glossary -->
  <div id="glossary" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Glossary</h2>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-nord-3">
            <th class="text-left py-2 px-4 font-semibold text-nord-4">You type</th>
            <th class="text-left py-2 px-4 font-semibold text-nord-4">Shown as</th>
            <th class="text-left py-2 px-4 font-semibold text-nord-4">Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">4</code></td>
            <td class="py-2 px-4 text-nord-5">4</td>
            <td class="py-2 px-4 text-nord-5">fourth scale degree or "fa" in Solfège — one beat</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">b3</code> / <code class="bg-nord-2 px-1 rounded">#5</code></td>
            <td class="py-2 px-4 text-nord-5">♭3 / ♯5</td>
            <td class="py-2 px-4 text-nord-5">flat three / sharp five</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">5'</code> / <code class="bg-nord-2 px-1 rounded">5,</code></td>
            <td class="py-2 px-4 text-nord-5">dot above / below the 5</td>
            <td class="py-2 px-4 text-nord-5">octave up / down (stack for two: <code class="bg-nord-2 px-1 rounded">5''</code>, <code class="bg-nord-2 px-1 rounded">5,,</code>)</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">3/</code> / <code class="bg-nord-2 px-1 rounded">3//</code></td>
            <td class="py-2 px-4 text-nord-5">tick(s) under the 3</td>
            <td class="py-2 px-4 text-nord-5">eighth / sixteenth note</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">3.</code></td>
            <td class="py-2 px-4 text-nord-5">3·</td>
            <td class="py-2 px-4 text-nord-5">dotted note (add one half)</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">-</code></td>
            <td class="py-2 px-4 text-nord-5">-</td>
            <td class="py-2 px-4 text-nord-5">hold the previous note one more beat (repeat for longer)</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">0</code></td>
            <td class="py-2 px-4 text-nord-5">0</td>
            <td class="py-2 px-4 text-nord-5">a beat of rest</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">~4</code></td>
            <td class="py-2 px-4 text-nord-5">⁀4</td>
            <td class="py-2 px-4 text-nord-5">tie — continue the previous note across the beat/barline</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">X</code></td>
            <td class="py-2 px-4 text-nord-5">X</td>
            <td class="py-2 px-4 text-nord-5">posted — hold until the director cuts</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">|</code></td>
            <td class="py-2 px-4 text-nord-5">|</td>
            <td class="py-2 px-4 text-nord-5">measure boundary</td>
          </tr>
          <tr>
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">_</code></td>
            <td class="py-2 px-4 text-nord-5">(blank)</td>
            <td class="py-2 px-4 text-nord-5">lyric line only: a beat with no new syllable</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</div>
