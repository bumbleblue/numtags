<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import {
		searchTags,
		getUniqueDifficulties,
		getUniqueParts,
		refreshLocalLibrary,
		getCachedLocalTags,
	} from '$lib/data';
	import { isLocalId } from '$lib/library/db';
	import type { SearchResult } from '$lib/types';
	import TagCard from '$lib/components/TagCard.svelte';
	import SearchFiltersComponent from '$lib/components/SearchFilters.svelte';

	let searchQuery = $state('');
	let arranger = $state('');

	// Arriving with ?q= (e.g. the tag page's "Search library" bar) lands with
	// the query already applied.
	$effect(() => {
		if (!browser) return;
		const q = page.url.searchParams.get('q');
		if (q !== null) searchQuery = q;
	});
	let difficulty = $state('');
	let selectedParts = $state<number[]>([]);

	/** Bumped whenever the local library refreshes so the search re-runs. */
	let libraryVersion = $state(0);
	let libraryError = $state(false);

	// Library refresh (§7.1: catalog renders instantly from the bundle; the
	// local library joins quietly once IndexedDB answers — never an error page).
	$effect(() => {
		if (!browser) return;
		refreshLocalLibrary().then(({ ok }) => {
			libraryError = !ok;
			libraryVersion++;
		});
	});

	const difficulties = $derived.by(() => {
		void libraryVersion;
		return getUniqueDifficulties();
	});
	const parts = $derived.by(() => {
		void libraryVersion;
		return getUniqueParts();
	});

	const results: SearchResult[] = $derived.by(() => {
		void libraryVersion;
		return searchTags({
			query: searchQuery,
			arranger: arranger || undefined,
			difficulty: difficulty || undefined,
			parts: selectedParts.length > 0 ? selectedParts : undefined,
		});
	});

	const localResults = $derived(results.filter((r) => isLocalId(r.item.metadata.tag_id)));
	const catalogResults = $derived(results.filter((r) => !isLocalId(r.item.metadata.tag_id)));

	const hasFilters = $derived(
		searchQuery.trim() !== '' || arranger !== '' || difficulty !== '' || selectedParts.length > 0,
	);

	// Distinguish "nothing imported ever" from "filtered out by the search".
	const anyLocalAtAll = $derived.by(() => {
		void libraryVersion;
		return getCachedLocalTags().length > 0;
	});

	function clearAll() {
		searchQuery = '';
		arranger = '';
		difficulty = '';
		selectedParts = [];
	}
</script>

<svelte:head>
	<title>Library - numtags</title>
</svelte:head>

<div class="space-y-6">
	<!-- Hero -->
	<div class="text-center">
		<h1 class="text-3xl sm:text-4xl font-bold text-nord-4 mb-3">
			Barbershop Tags in Numeric Notation
		</h1>
		<p class="text-lg text-nord-5 max-w-2xl mx-auto mb-5">
			A growing collection of barbershop tags in numeric notation, perfect for learning and
			teaching tags.
		</p>
		<a
			href="/import"
			class="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-base"
		>
			<span class="text-xl leading-none" aria-hidden="true">+</span>
			Import / Write a tag
		</a>
	</div>

	<!-- Search + filters -->
	<div class="card-bg rounded border p-4 sm:p-6">
		<div class="space-y-4">
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search by ID, title, lyrics, or arranger..."
				class="search-input min-h-[44px]"
				aria-label="Search tags"
			/>
			<SearchFiltersComponent {difficulties} {parts} bind:arranger bind:difficulty bind:selectedParts />
		</div>
	</div>

	{#if libraryError}
		<p class="text-sm text-nord-13 text-center">
			Couldn't read your local library — showing the catalog only.
		</p>
	{/if}

	<!-- Your tags (local imports & drafts) -->
	<section class="space-y-4 border-t border-nord-2 pt-6">
		<h2 class="text-xl sm:text-2xl font-semibold text-nord-4">Your tags</h2>
		{#if localResults.length > 0}
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each localResults as result (result.item.metadata.tag_id)}
					<TagCard tag={result.item} />
				{/each}
			</div>
		{:else if anyLocalAtAll}
			<p class="text-sm text-nord-5">None of your tags match the current search.</p>
		{:else}
			<div class="card-bg rounded border border-dashed border-nord-3 p-6 text-center">
				<p class="text-nord-5 mb-3">
					Nothing of your own yet — import a file or write a tag from scratch. It stays private on
					this device.
				</p>
				<a
					href="/import"
					class="btn-secondary inline-flex items-center justify-center min-h-[44px] px-5"
				>
					Import or write a tag
				</a>
			</div>
		{/if}
	</section>

	<!-- Catalog -->
	<section class="space-y-4 border-t border-nord-2 pt-6">
		<div class="flex justify-between items-center">
			<h2 class="text-xl sm:text-2xl font-semibold text-nord-4">
				Catalog
				<span class="text-base font-normal text-nord-5 ml-1">
					{catalogResults.length} tag{catalogResults.length === 1 ? '' : 's'}
				</span>
			</h2>
		</div>

		{#if catalogResults.length > 0}
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each catalogResults as result (result.item.metadata.tag_id)}
					<TagCard tag={result.item} />
				{/each}
			</div>
		{:else if hasFilters}
			<div class="text-center py-12">
				<h3 class="text-xl font-medium text-nord-4 mb-2">No tags match</h3>
				<p class="text-nord-5 mb-4">Try different search terms, or start over.</p>
				<button onclick={clearAll} class="btn-secondary min-h-[44px] px-5">Clear filters</button>
			</div>
		{:else}
			<p class="text-nord-5 text-center py-8">The catalog is empty.</p>
		{/if}
	</section>
</div>
