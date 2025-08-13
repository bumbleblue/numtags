<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getTagBySlug } from '$lib/data';
  import type { Tag } from '$lib/types';
  import { toPng } from 'html-to-image';
  
  let tag: Tag | undefined;
  let isLoading = true;
  let shareImageUrl = '';
  let isSharing = false;
  
  onMount(() => {
    const slug = $page.params.slug;
    if (slug) {
      tag = getTagBySlug(slug);
    }
    isLoading = false;
  });
  
  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  async function shareAsImage() {
    if (!tag) return;
    
    isSharing = true;
    try {
      const element = document.getElementById('tag-content');
      if (element) {
        const dataUrl = await toPng(element, {
          backgroundColor: '#ffffff',
          width: 800,
          height: 600
        });
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
        title: tag.metadata.title,
        text: `Check out this barbershop tag: ${tag.metadata.title}`,
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
  	<title>{tag?.metadata.title || 'Tag Not Found'} - TagAlong</title>
</svelte:head>

{#if isLoading}
  <div class="flex justify-center items-center py-12">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
{:else if !tag}
  <div class="text-center py-12">
    <div class="text-gray-400 text-6xl mb-4">❌</div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Tag Not Found</h1>
    <p class="text-gray-600 mb-6">The tag you're looking for doesn't exist.</p>
    <a href="/" class="btn-primary">Back to Search</a>
  </div>
{:else}
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex justify-between items-start mb-4">
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">{tag.metadata.title}</h1>
          <p class="text-lg text-gray-600">Tag #{tag.metadata.tag_id}</p>
        </div>
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getDifficultyColor(tag.metadata.difficulty)}">
          {tag.metadata.difficulty}
        </span>
      </div>
      
      <!-- Metadata Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <span class="text-sm font-medium text-gray-700">Arranger:</span>
          <span class="ml-2 text-gray-900">{tag.metadata.arranger}</span>
        </div>
        <div>
          <span class="text-sm font-medium text-gray-700">Date Added:</span>
          <span class="ml-2 text-gray-900">{new Date(tag.metadata.date_added).toLocaleDateString()}</span>
        </div>
        <div>
          <span class="text-sm font-medium text-gray-700">Parts:</span>
          <span class="ml-2 text-gray-900">{tag.metadata.parts} part{tag.metadata.parts === 1 ? '' : 's'}</span>
        </div>
        {#if tag.metadata.source_url}
          <div>
            <span class="text-sm font-medium text-gray-700">Source:</span>
            <a href={tag.metadata.source_url} target="_blank" rel="noopener" class="ml-2 text-primary-600 hover:text-primary-700">
              View Original
            </a>
          </div>
        {/if}
      </div>
      
      {#if tag.metadata.lyrics}
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Lyrics</h3>
          <p class="text-gray-900 italic">"{tag.metadata.lyrics}"</p>
        </div>
      {/if}
      
      {#if tag.metadata.comments}
        <div class="bg-blue-50 rounded-lg p-4 mb-4">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Notes</h3>
          <p class="text-gray-900">{tag.metadata.comments}</p>
        </div>
      {/if}
      
      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button 
          on:click={shareAsImage}
          disabled={isSharing}
          class="btn-primary"
        >
          {isSharing ? 'Generating...' : '📷 Share as Image'}
        </button>
        <button 
          on:click={shareUrl}
          class="btn-secondary"
        >
          📤 Share URL
        </button>
        <a 
          href="/" 
          class="btn-secondary"
        >
          ← Back to Search
        </a>
      </div>
    </div>
    
    <!-- Tag Content -->
    <div id="tag-content" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <pre class="tag-notation text-center">{tag.content}</pre>
    </div>
  </div>
{/if}
