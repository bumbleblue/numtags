<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  let deferredPrompt: any;
  let showInstallButton = false;
  
  onMount(() => {
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton = true;
    });
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  });
  
  function installPWA() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        showInstallButton = false;
      });
    }
  }
</script>

<svelte:head>
  		<title>TagAlong - Barbershop Tags</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <a href="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">T</span>
            </div>
            				<span class="text-xl font-bold text-gray-900">TagAlong</span>
          </a>
        </div>
        
        <nav class="flex items-center space-x-4">
          <a href="/" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
            Search
          </a>
          <a href="/about" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
            About
          </a>
          {#if showInstallButton}
            <button 
              on:click={installPWA}
              class="btn-primary text-sm"
            >
              Install App
            </button>
          {/if}
        </nav>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t border-gray-200 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center text-gray-500 text-sm">
        			<p>TagAlong - Learn and share barbershop tags</p>
        <p class="mt-2">
          <a href="https://github.com/your-username/tag-along" class="text-primary-600 hover:text-primary-700">
            Open Source on GitHub
          </a>
        </p>
      </div>
    </div>
  </footer>
</div>
