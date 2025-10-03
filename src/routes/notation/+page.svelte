<script lang="ts">
  // FAQ state management for collapsible sections
  let openSection: string | null = null;
  
  function toggleSection(id: string) {
    openSection = openSection === id ? null : id;
  }
</script>

<svelte:head>
  <title>Notation System - numtags</title>
  <meta name="description" content="Learn how the numeric notation system works for barbershop tags" />
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8">
  <!-- Hero Section -->
  <div class="text-center">
    <h1 class="text-4xl font-bold text-nord-4 mb-4">Notation System</h1>
    <p class="text-xl text-nord-5">
      A  guide to reading and writing barbershop tags in numeric notation
    </p>
    <p class="text-xl text-nord-5">
        Version 1.0.0
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
      numtags uses a numeric notation system where numbers represent scale degrees:
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
      To indicate whether it's the higher or lower scale degree, we add dots: one above means one octave above, two above means two octaves above; likewise, one dot below means the octave below, and so on. These are understood in relation to the key, not relative to the previous octave: <code class="bg-nord-2 px-1 rounded">5̣ 5̇</code> in the key of C4 means <code class="bg-nord-2 px-1 rounded">G3 G5</code>, not <code class="bg-nord-2 px-1 rounded">G3 G4</code>.
    </p>
    <p class="text-nord-5 mb-4">
      Flats and sharps are added in front of the number, like so: <code class="bg-nord-2 px-1 rounded">♯2</code> or <code class="bg-nord-2 px-1 rounded">♭3</code>. Of course, <code class="bg-nord-2 px-1 rounded">♯2</code> and <code class="bg-nord-2 px-1 rounded">♭3</code> are the same note. Numeric notation tries to keep it clear - if the previous note was <code class="bg-nord-2 px-1 rounded">♯2</code>, we keep using <code class="bg-nord-2 px-1 rounded">♯2</code>. Otherwise we choose the one that best explains the note in relation to the chord or the key. If there are three <code class="bg-nord-2 px-1 rounded">♯2</code>, we write <code class="bg-nord-2 px-1 rounded">♯2 ♯2 ♯2</code> (not <code class="bg-nord-2 px-1 rounded">♯2 2 2</code>). This also means that the symbol ♮ (natural) is no longer needed, breaking with musical tradition.
    </p>
  </div>

  <!-- Rhythm -->
  <div id="rhythm" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Rhythm</h2>
    <p class="text-nord-5 mb-4">
      A "<code class="bg-nord-2 px-1 rounded">|</code>" stands for the start and end of a measure, and "<code class="bg-nord-2 px-1 rounded">-</code>" and "<code class="bg-nord-2 px-1 rounded">–</code>" are rudimentary rhythm symbols. So a tag might look like this:
    </p>
    <p class="text-nord-5 mb-4">
      This notation does not allow for much rhythmic complexity: "<code class="bg-nord-2 px-1 rounded">·</code>" is a dotted note (add one half) and "<code class="bg-nord-2 px-1 rounded">_</code>" is the opposite (remove one half). You can have double-halfed notes (eighths and sixteenths and so on). "<code class="bg-nord-2 px-1 rounded">0</code>" is a rest. A "<code class="bg-nord-2 px-1 rounded">⁀</code>" remains a tie.
    </p>
  </div>

  <!-- Layout -->
  <div id="layout" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Layout</h2>
    <p class="text-nord-5 mb-4">
      As with all barbershop music, the order of the voices (from top row to bottom row) is tenor, lead, baritone, bass.
    </p>
    <p class="text-nord-5">
      The lyrics go below the notes.
    </p>
  </div>

  <!-- Example -->
  <div id="example" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Example</h2>
    
    <div class="space-y-6">
      <div class="bg-nord-2 rounded p-4">
        <pre class="tag-notation text-sm">
Tenor:     3 - 3 - | 4⁀4 3 - |

Lead:      1 - 1 - | 1⁀7̣ 1 - |

Baritone:  5̣ -♭7̣ - | 6̣⁀5̣ 5̣ - |

Bass:      1̣ - 5̣ - | 4̣⁀2̣ 1̣ - |

           "My town, my town."
        </pre>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-3">In the key of C, this would be</h3>
        <div class="bg-nord-2 rounded p-4 mb-4">
          <pre class="tag-notation text-sm">
Tenor:     E - E - | F⁀F E - |

Lead:      C - C - | C⁀B C - |

Baritone:  G -♭B - | A⁀G G - |

Bass:      C - G - | F⁀D C - |

           "My town, my town."
          </pre>
        </div>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-3">In the key of F, this would be</h3>
        <div class="bg-nord-2 rounded p-4">
          <pre class="tag-notation text-sm">
Tenor:     A - A - | ♭B⁀♭B A - |

Lead:      F - F - |  F⁀ E F - |

Baritone:  C -♭E - |  D⁀ C C - |

Bass:      F - C - | ♭B⁀ G F - |

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
            <th class="text-left py-2 px-4 font-semibold text-nord-4">Symbol</th>
            <th class="text-left py-2 px-4 font-semibold text-nord-4">Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">4</code></td>
            <td class="py-2 px-4 text-nord-5">fourth scale degree or "fa" in Solfege</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">♭3</code></td>
            <td class="py-2 px-4 text-nord-5">flat three</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">♯5</code></td>
            <td class="py-2 px-4 text-nord-5">sharp five</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">|</code></td>
            <td class="py-2 px-4 text-nord-5">measure end</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">1̲</code></td>
            <td class="py-2 px-4 text-nord-5">half note (remove one half)</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">·</code></td>
            <td class="py-2 px-4 text-nord-5">dotted note (add one half)</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">2⁀2</code></td>
            <td class="py-2 px-4 text-nord-5">tie</td>
          </tr>
          <tr class="border-b border-nord-3">
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">-</code></td>
            <td class="py-2 px-4 text-nord-5">hold quarter note</td>
          </tr>
          <tr>
            <td class="py-2 px-4 font-mono text-nord-5"><code class="bg-nord-2 px-1 rounded">–</code></td>
            <td class="py-2 px-4 text-nord-5">hold half note</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</div>

