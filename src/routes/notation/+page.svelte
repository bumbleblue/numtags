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
      <a href="#how-it-works" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> How It Works
      </a>
      <a href="#scale-degrees" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Scale Degree Mapping
      </a>
      <a href="#voice-parts" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Voice Parts
      </a>
      <a href="#reading-examples" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Reading Examples
      </a>
      <a href="#special-notation" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Special Notation
      </a>
      <a href="#benefits" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Benefits
      </a>
      <a href="#learning-tips" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Learning Tips
      </a>
      <a href="#advanced-features" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Advanced Features
      </a>
    </nav>
  </div>

  <!-- How It Works -->
  <div id="how-it-works" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">How It Works</h2>
    <p class="text-nord-5 mb-4">
      The numeric notation system used in numtags is designed to be simple, intuitive, and accessible to barbershop singers of all skill levels. Instead of traditional sheet music, we use numbers to represent scale degrees.
    </p>
    <p class="text-nord-5">
      This system makes it easy to read, learn, and teach tags on any device, with a clean, searchable database that grows through community contributions.
    </p>
  </div>



  <!-- Numeric Notation -->
  <div id="numeric-notation" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Numeric Notation System</h2>
    <p class="text-nord-5 mb-4">
      numtags uses a straightforward numeric notation system where numbers represent scale degrees:    </p>
    
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
    
    <p class="text-nord-5 mb-4">
      Each line represents a different voice part (Tenor, Lead, Baritone, Bass), and the numbers show which scale degree to sing. Dots above and belowe show which octave the note is in.
    </p>
    
    <div class="bg-nord-2 rounded p-4">
      <h3 class="font-medium text-nord-4 mb-2">Example:</h3>
      <pre class="tag-notation text-sm">
        Tenor:      3 - 3 - | 4⁀4 3 - |
        Lead:       1 - 1 - | 1⁀7̣ 1 - |
        Baritone:   5̣ -♭7̣ - | 6̣⁀5̣ 5̣ - |
        Bass:       1̣ - 5̣ - | 4̣⁀2̣ 1̣ - |

                    "My town, my town."
      </pre>
    </div>
  </div>

  <!-- Scale Degree Mapping -->
  <div id="scale-degrees" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Scale Degree Mapping</h2>
    <p class="text-nord-5 mb-4">
      Each number corresponds to a note in the major scale:
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
8 = Octave (Do)
      </pre>
    </div>
    
    <p class="text-nord-5">
      This system works in any key signature, making it incredibly flexible for different vocal ranges and arrangements.
    </p>
  </div>

  <!-- Voice Parts -->
  <div id="voice-parts" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Voice Parts</h2>
    <p class="text-nord-5 mb-4">
      Each tag is written for four voice parts, represented by four lines:
    </p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="bg-nord-2 rounded p-4">
        <h3 class="font-medium text-nord-4 mb-2">Line 1: Lead</h3>
        <p class="text-nord-5 text-sm">The melody line - usually the most recognizable part</p>
      </div>
      <div class="bg-nord-2 rounded p-4">
        <h3 class="font-medium text-nord-4 mb-2">Line 2: Bass</h3>
        <p class="text-nord-5 text-sm">The lowest harmony - provides the foundation</p>
      </div>
      <div class="bg-nord-2 rounded p-4">
        <h3 class="font-medium text-nord-4 mb-2">Line 3: Baritone</h3>
        <p class="text-nord-5 text-sm">Middle harmony - fills in the chord</p>
      </div>
      <div class="bg-nord-2 rounded p-4">
        <h3 class="font-medium text-nord-4 mb-2">Line 4: Tenor</h3>
        <p class="text-nord-5 text-sm">Highest harmony - adds the sparkle</p>
      </div>
    </div>
  </div>

  <!-- Reading Examples -->
  <div id="reading-examples" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Reading Examples</h2>
    
    <div class="space-y-6">
      <!-- Simple Example -->
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-3">Simple Example</h3>
        <div class="bg-nord-2 rounded p-4 mb-3">
          <pre class="tag-notation text-sm">
Lead:   1 3 5 1
Bass:   1 1 3 1
Baritone: 3 3 3 3
Tenor:  5 5 5 5
          </pre>
        </div>
        <p class="text-nord-5 text-sm">
          This represents a simple I-V-I progression in C major:
        </p>
        <ul class="text-nord-5 text-sm list-disc list-inside mt-2 space-y-1">
          <li><strong>Lead:</strong> C-E-G-C</li>
          <li><strong>Bass:</strong> C-C-E-C</li>
          <li><strong>Baritone:</strong> E-E-E-E</li>
          <li><strong>Tenor:</strong> G-G-G-G</li>
        </ul>
      </div>

      <!-- With Lyrics -->
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-3">With Lyrics</h3>
        <div class="bg-nord-2 rounded p-4">
          <pre class="tag-notation text-sm">
