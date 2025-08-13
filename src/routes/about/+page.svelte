<script lang="ts">
  // About page content
</script>

<svelte:head>
  	<title>About - TagAlong</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8">
  <!-- Hero Section -->
  <div class="text-center">
    		<h1 class="text-4xl font-bold text-gray-900 mb-4">About TagAlong</h1>
    <p class="text-xl text-gray-600">
      A Progressive Web App for learning and sharing barbershop tags
    </p>
  </div>

  <!-- What is Tagalong -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    		<h2 class="text-2xl font-semibold text-gray-900 mb-4">What is TagAlong?</h2>
    <p class="text-gray-700 mb-4">
      		TagAlong is a mobile-first web application designed specifically for barbershop singers to quickly find, 
      learn, and share barbershop tags. Tags are short, harmonically rich pieces of music meant for 
      spontaneous group singing.
    </p>
    <p class="text-gray-700">
      Our app uses a custom numeric notation system that makes it easy to read and learn tags on any device, 
      with a clean, searchable database that grows through community contributions.
    </p>
  </div>

  <!-- Numeric Notation -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">Numeric Notation System</h2>
    <p class="text-gray-700 mb-4">
      		TagAlong uses a simple numeric notation system where numbers represent scale degrees:
    </p>
    
    <div class="bg-gray-50 rounded-lg p-4 mb-4">
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
    
    <p class="text-gray-700 mb-4">
      Each line represents a different voice part (Lead, Bass, Baritone, Tenor), and the numbers 
      show which scale degree to sing. This system makes it easy to learn tags quickly without 
      needing to read traditional sheet music.
    </p>
    
    <div class="bg-blue-50 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-2">Example:</h3>
      <pre class="tag-notation text-sm">
Lead: 1 3 5 1
Bass: 1 1 3 1
Baritone: 3 3 3 3
Tenor: 5 5 5 5
      </pre>
    </div>
  </div>

  <!-- Features -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">Key Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">🔍 Smart Search</h3>
        <p class="text-gray-700">Search by title, lyrics, arranger, or notation content with instant results.</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">📱 Mobile First</h3>
        <p class="text-gray-700">Optimized for mobile devices with responsive design and PWA capabilities.</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">🖼️ Share as Image</h3>
        <p class="text-gray-700">Generate beautiful images of tags to share on social media or messaging apps.</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">⚡ Offline Ready</h3>
        <p class="text-gray-700">Works offline once loaded, perfect for rehearsals without internet access.</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">🎯 Filter & Sort</h3>
        <p class="text-gray-700">Filter by difficulty, arranger, or parts to find exactly what you need.</p>
      </div>
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">🌐 Open Source</h3>
        <p class="text-gray-700">Community-driven with open contribution guidelines and transparent development.</p>
      </div>
    </div>
  </div>

  <!-- Contributing -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">Contributing</h2>
    <p class="text-gray-700 mb-4">
      		TagAlong is an open-source project that thrives on community contributions. We welcome:
    </p>
    <ul class="list-disc list-inside text-gray-700 space-y-2 mb-4">
      <li>New tag submissions in our numeric notation format</li>
      <li>Improvements to existing tag metadata</li>
      <li>Bug reports and feature suggestions</li>
      <li>Code contributions and improvements</li>
    </ul>
    <p class="text-gray-700 mb-4">
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
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
    <p class="text-gray-700 mb-4">
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
