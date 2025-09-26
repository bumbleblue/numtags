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

  <!-- What is Tagalong -->
  <div id="what-is-numtags" class="card-bg rounded shadow-sm border p-6">
    		<h2 class="text-2xl font-semibold text-nord-4 mb-4">What is numtags?</h2>
    <p class="text-nord-5 mb-4">
      numtags is a mobile-first web application designed specifically for barbershop singers to quickly find, learn, and share barbershop tags. Tags are short, harmonically rich pieces of music meant for spontaneous group singing. The app uses a custom numeric notation system that makes it easy to read, learn, and teach tags on any device.
    </p>

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
              The numeric notation uses numbers 1-7 to represent scale degrees. We keep flat and sharp symbols for the notes, and use dots above and belowe to indicate the octave. There are simple symbols for rhythm as well. Read more about the notation <a href="/notation" class="text-nord-6 hover:text-nord-8 hover:bg-nord-1 px-2 py-2 rounded transition-all duration-200">here</a>.
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
          <span class="font-medium text-nord-4">How do I download the app?</span>
        </button>
        {#if openFAQ === 'faq2'}
          <div class="px-4 pb-4 text-nord-5">
            <p>To use this website as an app, you can install it for quick access:</p>

            <ul class="list-disc list-inside space-y-1 mt-3 mb-3">
              <li>On <strong>iPhone (Safari):</strong> tap the <strong>share icon</strong> → <strong>Add to Home Screen</strong>.</li>
              <li>On <strong>Android (Chrome/Edge):</strong> look for the <strong>Install prompt</strong>, or open the <strong>⋮ menu</strong> → <strong>Add to Home Screen / Install app</strong>.</li>
            </ul>

            <p>Once installed, you’ll find it on your home screen and can use it like a regular app.</p>
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
          <span class="font-medium text-nord-4">Is this app free to use?</span>
        </button>
        {#if openFAQ === 'faq3'}
          <div class="px-4 pb-4 text-nord-5">
            <p>
              Yes! numtags is completely free and open source. There are no subscription fees, in-app purchases, or hidden costs. The app is developed by barbershoppers for barbershoppers.            </p>
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
              Don't panic! The numeric notation is totally optional - if it makes sense to you, use it! If it doesn't, don't worry about it. If you want to learn, here are some tips to get started:
            </p>
            <ul class="list-disc list-inside space-y-1 mb-3">
              <li>Start with familiar songs you already know</li>
              <li>Practice singing the scale degrees (Do, Re, Mi, etc.)</li>
              <li>Use the search function to find easier tags first</li>
              <li>Listen to recordings while following the notation</li>
            </ul>
            <p>
              Many people find it easier than traditional sheet music once they get the hang of it!
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
      numtags is an open-source project that relies on community contributions. We welcome:    </p>
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
      href="https://github.com/bumbleblue/numtags" 
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
        href="https://github.com/bumbleblue/numtags/issues" 
        class="btn-secondary"
      >
        Report Issues
      </a>
      <a 
        href="https://github.com/bumbleblue/numtags/discussions" 
        class="btn-secondary"
      >
        Join Discussion
      </a>
    </div>
  </div>
</div>