|  3  5  4  - |  4  -  -  4 |  3  -  -  - |
|  1  1  1  - |  2  1  7̣  7̣ |  2  -  1  - |
|  5̣  5̣  5̣  - |  5̣  -  -  5̣ |  5̣  -  -  - |
|  1̣  3̣  2̣  - |  2̣  -  -  2̣ |  1̣  -  -  - |

Close your eyes, 
                (close your eyes)
                          in sleep.
          </pre>
        </div>
      </div>
    </div>
  </div>

  <!-- Special Notation -->
  <div id="special-notation" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Special Notation</h2>
    
    <div class="space-y-4">
      <!-- Octave Markers -->
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Octave Markers</h3>
        <div class="bg-nord-2 rounded p-4 mb-3">
          <pre class="tag-notation text-sm">
Regular numbers (1-8): Middle octave
Numbers with dot below (1̣, 2̣, etc.): Lower octave  
Numbers with dot above (1̇, 2̇, etc.): Higher octave
          </pre>
        </div>
      </div>

      <!-- Accidentals -->
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Accidentals</h3>
        <div class="bg-nord-2 rounded p-4 mb-3">
          <pre class="tag-notation text-sm">
Sharp (#): ♯1, ♯2, etc.
Flat (♭): ♭3, ♭7, etc.
Natural (♮): ♮4, ♮5, etc.
          </pre>
        </div>
      </div>

      <!-- Rhythm Notation -->
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Rhythm Notation</h3>
        <div class="bg-nord-2 rounded p-4">
          <pre class="tag-notation text-sm">
Dash (-): Hold the previous note
Pipe (|): Measure separator
Space: Short pause or breath
          </pre>
        </div>
      </div>
    </div>
  </div>

  <!-- Benefits -->
  <div id="benefits" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Benefits of Numeric Notation</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">✅ Accessibility</h3>
        <ul class="text-nord-5 text-sm space-y-1">
          <li>• No need to read traditional sheet music</li>
          <li>• Works in any key signature</li>
          <li>• Easy to learn and remember</li>
        </ul>
      </div>
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">✅ Portability</h3>
        <ul class="text-nord-5 text-sm space-y-1">
          <li>• Can be written on any device</li>
          <li>• Takes up minimal space</li>
          <li>• Easy to share via text or email</li>
        </ul>
      </div>
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">✅ Flexibility</h3>
        <ul class="text-nord-5 text-sm space-y-1">
          <li>• Transpose to any key instantly</li>
          <li>• Works for any vocal range</li>
          <li>• Adaptable to different arrangements</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Learning Tips -->
  <div id="learning-tips" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Learning Tips</h2>
    
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Start Simple</h3>
        <ol class="text-nord-5 list-decimal list-inside space-y-1">
          <li>Begin with familiar songs you already know</li>
          <li>Practice singing the scale degrees (Do, Re, Mi, etc.)</li>
          <li>Use the search function to find easier tags first</li>
        </ol>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Practice Techniques</h3>
        <ul class="text-nord-5 list-disc list-inside space-y-1">
          <li><strong>Sing the numbers</strong> out loud as you read</li>
          <li><strong>Tap the rhythm</strong> while singing the numbers</li>
          <li><strong>Start slow</strong> and gradually increase tempo</li>
          <li><strong>Use a piano</strong> to check your pitch accuracy</li>
        </ul>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Common Patterns</h3>
        <div class="bg-nord-2 rounded p-4">
          <pre class="tag-notation text-sm">
1-3-5: Major triad (Do-Mi-So)
1-2-3: Stepwise motion (Do-Re-Mi)  
5-4-3: Descending (So-Fa-Mi)
1-8-1: Octave leap (Do-Do-Do)
          </pre>
        </div>
      </div>
    </div>
  </div>

  <!-- Advanced Features -->
  <div id="advanced-features" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Advanced Features</h2>
    
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Key Transposition</h3>
        <p class="text-nord-5 mb-3">
          The beauty of numeric notation is that it works in any key. A tag written in C major can be instantly transposed to F major by simply changing your reference note.
        </p>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Harmony Analysis</h3>
        <p class="text-nord-5 mb-3">
          Numbers make it easy to see harmonic relationships:
        </p>
        <div class="bg-nord-2 rounded p-4">
          <pre class="tag-notation text-sm">
1-3-5: Root position triad
3-5-1: First inversion
5-1-3: Second inversion
          </pre>
        </div>
      </div>
      
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Voice Leading</h3>
        <p class="text-nord-5">
          The notation clearly shows how each voice part moves, making it easier to understand the harmonic progression and voice leading principles.
        </p>
      </div>
    </div>
  </div>

  <!-- Getting Started -->
  <div class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Getting Started</h2>
    <ol class="text-nord-5 list-decimal list-inside space-y-2">
      <li><strong>Choose a familiar tag</strong> from the collection</li>
      <li><strong>Start with the melody</strong> (Lead part)</li>
      <li><strong>Add the bass line</strong> once you're comfortable</li>
      <li><strong>Gradually add</strong> the inner voices (Baritone, Tenor)</li>
      <li><strong>Practice with a group</strong> to hear the full harmony</li>
    </ol>
  </div>
</div>

