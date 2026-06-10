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
				return 'bg-nord-14 bg-opacity-20 text-nord-14';
			case 'Medium':
				return 'bg-nord-13 bg-opacity-20 text-nord-13';
			case 'Hard':
				return 'bg-nord-11 bg-opacity-20 text-nord-11';
			default:
				return 'bg-nord-2 text-nord-4';
		}
	}
</script>

<div class="card-bg rounded shadow-sm border p-6 hover:shadow-md transition-shadow duration-200">
	<div class="space-y-4">
		<!-- Header -->
		<div class="flex justify-between items-start gap-2">
			<div class="flex-1 min-w-0">
				<h3 class="text-lg font-semibold text-nord-4 mb-1">
					<a href="/tag/id/{tag.metadata.tag_id}" class="hover:text-nord-8 transition-colors">
						{tag.metadata.title}
					</a>
				</h3>
				<p class="text-sm text-nord-5">
					{local ? 'Your tag' : `Tag #${tag.metadata.tag_id}`}
				</p>
			</div>
			<div class="flex flex-col items-end gap-1.5">
				<span
					class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getDifficultyColor(
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
				class="btn-primary text-sm flex-1 text-center min-h-[44px] flex items-center justify-center"
			>
				View Tag
			</a>
		</div>
	</div>
</div>
