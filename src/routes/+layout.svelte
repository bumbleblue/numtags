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
  		<title>numtags - Barbershop Tags</title>
</svelte:head>

<div class="min-h-screen bg-nord-0">
  <!-- Header -->
  <header class="card-bg shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <a href="/" class="flex items-center space-x-2">
            <img src="/numtag-logo.svg" alt="TagAlong Logo" class="w-8 h-8" />
            	<span class="text-xl font-bold text-nord-4">numtags</span>
          </a>
        </div>
        
        <nav class="flex items-center space-x-4">
          <a href="/" class="text-nord-5 hover:text-nord-4 px-3 py-2 rounded text-sm font-medium">
            Search
          </a>
          <a href="/notation" class="text-nord-5 hover:text-nord-4 px-3 py-2 rounded text-sm font-medium">
            Notation
          </a>
          <a href="/about" class="text-nord-5 hover:text-nord-4 px-3 py-2 rounded text-sm font-medium">
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
  <footer class="card-bg border-t mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center text-nord-5 text-sm">
        <p>numtags - Learn and share barbershop tags</p>
        <div class="mt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
          <a href="https://github.com/bumbleblue/numtags" class="text-nord-8 hover:text-nord-9">
            Open Source on GitHub
          </a>
          <span class="text-nord-4">•</span>
          <a href="/impressum" class="text-nord-8 hover:text-nord-9">
            Impressum
          </a>
        </div>
      </div>
    </div>
  </footer>
</div>
