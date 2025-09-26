<script lang="ts">
  // FAQ state management
  let openFAQ: string | null = null;
  
  function toggleFAQ(id: string) {
    openFAQ = openFAQ === id ? null : id;
  }
</script>

<svelte:head>
  	<title>About - numtags</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8">
  <!-- Hero Section -->
  <div class="text-center">
    		<h1 class="text-4xl font-bold text-nord-4 mb-4">About</h1>
    <p class="text-xl text-nord-5">
      numtags: Barbershop tags in numeric notation
    </p>
  </div>

  <!-- Table of Contents -->
  <div class="bg-nord-2 border border-nord-8 rounded shadow-sm p-6">
    <h2 class="text-xl font-semibold text-nord-4 mb-4 flex items-center">
      Table of Contents
    </h2>
    <nav class="space-y-2">
      <a href="#what-is-numtags" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> What is numtags?
      </a>
      <a href="#numeric-notation" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Numeric Notation System
      </a>
      <a href="#key-features" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Features
      </a>
      <a href="#faq" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> FAQs
      </a>
      <a href="#contributing" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Contributing
      </a>
      <a href="#get-in-touch" class="block text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-3 py-2 rounded transition-all duration-200">
        <span class="text-nord-8">•</span> Get in Touch
      </a>
    </nav>
  </div>

  <!-- What is Tagalong -->
  <div id="what-is-numtags" class="card-bg rounded shadow-sm border p-6">
    		<h2 class="text-2xl font-semibold text-nord-4 mb-4">What is numtags?</h2>
    <p class="text-nord-5 mb-4">
      numtags is a mobile-first web application designed specifically for barbershop singers to quickly find, learn, and share barbershop tags. Tags are short, harmonically rich pieces of music meant for spontaneous group singing. The app uses a custom numeric notation system that makes it easy to read, learn, and teach tags on any device.
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

  <!-- Features -->
  <div id="key-features" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Linked to barbershoptags.com</h3>
        <p class="text-nord-5">Search by ID, title, lyrics, or arranger</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Mobile First</h3>
        <p class="text-nord-5">Optimized for mobile devices with PWA capabilities</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Offline Ready</h3>
        <p class="text-nord-5">Works offline once loaded, perfect for rehearsals without internet access</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-nord-4 mb-2">Open Source</h3>
        <p class="text-nord-5">Openly licensed and welcoming community contributions</p>
      </div>
    </div>
  </div>

  <!-- FAQ Section -->
  <div id="faq" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-6">Frequently Asked Questions</h2>
    
    <div class="space-y-4">
      <!-- FAQ Item 1 -->
      <div class="border border-nord-3 rounded">
        <button 
          on:click={() => toggleFAQ('faq1')}
          class="w-full text-left p-4 hover:bg-nord-2 transition-colors duration-200 flex items-center justify-between"
          style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23e5e9f0\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3rem;"
        >
          <span class="font-medium text-nord-4">How do I read the numeric notation?</span>
        </button>
        {#if openFAQ === 'faq1'}
          <div class="px-4 pb-4 text-nord-5">
            <p class="mb-3">
              The numeric notation uses numbers 1-8 to represent scale degrees. Each number corresponds to a note in the major scale:
            </p>
            <div class="bg-nord-2 rounded p-3 mb-3">
              <pre class="text-sm">1=Do, 2=Re, 3=Mi, 4=Fa, 5=So, 6=La, 7=Ti, 8=Do (octave)</pre>
            </div>
            <p>
              Each line represents a different voice part (Lead, Bass, Baritone, Tenor), and you sing the corresponding scale degree for each number.
            </p>
          </div>
        {/if}
      </div>

      <!-- FAQ Item 2 -->
      <div class="border border-nord-3 rounded">
        <button 
          on:click={() => toggleFAQ('faq2')}
          class="w-full text-left p-4 hover:bg-nord-2 transition-colors duration-200 flex items-center justify-between"
          style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23e5e9f0\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3rem;"
        >
          <span class="font-medium text-nord-4">Can I use this app offline?</span>
        </button>
        {#if openFAQ === 'faq2'}
          <div class="px-4 pb-4 text-nord-5">
            <p>
              Yes! numtags is a Progressive Web App (PWA) that works offline once you've loaded it. This makes it perfect for rehearsals, performances, or any situation where you don't have internet access. The app will cache all the tag data locally on your device.
            </p>
          </div>
        {/if}
      </div>

      <!-- FAQ Item 3 -->
      <div class="border border-nord-3 rounded">
        <button 
          on:click={() => toggleFAQ('faq3')}
          class="w-full text-left p-4 hover:bg-nord-2 transition-colors duration-200 flex items-center justify-between"
          style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23e5e9f0\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3rem;"
        >
          <span class="font-medium text-nord-4">How do I contribute new tags?</span>
        </button>
        {#if openFAQ === 'faq3'}
          <div class="px-4 pb-4 text-nord-5">
            <p class="mb-3">
              Contributing is easy! All tags are stored as Markdown files with YAML metadata. To add a new tag:
            </p>
            <ol class="list-decimal list-inside space-y-1 mb-3">
              <li>Create a new Markdown file in the <code class="bg-nord-2 px-1 rounded">data/tags/</code> directory</li>
              <li>Add the tag metadata in YAML format at the top</li>
              <li>Include the numeric notation for all four parts</li>
              <li>Submit a pull request on GitHub</li>
            </ol>
            <p>
              Check our GitHub repository for detailed contribution guidelines and examples.
            </p>
          </div>
        {/if}
      </div>

      <!-- FAQ Item 4 -->
      <div class="border border-nord-3 rounded">
        <button 
          on:click={() => toggleFAQ('faq4')}
          class="w-full text-left p-4 hover:bg-nord-2 transition-colors duration-200 flex items-center justify-between"
          style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23e5e9f0\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3rem;"
        >
          <span class="font-medium text-nord-4">What if I can't read the numeric notation?</span>
        </button>
        {#if openFAQ === 'faq4'}
          <div class="px-4 pb-4 text-nord-5">
            <p class="mb-3">
              Don't worry! The numeric notation is designed to be simple and intuitive. Here are some tips to get started:
            </p>
            <ul class="list-disc list-inside space-y-1 mb-3">
              <li>Start with familiar songs you already know</li>
              <li>Practice singing the scale degrees (Do, Re, Mi, etc.)</li>
              <li>Use the search function to find easier tags first</li>
              <li>Listen to recordings while following the notation</li>
            </ul>
            <p>
              Many users find it easier than traditional sheet music once they get the hang of it!
            </p>
          </div>
        {/if}
      </div>

      <!-- FAQ Item 5 -->
      <div class="border border-nord-3 rounded">
        <button 
          on:click={() => toggleFAQ('faq5')}
          class="w-full text-left p-4 hover:bg-nord-2 transition-colors duration-200 flex items-center justify-between"
          style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23e5e9f0\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e'); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3rem;"
        >
          <span class="font-medium text-nord-4">Is this app free to use?</span>
        </button>
        {#if openFAQ === 'faq5'}
          <div class="px-4 pb-4 text-nord-5">
            <p>
              Yes! numtags is completely free and open source. There are no subscription fees, in-app purchases, or hidden costs. The app is developed by the barbershop community for the barbershop community, and we believe music education should be accessible to everyone.
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Contributing -->
  <div id="contributing" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Contributing</h2>
    <p class="text-nord-5 mb-4">
      		numtags is an open-source project that thrives on community contributions. We welcome:
    </p>
    <ul class="list-disc list-inside text-nord-5 space-y-2 mb-4">
      <li>New tag submissions in our numeric notation format</li>
      <li>Improvements to existing tag metadata</li>
      <li>Bug reports and feature suggestions</li>
      <li>Code contributions and improvements</li>
    </ul>
    <p class="text-nord-5 mb-4">
      All tags are stored as Markdown files with YAML metadata, making it easy to contribute 
      through pull requests on GitHub.
    </p>
    <a 
      href="https://github.com/your-username/tag-along" 
      class="btn-primary inline-block"
    >
      View on GitHub
    </a>
  </div>

  <!-- Contact -->
  <div id="get-in-touch" class="card-bg rounded shadow-sm border p-6">
    <h2 class="text-2xl font-semibold text-nord-4 mb-4">Get in Touch</h2>
    <p class="text-nord-5 mb-4">
      Have questions, suggestions, or want to contribute? We'd love to hear from you!
    </p>
    <div class="flex space-x-4">
      <a 
        href="https://github.com/your-username/tag-along/issues" 
        class="btn-secondary"
      >
        Report Issues
      </a>
      <a 
        href="https://github.com/your-username/tag-along/discussions" 
        class="btn-secondary"
      >
        Join Discussion
      </a>
    </div>
  </div>
</div>