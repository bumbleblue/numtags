<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { toPng } from 'html-to-image';
	import { getTagByIdAsync } from '$lib/data';
	import { isLocalId, deleteLocalTag } from '$lib/library/db';
	import { settings, recallLayout, rememberLayout, type LayoutMode } from '$lib/settings.svelte';
	import type { Tag } from '$lib/types';
	import NotationRenderer from '$lib/components/notation/NotationRenderer.svelte';
	import OriginBadge from '$lib/components/OriginBadge.svelte';

	const id = $derived(parseInt($page.params.id ?? '', 10));
	const local = $derived(!isNaN(id) && isLocalId(id));

	let tag = $state<Tag | undefined>(undefined);
	let isLoading = $state(true);
	let layout = $state<LayoutMode>('wrapped');
	let isSharing = $state(false);
	let isDeleting = $state(false);
	let notationEl: HTMLElement | undefined = $state();

	// Load the tag: catalog ids resolve instantly; local ids read IndexedDB.
	// $effect only runs in the browser, so SSR shows the loading state and
	// never touches IndexedDB (§7.1: brief loading, never a blank screen).
	$effect(() => {
		if (isNaN(id)) {
			tag = undefined;
			isLoading = false;
			return;
		}
		isLoading = true;
		getTagByIdAsync(id).then((t) => {
			tag = t;
			isLoading = false;
		});
	});

	$effect(() => {
		if (browser) layout = recallLayout();
	});

	function setLayout(mode: LayoutMode) {
		layout = mode;
		rememberLayout(mode);
	}

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

	const editHref = $derived(local ? `/review?local=${id}` : `/review?catalog=${id}`);

	async function shareAsImage() {
		if (!tag || !notationEl) return;
		isSharing = true;
		try {
			const dataUrl = await toPng(notationEl, {
				backgroundColor: '#2e3440', // nord-0 — keep the rendered look
				pixelRatio: 2,
			});
			const link = document.createElement('a');
			link.download = `${tag.metadata.title.replace(/\s+/g, '-')}.png`;
			link.href = dataUrl;
			link.click();
		} catch (error) {
			console.error('Error generating image:', error);
		} finally {
			isSharing = false;
		}
	}

	function shareUrl() {
		if (navigator.share && tag) {
			navigator.share({ url: window.location.href });
		} else {
			navigator.clipboard.writeText(window.location.href);
		}
	}

	async function handleDelete() {
		if (!tag || !local) return;
		if (!confirm(`Delete “${tag.metadata.title}” from your library? This can't be undone.`)) return;
		isDeleting = true;
		try {
			await deleteLocalTag(id);
			goto('/');
		} catch (error) {
			console.error('Error deleting tag:', error);
			isDeleting = false;
		}
	}
</script>

<svelte:head>
	<title>{tag?.metadata.title || 'Tag'} - numtags</title>
</svelte:head>

