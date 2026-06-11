<script lang="ts">
	import type { Tag } from '$lib/types';
	import { isLocalId } from '$lib/library/db';
	import NotationRenderer from '$lib/components/notation/NotationRenderer.svelte';
	import OriginBadge from '$lib/components/OriginBadge.svelte';

	interface Props {
		tag: Tag;
	}

	let { tag }: Props = $props();

	const local = $derived(isLocalId(tag.metadata.tag_id));

	function getDifficultyColor(difficulty: string) {
		switch (difficulty) {
			case 'Easy':
				return 'border-nord-14 text-nord-14';
			case 'Medium':
				return 'border-nord-13 text-nord-13';
			case 'Hard':
				return 'border-nord-11 text-nord-11';
			default:
				return 'border-nord-3 text-nord-5';
		}
	}
</script>

<div class="card-bg rounded border p-4 sm:p-6 hover:border-nord-5 transition-colors duration-200">
	<div class="space-y-4">
		<!-- Header: the number is the identity, JD-style -->
		<div>
			<h3 class="text-lg font-semibold text-nord-4 mb-1.5">
				<a href="/tag/id/{tag.metadata.tag_id}" class="hover:underline underline-offset-4">
					{tag.metadata.title}
				</a>
			</h3>
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="inline-flex items-center border border-nord-3 rounded px-1.5 py-0.5 text-xs text-nord-5">
					{local ? 'yours' : `#${tag.metadata.tag_id}`}
				</span>
				<span
					class="inline-flex items-center border rounded px-1.5 py-0.5 text-xs {getDifficultyColor(
						tag.metadata.difficulty,
					)}"
				>
					{tag.metadata.difficulty}
				</span>
				{#if local}
					<OriginBadge origin={tag.metadata.origin ?? 'authored'} />
				{/if}
			</div>
		</div>

		<!-- Metadata -->
		<div class="space-y-1.5">
			<div class="flex items-center text-sm text-nord-5">
				<span class="font-medium">Arranger:</span>
				<span class="ml-1">{tag.metadata.arranger}</span>
			</div>

			<div class="flex items-center text-sm text-nord-5">
				<span class="font-medium">Parts:</span>
				<span class="ml-1">{tag.metadata.parts} part{tag.metadata.parts === 1 ? '' : 's'}</span>
				{#if tag.metadata.original_key}
					<span class="ml-3 font-medium">Key:</span>
					<span class="ml-1 font-mono">{tag.metadata.original_key}</span>
				{/if}
			</div>

			{#if tag.metadata.lyrics}
				<div class="text-sm text-nord-5 truncate">
					<span class="italic">“{tag.metadata.lyrics}”</span>
				</div>
			{/if}
		</div>

		<!-- Preview: first measures, lyrics hidden (NotationRenderer maxMeasures) -->
		<a
			href="/tag/id/{tag.metadata.tag_id}"
			class="block rounded overflow-hidden"
			style="max-height: 150px;"
			aria-label="Open {tag.metadata.title}"
		>
			<NotationRenderer body={tag.content} mode="wrapped" maxMeasures={3} fontScale={0.7} />
		</a>

		<!-- Actions -->
		<div class="flex">
			<a
				href="/tag/id/{tag.metadata.tag_id}"
				class="btn-secondary text-sm flex-1 text-center min-h-[44px] flex items-center justify-center"
			>
				View tag
			</a>
		</div>
	</div>
</div>
