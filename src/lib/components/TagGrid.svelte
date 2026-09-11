<!--
	TagGrid — a paged grid of TagCards. Only `pageSize` cards render at first;
	"Show more" reveals the next page. Rendering the whole catalog at once was
	335 notation previews (~180k DOM nodes, a 12.6 MB page) — more than iOS
	Safari's per-page memory budget, which kills the tab ("A problem
	repeatedly occurred"). Paging restarts whenever the result list changes.
-->
<script lang="ts">
	import type { SearchResult } from '$lib/types';
	import TagCard from './TagCard.svelte';

	interface Props {
		results: SearchResult[];
		/** Cards shown initially and added per "Show more". */
		pageSize?: number;
		/** Leading cards whose notation preview renders immediately (server too). */
		eager?: number;
	}

	let { results, pageSize = 24, eager = 6 }: Props = $props();

	/** Pages revealed beyond the first. */
	let extraPages = $state(0);

	// A new result list (typing in the search, a filter, the local library
	// arriving) starts again from the first page.
	$effect.pre(() => {
		void results;
		extraPages = 0;
	});

	const visible = $derived(results.slice(0, pageSize * (1 + extraPages)));
	const remaining = $derived(results.length - visible.length);
</script>

<!-- grid-cols-1 = minmax(0, 1fr): an oversize measure scrolls inside its card
     instead of stretching the single mobile column to the measure's width. -->
<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
	{#each visible as result, i (result.item.metadata.tag_id)}
		<TagCard tag={result.item} eager={i < eager} />
	{/each}
</div>

{#if remaining > 0}
	<div class="flex flex-col items-center gap-2 pt-2">
		<button onclick={() => extraPages++} class="btn-secondary min-h-[44px] px-6">
			Show {Math.min(pageSize, remaining)} more
		</button>
		<p class="text-sm text-ink-muted">{visible.length} of {results.length} shown</p>
	</div>
{/if}
