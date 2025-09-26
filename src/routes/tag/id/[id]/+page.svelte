<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getTagById } from '$lib/data';
  import type { Tag } from '$lib/types';
  import { toPng } from 'html-to-image';
  
  let tag: Tag | undefined;
  let isLoading = true;
  let shareImageUrl = '';
  let isSharing = false;
  
  onMount(() => {
    const id = parseInt($page.params.id);
    if (id) {
      tag = getTagById(id);
    }
    isLoading = false;
  });
  
  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy': return 'bg-nord-14 bg-opacity-20 text-nord-14';
      case 'Medium': return 'bg-nord-13 bg-opacity-20 text-nord-13';
      case 'Hard': return 'bg-nord-11 bg-opacity-20 text-nord-11';
      default: return 'bg-nord-2 text-nord-4';
    }
  }
  
  async function shareAsImage() {
    if (!tag) return;
    
    isSharing = true;
    try {
      const element = document.getElementById('tag-content');
      if (element) {
        // Add a temporary class to make all text black for image generation
        element.classList.add('image-generation');
        
        const dataUrl = await toPng(element, {
          backgroundColor: '#ffffff',
          width: 800,
          height: 600
        });
        
        // Remove the temporary class
        element.classList.remove('image-generation');
        
        shareImageUrl = dataUrl;
        
        // Create download link
        const link = document.createElement('a');
        link.download = `${tag.metadata.title.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      isSharing = false;
    }
  }
  
  function shareUrl() {
    if (navigator.share && tag) {
      navigator.share({
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could add a toast notification here
    }
  }
</script>

<svelte:head>
  	<title>{tag?.metadata.title || 'Tag Not Found'} - numtags</title>
</svelte:head>

{#if isLoading}
  <div class="flex justify-center items-center py-12">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
{:else if !tag}
  <div class="text-center py-12">
    <div class="text-nord-5 text-6xl mb-4">❌</div>
    <h1 class="text-2xl font-bold text-nord-4 mb-2">Tag Not Found</h1>
    <p class="text-nord-5 mb-6">The tag you're looking for doesn't exist.</p>
    <a href="/" class="btn-primary">Back to Search</a>
  </div>
{:else}
  <div class="max-w-4xl mx-auto">
    <!-- Title and ID Header -->
    <div class="text-center mb-8">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-nord-4 mb-2">{tag.metadata.title}</h1>
      <p class="text-lg sm:text-xl text-nord-5">Tag #{tag.metadata.tag_id}</p>
    </div>
    
    <!-- Tag Content -->
    <div id="tag-content" class="card-bg rounded shadow-sm border p-4 sm:p-6 lg:p-8 mb-8">
      <div class="tag-notation text-left text-sm sm:text-base lg:text-lg">
        {#each tag.content.split('\n\n') as staff}
          <div class="staff-section">
            {#each staff.split('\n').filter(line => line.trim()) as line, index}
              {#if line.startsWith('|')}
                <!-- Voice part -->
                <div class="voice-line">{line}</div>
              {:else if !line.startsWith('//')}
                <!-- Lyrics -->
                <div class="lyrics-line">{line}</div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row justify-center gap-3 mb-8">
      <button 
        on:click={shareAsImage}
        disabled={isSharing}
        class="btn-primary"
      >
        {isSharing ? 'Generating...' : 'Share as Image'}
      </button>
      <button 
        on:click={shareUrl}
        class="btn-secondary"
      >
        Share URL
      </button>
      <a 
        href="/" 
        class="btn-secondary"
      >
        ← Back to Search
      </a>
    </div>
    
    <!-- Metadata Section -->
    <div class="card-bg rounded shadow-sm border p-6">
      <div class="flex justify-between items-start mb-6">
        <h2 class="text-2xl font-semibold text-nord-4">Tag Information</h2>
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getDifficultyColor(tag.metadata.difficulty)}">
          {tag.metadata.difficulty}
        </span>
      </div>
      
      <!-- Metadata Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <span class="text-sm font-medium text-nord-5">Arranger:</span>
          <span class="ml-2 text-nord-4">{tag.metadata.arranger}</span>
        </div>
        <div>
          <span class="text-sm font-medium text-nord-5">Date Added:</span>
          <span class="ml-2 text-nord-4">{new Date(tag.metadata.date_added).toLocaleDateString()}</span>
        </div>
        <div>
          <span class="text-sm font-medium text-nord-5">Parts:</span>
          <span class="ml-2 text-nord-4">{tag.metadata.parts} part{tag.metadata.parts === 1 ? '' : 's'}</span>
        </div>
        {#if tag.metadata.original_key}
          <div>
            <span class="text-sm font-medium text-nord-5">Original Key:</span>
            <span class="ml-2 text-nord-4 font-mono">{tag.metadata.original_key}</span>
          </div>
        {/if}
        {#if tag.metadata.source_url}
          <div>
            <span class="text-sm font-medium text-nord-5">Source:</span>
            <a href={tag.metadata.source_url} target="_blank" rel="noopener" class="ml-2 text-nord-8 hover:text-nord-9">
              View Original
            </a>
          </div>
        {/if}
      </div>
      
      {#if tag.metadata.lyrics}
        <div class="bg-nord-2 rounded p-4 mb-4">
          <h3 class="text-sm font-medium text-nord-5 mb-2">Lyrics</h3>
          <p class="text-nord-4 italic">"{tag.metadata.lyrics}"</p>
        </div>
      {/if}
      
      {#if tag.metadata.comments}
        <div class="bg-nord-2 rounded p-4">
          <h3 class="text-sm font-medium text-nord-5 mb-2">Notes</h3>
          <p class="text-nord-4">{tag.metadata.comments}</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
