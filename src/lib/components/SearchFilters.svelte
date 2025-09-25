<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SearchFilters } from '$lib/types';
  
  export let difficulties: string[] = [];
  export let parts: number[] = [];
  
  const dispatch = createEventDispatcher();
  
  let selectedArranger = '';
  let selectedDifficulty = '';
  let selectedParts: number[] = [];
  
  function handleFilterChange() {
    const filters: SearchFilters = {
      query: '',
      arranger: selectedArranger || undefined,
      difficulty: selectedDifficulty || undefined,
      parts: selectedParts.length > 0 ? selectedParts : undefined
    };
    
    dispatch('filterChange', filters);
  }
  
  function togglePart(part: number) {
    if (selectedParts.includes(part)) {
      selectedParts = selectedParts.filter(p => p !== part);
    } else {
      selectedParts = [...selectedParts, part];
    }
    handleFilterChange();
  }
  
  function clearFilters() {
    selectedArranger = '';
    selectedDifficulty = '';
    selectedParts = [];
    handleFilterChange();
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    {#if selectedArranger || selectedDifficulty || selectedParts.length > 0}
      <button 
        on:click={clearFilters}
        class="text-sm text-nord-8 hover:text-nord-9"
      >
        Clear all
      </button>
    {/if}
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Arranger Filter -->
    <div>
      <label for="arranger" class="block text-sm font-medium text-nord-5 mb-1">
        Arranger
      </label>
      <input
        type="text"
        id="arranger"
        bind:value={selectedArranger}
        on:input={handleFilterChange}
        placeholder="Type arranger name..."
        class="w-full px-3 py-2 border border-nord-5 rounded focus:ring-2 focus:ring-nord-8 focus:border-transparent bg-nord-1 text-nord-4 placeholder-nord-5"
      />
    </div>
    
    <!-- Difficulty Filter -->
    <div>
      <label for="difficulty" class="block text-sm font-medium text-nord-5 mb-1">
        Difficulty
      </label>
      <select
        id="difficulty"
        bind:value={selectedDifficulty}
        on:change={handleFilterChange}
        class="w-full pl-3 pr-12 py-2 border border-nord-5 rounded focus:ring-2 focus:ring-nord-8 focus:border-transparent bg-nord-1 text-nord-4"
        style="padding-right: 3rem;"
      >
        <option value="">All difficulties</option>
        {#each difficulties as difficulty}
          <option value={difficulty}>{difficulty}</option>
        {/each}
      </select>
    </div>
    
    <!-- Parts Filter -->
    <div>
      <div class="block text-sm font-medium text-nord-5 mb-1">
        Parts
      </div>
      <div class="space-y-2">
        {#each parts as part}
          <label class="flex items-center">
            <input
              type="checkbox"
              checked={selectedParts.includes(part)}
              on:change={() => togglePart(part)}
              class="h-4 w-4 text-nord-8 focus:ring-nord-8 border-nord-5 rounded bg-nord-1"
            />
            <span class="ml-2 text-sm text-nord-5">{part} part{part === 1 ? '' : 's'}</span>
          </label>
        {/each}
      </div>
    </div>
  </div>
</div>