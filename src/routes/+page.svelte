<script lang="ts">
  import { onMount } from 'svelte';
  import { searchTags, getUniqueDifficulties, getUniqueParts, initializeSearch, getAllTags } from '$lib/data';
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

  // Initialize with all tags displayed
  difficulties = getUniqueDifficulties();
  parts = getUniqueParts();
  
  // Load all tags immediately
  const allTags = getAllTags();
  searchResults = allTags.map((tag, index) => ({
    item: tag,
    refIndex: index,
    score: 0
  }));

  function handleSearch() {
    isLoading = true;
    filters.query = searchQuery;
    
    setTimeout(() => {
      try {
        // Only initialize Fuse.js if we have a search query
        if (searchQuery.trim()) {
          initializeSearch();
        }
        searchResults = searchTags(filters);
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to simple filtering
        const allTags = getAllTags();
        searchResults = allTags.map((tag, index) => ({
          item: tag,
          refIndex: index,
          score: 0
        }));
      }
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
  <title>Search Tags - numtags</title>
</svelte:head>

<div class="space-y-6">
  <!-- Hero Section -->
  <div class="text-center">
    <h1 class="text-4xl font-bold text-nord-4 mb-4">
      Barbershop Tags in Numeric Notation
    </h1>
    <p class="text-xl text-nord-5 max-w-2xl mx-auto">
      A growing collection of barbershop tags in numeric notation, perfect for learning and teaching tags.
    </p>
  </div>

  <!-- Search Section -->
  <div class="card-bg rounded shadow-sm border p-6">
    <div class="space-y-4">
      <!-- Search Input -->
      <div class="flex space-x-4">
        <div class="flex-1">
          <input
            type="text"
            bind:value={searchQuery}
            on:keypress={handleKeyPress}
            placeholder="Search by ID, title, lyrics, or arranger..."
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
      <h2 class="text-2xl font-semibold text-nord-4">
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
        <div class="text-nord-5 text-6xl mb-4">🎵</div>
        <h3 class="text-xl font-medium text-nord-4 mb-2">No tags found</h3>
        <p class="text-nord-5">Try adjusting your search terms or filters</p>
      </div>
    {:else}
      <div class="text-center py-12">
        <div class="text-nord-5 text-6xl mb-4">🎼</div>
        <h3 class="text-xl font-medium text-nord-4 mb-2">Ready to find some tags?</h3>
        <p class="text-nord-5">Start typing to search for barbershop tags</p>
      </div>
    {/if}
  </div>
</div>
