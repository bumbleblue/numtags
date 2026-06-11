<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { toPng } from 'html-to-image';
	import { getTagByIdAsync } from '$lib/data';
	import { isLocalId, deleteLocalTag } from '$lib/library/db';
	import { settings, recallLayout, rememberLayout, type LayoutMode } from '$lib/settings.svelte';
	import type { Tag } from '$lib/types';
	import { parse } from '$lib/notation/parse';
	import { player } from '$lib/audio/player.svelte';
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

	/* ── Playback (§6.9): one parsed model shared by renderer + player ──── */
	const parsed = $derived(tag ? parse(tag.content) : null);
	const playingHere = $derived(parsed !== null && player.playing?.token === parsed);
	const playingAll = $derived(playingHere && player.playing?.mode === 'all');
	const playingVoice = $derived(
		playingHere && typeof player.playing?.mode === 'number' ? player.playing.mode : null,
	);

	function togglePlayAll() {
		if (parsed) player.toggle(parsed, tag?.metadata.original_key, 'all');
	}

	function togglePlayVoice(voice: number) {
		if (parsed) player.toggle(parsed, tag?.metadata.original_key, voice);
	}

	// Leaving the page stops the audio.
	$effect(() => () => player.stop());

	// Three notation sizes for the view-settings rail (persisted app-wide).
	const FONT_SIZES = [
		{ value: 0.85, label: 'Small', glyph: '0.7rem' },
		{ value: 1, label: 'Default', glyph: '0.9rem' },
		{ value: 1.15, label: 'Large', glyph: '1.15rem' },
	];

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

	const editHref = $derived(local ? `/review?local=${id}` : `/review?catalog=${id}`);

	async function shareAsImage() {
		if (!tag || !notationEl) return;
		isSharing = true;
		try {
			const dataUrl = await toPng(notationEl, {
				// page background — read live so palette swaps can't strand this hex
				backgroundColor:
					getComputedStyle(document.documentElement).getPropertyValue('--paper-0').trim() ||
					'#151515',
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

	// "Search library" at the bottom doubles as the way back to the library.
	let searchInput = $state('');

	function searchLibrary(e: SubmitEvent) {
		e.preventDefault();
		const q = searchInput.trim();
		goto(q ? `/?q=${encodeURIComponent(q)}` : '/');
	}
</script>

{#snippet iconWrapped()}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<line x1="3" y1="6" x2="21" y2="6" />
		<path d="M3 12h15a3 3 0 1 1 0 6h-4" />
		<polyline points="16 16 14 18 16 20" />
		<line x1="3" y1="18" x2="10" y2="18" />
	</svg>
{/snippet}

{#snippet iconScroll()}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<polyline points="18 8 22 12 18 16" />
		<polyline points="6 8 2 12 6 16" />
		<line x1="2" y1="12" x2="22" y2="12" />
	</svg>
{/snippet}

{#snippet iconImage()}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<rect x="3" y="3" width="18" height="18" rx="2" />
		<circle cx="9" cy="9" r="2" />
		<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
	</svg>
{/snippet}

{#snippet iconLink()}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
	</svg>
{/snippet}

{#snippet iconPlay()}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<polygon points="7 5 19 12 7 19 7 5" />
	</svg>
{/snippet}

{#snippet iconStop()}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<rect x="6" y="6" width="12" height="12" rx="1" />
	</svg>
{/snippet}


<svelte:head>
	<title>{tag?.metadata.title || 'Tag'} - numtags</title>
</svelte:head>

{#if isLoading}
	<div class="flex flex-col items-center justify-center py-12 gap-3">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
		<p class="text-sm text-ink-muted">Loading tag…</p>
	</div>
{:else if !tag}
	<div class="text-center py-12">
		<h1 class="text-2xl font-bold text-ink mb-2">This tag doesn't exist or was removed</h1>
		<p class="text-ink-muted mb-6">It may have been deleted, or the link is wrong.</p>
		<a href="/" class="btn-primary inline-flex items-center justify-center min-h-[44px] px-6">
			Back to Library
		</a>
	</div>
{:else}
	<div class="max-w-4xl mx-auto">
		<!-- Title -->
		<div class="text-center mb-6">
			<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink mb-2">
				{tag.metadata.title}
			</h1>
			<p class="text-lg text-ink-muted">
				{local ? 'Your tag' : `Tag #${tag.metadata.tag_id}`}
			</p>
		</div>

		<!-- Notation with the action rail beside it (icons; below on mobile) -->
		<div class="flex flex-col sm:flex-row sm:items-start gap-3 mb-6">
			<div bind:this={notationEl} class="card-bg rounded border p-3 sm:p-5 flex-1 min-w-0">
				<NotationRenderer
					parsed={parsed ?? undefined}
					mode={layout}
					fontScale={settings.fontScale}
					playhead={playingHere ? player.playhead : null}
					{playingVoice}
					onplayvoice={togglePlayVoice}
				/>
			</div>

			<div class="flex sm:flex-col gap-2 justify-center" role="toolbar" aria-label="Tag actions">
				<!-- playback first (§6.9): the full mix; voice labels solo -->
				<button
					onclick={togglePlayAll}
					class="icon-btn"
					aria-pressed={playingAll}
					title={playingAll ? 'Stop' : 'Play all voices'}
					aria-label={playingAll ? 'Stop playback' : 'Play all voices'}
				>
					{#if playingAll}{@render iconStop()}{:else}{@render iconPlay()}{/if}
				</button>
				<button
					onclick={shareAsImage}
					disabled={isSharing}
					class="icon-btn {isSharing ? 'animate-pulse' : ''}"
					title="Share as image"
					aria-label="Download the notation as an image"
				>
					{@render iconImage()}
				</button>
				<button
					onclick={shareUrl}
					class="icon-btn"
					title="Share link"
					aria-label="Share or copy the link to this tag"
				>
					{@render iconLink()}
				</button>

				<!-- view settings: layout (§8.3) · size · sharps-only -->
				<div
					class="flex sm:flex-col rounded border border-paper-3 overflow-hidden"
					role="group"
					aria-label="View settings"
				>
					<button
						onclick={() => setLayout('wrapped')}
						class="icon-btn !border-0 !rounded-none"
						aria-pressed={layout === 'wrapped'}
						title="Wrapped systems"
						aria-label="Wrapped layout"
					>
						{@render iconWrapped()}
					</button>
					<button
						onclick={() => setLayout('continuous')}
						class="icon-btn !border-0 !rounded-none"
						aria-pressed={layout === 'continuous'}
						title="Horizontal scroll"
						aria-label="Scrolling layout"
					>
						{@render iconScroll()}
					</button>

					<div class="rail-divider" aria-hidden="true"></div>

					{#each FONT_SIZES as size (size.value)}
						<button
							onclick={() => (settings.fontScale = size.value)}
							class="icon-btn !border-0 !rounded-none"
							aria-pressed={settings.fontScale === size.value}
							title="{size.label} notation"
							aria-label="{size.label} notation size"
						>
							<span class="font-bold" style="font-size: {size.glyph}">A</span>
						</button>
					{/each}

					<div class="rail-divider" aria-hidden="true"></div>

					<button
						onclick={() => (settings.sharpsOnly = !settings.sharpsOnly)}
						class="icon-btn !border-0 !rounded-none font-mono text-lg"
						aria-pressed={settings.sharpsOnly}
						title="Sharps only — show every accidental as a sharp (#4 instead of b5)"
						aria-label="Show every accidental as a sharp"
					>
						#
					</button>
				</div>
			</div>
		</div>

		<!-- Metadata -->
		<div class="card-bg rounded border p-6">
			<div class="flex justify-between items-start mb-6 gap-2">
				<h2 class="text-2xl font-semibold text-ink">Tag Information</h2>
				<div class="flex flex-col items-end gap-1.5">
					<span
						class="inline-flex items-center border rounded px-2 py-0.5 text-sm {getDifficultyColor(
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
					<span class="text-sm font-medium text-ink-muted">Arranger:</span>
					<span class="ml-2 text-ink">{tag.metadata.arranger}</span>
				</div>
				<div>
					<span class="text-sm font-medium text-ink-muted">Date Added:</span>
					<span class="ml-2 text-ink">
						{new Date(tag.metadata.date_added).toLocaleDateString()}
					</span>
				</div>
				<div>
					<span class="text-sm font-medium text-ink-muted">Parts:</span>
					<span class="ml-2 text-ink">
						{tag.metadata.parts} part{tag.metadata.parts === 1 ? '' : 's'}
					</span>
				</div>
				{#if tag.metadata.original_key}
					<div>
						<span class="text-sm font-medium text-ink-muted">Original Key:</span>
						<span class="ml-2 text-ink font-mono">{tag.metadata.original_key}</span>
					</div>
				{/if}
				{#if tag.metadata.source_url}
					<div>
						<span class="text-sm font-medium text-ink-muted">Source:</span>
						<a
							href={tag.metadata.source_url}
							target="_blank"
							rel="noopener"
							class="ml-2 underline underline-offset-2 hover:text-ink-bright"
						>
							View Original
						</a>
					</div>
				{/if}
			</div>

			{#if tag.metadata.lyrics}
				<div class="border border-paper-2 rounded p-4 mb-4">
					<h3 class="text-sm font-medium text-ink-muted mb-2">Lyrics</h3>
					<p class="text-ink italic">“{tag.metadata.lyrics}”</p>
				</div>
			{/if}

			{#if tag.metadata.comments}
				<div class="border border-paper-2 rounded p-4">
					<h3 class="text-sm font-medium text-ink-muted mb-2">Notes</h3>
					<p class="text-ink">{tag.metadata.comments}</p>
				</div>
			{/if}
		</div>

		<!-- Rarer actions live below the tag information -->
		<div class="flex justify-end gap-3 mt-4">
			{#if local}
				<button
					onclick={handleDelete}
					disabled={isDeleting}
					class="min-h-[44px] px-5 rounded font-medium border border-danger text-danger hover:bg-danger hover:bg-opacity-10 transition-colors"
				>
					{isDeleting ? 'Deleting…' : 'Delete'}
				</button>
			{/if}
			<a href={editHref} class="btn-secondary min-h-[44px] inline-flex items-center px-5">Edit</a>
		</div>

		<!-- On to the next tag — the way back to the library is a search -->
		<form class="max-w-md mx-auto mt-8" onsubmit={searchLibrary}>
			<input
				type="search"
				bind:value={searchInput}
				placeholder="Search library…"
				aria-label="Search library"
				class="search-input min-h-[44px]"
			/>
		</form>
	</div>
{/if}

<style>
	.icon-btn {
		width: 2.75rem; /* 44px touch target */
		height: 2.75rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 1px solid var(--paper-3);
		border-radius: 2px;
		color: var(--ink-muted);
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	.icon-btn:hover {
		color: var(--ink);
		background: var(--paper-1);
	}

	.icon-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.icon-btn[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper-0);
	}

	/* 1px separator inside the view-settings group; works in both the
	   vertical (sm+) and horizontal (mobile) rail orientations. */
	.rail-divider {
		flex: 0 0 1px;
		align-self: stretch;
		background: var(--paper-3);
	}
</style>