{#if isLoading}
	<div class="flex flex-col items-center justify-center py-12 gap-3">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-nord-8"></div>
		<p class="text-sm text-nord-5">Loading tag…</p>
	</div>
{:else if !tag}
	<div class="text-center py-12">
		<h1 class="text-2xl font-bold text-nord-4 mb-2">This tag doesn't exist or was removed</h1>
		<p class="text-nord-5 mb-6">It may have been deleted, or the link is wrong.</p>
		<a href="/" class="btn-primary inline-flex items-center justify-center min-h-[44px] px-6">
			Back to Library
		</a>
	</div>
{:else}
	<div class="max-w-4xl mx-auto">
		<!-- Title -->
		<div class="text-center mb-6">
			<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-nord-4 mb-2">
				{tag.metadata.title}
			</h1>
			<p class="text-lg text-nord-5">
				{local ? 'Your tag' : `Tag #${tag.metadata.tag_id}`}
			</p>
		</div>

		<!-- Layout toggle (§8.3) -->
		<div class="flex justify-center mb-4">
			<div
				class="inline-flex rounded border border-nord-3 overflow-hidden"
				role="group"
				aria-label="Notation layout"
			>
				<button
					onclick={() => setLayout('wrapped')}
					class="px-5 min-h-[44px] text-sm font-medium transition-colors {layout === 'wrapped'
						? 'bg-nord-8 text-nord-0'
						: 'bg-nord-1 text-nord-5 hover:text-nord-4'}"
					aria-pressed={layout === 'wrapped'}
				>
					Wrapped
				</button>
				<button
					onclick={() => setLayout('continuous')}
					class="px-5 min-h-[44px] text-sm font-medium transition-colors {layout === 'continuous'
						? 'bg-nord-8 text-nord-0'
						: 'bg-nord-1 text-nord-5 hover:text-nord-4'}"
					aria-pressed={layout === 'continuous'}
				>
					Scroll
				</button>
			</div>
		</div>

		<!-- Notation -->
		<div bind:this={notationEl} class="card-bg rounded shadow-sm border p-3 sm:p-5 mb-6">
			<NotationRenderer body={tag.content} mode={layout} fontScale={settings.fontScale} />
		</div>

		<!-- Actions -->
		<div class="flex flex-wrap justify-center gap-3 mb-8">
			<a href={editHref} class="btn-primary min-h-[44px] inline-flex items-center px-5"> Edit </a>
			<button
				onclick={shareAsImage}
				disabled={isSharing}
				class="btn-secondary min-h-[44px] px-5"
			>
				{isSharing ? 'Generating…' : 'Share as Image'}
			</button>
			<button onclick={shareUrl} class="btn-secondary min-h-[44px] px-5"> Share URL </button>
			{#if local}
				<button
					onclick={handleDelete}
					disabled={isDeleting}
					class="min-h-[44px] px-5 rounded font-medium bg-nord-11 bg-opacity-20 text-nord-11 hover:bg-opacity-30 transition-colors"
				>
					{isDeleting ? 'Deleting…' : 'Delete'}
				</button>
			{/if}
			<a href="/" class="btn-secondary min-h-[44px] inline-flex items-center px-5">
				← Back to Library
			</a>
		</div>

		<!-- Metadata -->
		<div class="card-bg rounded shadow-sm border p-6">
			<div class="flex justify-between items-start mb-6 gap-2">
				<h2 class="text-2xl font-semibold text-nord-4">Tag Information</h2>
				<div class="flex flex-col items-end gap-1.5">
					<span
						class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getDifficultyColor(
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

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div>
					<span class="text-sm font-medium text-nord-5">Arranger:</span>
					<span class="ml-2 text-nord-4">{tag.metadata.arranger}</span>
				</div>
				<div>
					<span class="text-sm font-medium text-nord-5">Date Added:</span>
					<span class="ml-2 text-nord-4">
						{new Date(tag.metadata.date_added).toLocaleDateString()}
					</span>
				</div>
				<div>
					<span class="text-sm font-medium text-nord-5">Parts:</span>
					<span class="ml-2 text-nord-4">
						{tag.metadata.parts} part{tag.metadata.parts === 1 ? '' : 's'}
					</span>
				</div>
				{#if tag.metadata.original_key}
					<div>
						<span class="text-sm font-medium text-nord-5">Original Key:</span>
						<span class="ml-2 text-nord-4 font-mono">{tag.metadata.original_key}</span>
					</div>
				{/if}
				{#if tag.metadata.source_url}
					<div>
						<span class="text-sm font-medium text-nord-5">Source:</span>
						<a
							href={tag.metadata.source_url}
							target="_blank"
							rel="noopener"
							class="ml-2 text-nord-8 hover:text-nord-9"
						>
							View Original
						</a>
					</div>
				{/if}
			</div>

			{#if tag.metadata.lyrics}
				<div class="bg-nord-2 rounded p-4 mb-4">
					<h3 class="text-sm font-medium text-nord-5 mb-2">Lyrics</h3>
					<p class="text-nord-4 italic">“{tag.metadata.lyrics}”</p>
				</div>
			{/if}

			{#if tag.metadata.comments}
				<div class="bg-nord-2 rounded p-4">
					<h3 class="text-sm font-medium text-nord-5 mb-2">Notes</h3>
					<p class="text-nord-4">{tag.metadata.comments}</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
