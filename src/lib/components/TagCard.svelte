<script lang="ts">
  import type { Tag } from '$lib/types';
  
  export let tag: Tag;
  
  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-start">
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-gray-900 mb-1">
          <a href="/tag/{tag.slug}" class="hover:text-primary-600 transition-colors">
            {tag.metadata.title}
          </a>
        </h3>
        <p class="text-sm text-gray-600">Tag #{tag.metadata.tag_id}</p>
      </div>
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getDifficultyColor(tag.metadata.difficulty)}">
        {tag.metadata.difficulty}
      </span>
    </div>

    <!-- Metadata -->
    <div class="space-y-2">
      <div class="flex items-center text-sm text-gray-600">
        <span class="font-medium">Arranger:</span>
        <span class="ml-1">{tag.metadata.arranger}</span>
      </div>
      
      <div class="flex items-center text-sm text-gray-600">
        <span class="font-medium">Parts:</span>
        <span class="ml-1">{tag.metadata.parts} part{tag.metadata.parts === 1 ? '' : 's'}</span>
      </div>
      
      {#if tag.metadata.original_key}
        <div class="flex items-center text-sm text-gray-600">
          <span class="font-medium">Key:</span>
          <span class="ml-1 font-mono">{tag.metadata.original_key}</span>
        </div>
      {/if}
      
      {#if tag.metadata.lyrics}
        <div class="text-sm text-gray-600">
          <span class="font-medium">Lyrics:</span>
          <span class="ml-1 italic">"{tag.metadata.lyrics}"</span>
        </div>
      {/if}
    </div>

    <!-- Preview -->
    <div class="bg-gray-50 rounded p-3">
      <pre class="tag-notation text-sm text-gray-700 overflow-hidden" style="max-height: 80px;">
{tag.content.split('\n').slice(0, 4).join('\n')}
      </pre>
    </div>

    <!-- Actions -->
    <div class="flex space-x-2">
      <a 
        href="/tag/{tag.slug}" 
        class="btn-primary text-sm flex-1 text-center"
      >
        View Tag
      </a>
      <button 
        class="btn-secondary text-sm"
        title="Share tag"
      >
        📤
      </button>
    </div>
  </div>
</div>
