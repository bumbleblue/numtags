<script lang="ts">
  import { onMount } from 'svelte';
  import { searchTags, getUniqueArrangers, getUniqueDifficulties, getUniqueParts, initializeSearch } from '$lib/data';
  import type { SearchFilters, SearchResult } from '$lib/types';
  import TagCard from '$lib/components/TagCard.svelte';
  import SearchFiltersComponent from '$lib/components/SearchFilters.svelte';

  let searchQuery = '';
  let searchResults: SearchResult[] = [];
  let isLoading = false;
  let difficulties: string[] = [];
  let parts: number[] = [];
  
  let filters: SearchFilters = {
    query: '',
    arranger: undefined,
    difficulty: undefined,
    parts: []
  };

  // Debug: Show data immediately
  initializeSearch();
  searchResults = searchTags({ query: '', arranger: undefined, difficulty: undefined, parts: [] });
  difficulties = getUniqueDifficulties();
  parts = getUniqueParts();

  onMount(() => {
    // Additional initialization if needed
  });

  function handleSearch() {
    isLoading = true;
    filters.query = searchQuery;
    
    setTimeout(() => {
      searchResults = searchTags(filters);
      isLoading = false;
    }, 100);
  }

  function handleFilterChange(newFilters: SearchFilters) {
    filters = { ...filters, ...newFilters };
    if (searchQuery) {
      handleSearch();
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }
</script>

<svelte:head>
  <title>Search Tags - Tagalong</title>
</svelte:head>

<div class="space-y-6">
  <!-- Hero Section -->
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">
      Find Your Perfect Barbershop Tag
    </h1>
    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
      Search through hundreds of barbershop tags with our custom numeric notation system. 
      Perfect for quartet practice and learning.
    </p>
  </div>

  <!-- Search Section -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="space-y-4">
      <!-- Search Input -->
      <div class="flex space-x-4">
        <div class="flex-1">
          <input
            type="text"
            bind:value={searchQuery}
            on:keypress={handleKeyPress}
            placeholder="Search by title, lyrics, or arranger..."
            class="search-input"
          />
        </div>
        <button 
          on:click={handleSearch}
          class="btn-primary whitespace-nowrap"
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <!-- Filters -->
      <SearchFiltersComponent 
        {difficulties}
        {parts}
        on:filterChange={(event) => handleFilterChange(event.detail)}
      />
    </div>
  </div>

  <!-- Results Section -->
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-semibold text-gray-900">
        {searchResults.length} tag{searchResults.length === 1 ? '' : 's'} found
      </h2>
    </div>
    
    {#if searchResults.length > 0}
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each searchResults as result (result.item.slug)}
          <TagCard tag={result.item} />
        {/each}
      </div>
    {:else if searchQuery && !isLoading}
      <div class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">🎵</div>
        <h3 class="text-xl font-medium text-gray-900 mb-2">No tags found</h3>
        <p class="text-gray-600">Try adjusting your search terms or filters</p>
      </div>
    {:else}
      <div class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">🎼</div>
        <h3 class="text-xl font-medium text-gray-900 mb-2">Ready to find some tags?</h3>
        <p class="text-gray-600">Start typing to search for barbershop tags</p>
      </div>
    {/if}
  </div>
</div>
