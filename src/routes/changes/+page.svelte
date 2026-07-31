<!--
	Recent changes — the catalog-wide feed (spec §6.8, §7.1). One of the
	cheap wiki defenses: every edit is public, attributed, and one tap from
	the tag's history where it can be reverted.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchRecent, serviceUrl, type RecentChange } from '$lib/catalog';
	import { getTagById } from '$lib/data';

	const configured = serviceUrl() !== '';

	let online = $state(true);
	$effect(() => {
		online = navigator.onLine;
	});

	let changes = $state<RecentChange[]>([]);
	let loading = $state(true);
	let loadError = $state('');

	onMount(load);

	async function load() {
		if (!configured) {
			loading = false;
			return;
		}
		loading = true;
		loadError = '';
		try {
			changes = await fetchRecent();
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	/** Bundled-snapshot title when we have one; the commit message otherwise. */
	function titleFor(c: RecentChange): string | null {
		return c.tag_id === null ? null : (getTagById(c.tag_id)?.metadata.title ?? `Tag #${c.tag_id}`);
	}

	function when(date: string): string {
		return date
			? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
			: '';
	}
</script>

<svelte:head>
	<title>Recent changes - numtags</title>
</svelte:head>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<div class="max-w-4xl mx-auto space-y-4">
	<header class="space-y-1">
		<h1 class="text-2xl sm:text-3xl font-bold text-ink-bright">Recent changes</h1>
		<p class="text-ink-muted">
			Every edit to the public catalog, newest first. Anyone can improve any tag — and any
			change can be reverted from the tag's history.
		</p>
	</header>

	{#if !configured}
		<div class="card-bg border rounded p-6 text-center space-y-2">
			<p class="text-ink">The recent-changes feed needs the catalog service (not configured).</p>
			<a href="/" class="btn-primary inline-block">Back to Library</a>
		</div>
	{:else if loading}
		<div class="flex flex-col items-center justify-center py-12 gap-3">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
			<p class="text-sm text-ink-muted">Loading changes…</p>
		</div>
	{:else if loadError}
		<div class="card-bg border rounded p-6 text-center space-y-3">
			<p class="text-ink">Couldn't load the feed — {loadError}</p>
			{#if !online}
				<p class="text-sm text-ink-muted">You're offline — the feed needs a connection.</p>
			{/if}
			<button class="btn-primary" onclick={load}>Retry</button>
		</div>
	{:else if changes.length === 0}
		<div class="card-bg border rounded p-6 text-center space-y-2">
			<p class="text-ink">No changes yet.</p>
			<p class="text-sm text-ink-muted">
				Import or write a tag and publish it — it'll show up here.
			</p>
			<a href="/import" class="btn-primary inline-block">Start an import</a>
		</div>
	{:else}
		<ol class="space-y-2">
			{#each changes as c (c.sha)}
				<li class="card-bg border rounded p-3 sm:p-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span class="font-medium text-ink min-w-0 max-w-full truncate">{c.editor}</span>
					<span class="text-sm text-ink-muted">{when(c.date)}</span>
					{#if c.tag_id !== null}
						<span class="text-sm">
							<a href="/tag/id/{c.tag_id}" class="underline underline-offset-2 hover:text-ink-bright">
								{titleFor(c)}
							</a>
							<span class="text-ink-muted">·</span>
							<a
								href="/tag/id/{c.tag_id}/history"
								class="text-ink-muted underline underline-offset-2 hover:text-ink"
							>
								history
							</a>
						</span>
					{/if}
					<span class="w-full text-sm text-ink-muted font-mono truncate">{c.message}</span>
				</li>
			{/each}
		</ol>
	{/if}
</div>
