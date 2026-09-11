<script lang="ts">
	import type { Tag } from '$lib/types';
	import { isLocalId } from '$lib/library/db';
	import NotationRenderer from '$lib/components/notation/NotationRenderer.svelte';
	import OriginBadge from '$lib/components/OriginBadge.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	interface Props {
		tag: Tag;
		/** Render the notation preview at once (server included) instead of when the card scrolls near the viewport. */
		eager?: boolean;
	}

	let { tag, eager = false }: Props = $props();

	const local = $derived(isLocalId(tag.metadata.tag_id));

	// The preview is the expensive part of a card (a few hundred DOM nodes, a
	// parsed tag, a ResizeObserver). Off-screen cards keep a same-sized
	// placeholder until they come within a screen of the viewport.
	let previewHost: HTMLAnchorElement | undefined = $state();
	let revealed = $state(false);
	const showPreview = $derived(eager || revealed);

	$effect(() => {
		if (showPreview || !previewHost) return;
		if (typeof IntersectionObserver === 'undefined') {
			revealed = true;
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					revealed = true;
					io.disconnect();
				}
			},
			{ rootMargin: '100% 0px' },
		);
		io.observe(previewHost);
		return () => io.disconnect();
	});

	function getDifficultyColor(difficulty: string) {
		switch (difficulty) {
			case 'Easy':
				return 'border-success text-success';
			case 'Medium':
				return 'border-note text-note';
			case 'Hard':
				return 'border-danger text-danger';
			default:
				return 'border-paper-3 text-ink-muted';
		}
	}
</script>

<div class="card-bg rounded border p-4 sm:p-6 hover:border-ink-muted transition-colors duration-200">
	<div class="space-y-4">
		<!-- Header: the number is the identity, JD-style -->
		<div>
			<h3 class="text-lg font-semibold text-ink mb-1.5">
				<a href="/tag/id/{tag.metadata.tag_id}" class="hover:underline underline-offset-4">
					{tag.metadata.title}
				</a>
			</h3>
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="inline-flex items-center border border-paper-3 rounded px-1.5 py-0.5 text-xs text-ink-muted">
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
				<StatusBadge status={tag.metadata.status} />
			</div>
		</div>

		<!-- Metadata -->
		<div class="space-y-1.5">
			<div class="flex items-center text-sm text-ink-muted">
				<span class="font-medium">Arranger:</span>
				<span class="ml-1">{tag.metadata.arranger}</span>
			</div>

			<div class="flex items-center text-sm text-ink-muted">
				<span class="font-medium">Parts:</span>
				<span class="ml-1">{tag.metadata.parts} part{tag.metadata.parts === 1 ? '' : 's'}</span>
				{#if tag.metadata.original_key}
					<span class="ml-3 font-medium">Key:</span>
					<span class="ml-1 font-mono">{tag.metadata.original_key}</span>
				{/if}
			</div>

			{#if tag.metadata.lyrics}
				<div class="text-sm text-ink-muted truncate">
					<span class="italic">“{tag.metadata.lyrics}”</span>
				</div>
			{/if}
		</div>

		<!-- Preview: first measures, lyrics hidden (NotationRenderer maxMeasures).
		     Fixed height so the placeholder → preview swap never shifts the grid. -->
		<a
			href="/tag/id/{tag.metadata.tag_id}"
			bind:this={previewHost}
			class="block rounded overflow-hidden h-[150px]"
			aria-label="Open {tag.metadata.title}"
		>
			{#if showPreview}
				<NotationRenderer body={tag.content} mode="wrapped" maxMeasures={3} fontScale={0.7} />
			{:else}
				<div class="h-full rounded-sm border border-paper-3 bg-paper-0" aria-hidden="true"></div>
			{/if}
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
