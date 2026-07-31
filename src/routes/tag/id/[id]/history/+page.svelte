<!--
	Per-tag history (spec §6.8, §7.1): every catalog version with editor +
	date, expandable to a rendered preview and a diff against the current
	version, with one-tap revert as the safety net. History IS the moderation
	system — reverting is itself a tracked commit anyone can see (and revert).
-->
<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import NotationRenderer from '$lib/components/notation/NotationRenderer.svelte';
	import {
		CatalogError,
		fetchHistory,
		fetchTagFile,
		revertTag,
		serviceUrl,
		type TagVersion,
	} from '$lib/catalog';
	import { diffLines, hasChanges, type DiffLine } from '$lib/diff';
	import { getTagById } from '$lib/data';
	import { isLocalId } from '$lib/library/db';
	import { parse } from '$lib/notation/parse';
	import type { ParsedTag } from '$lib/notation/types';
	import { settings } from '$lib/settings.svelte';
	import { parseTagFile } from '$lib/tagfile';

	const id = $derived(parseInt(page.params.id ?? '', 10));
	const local = $derived(!isNaN(id) && isLocalId(id));
	const configured = serviceUrl() !== '';
	// The bundled snapshot supplies the title instantly; history itself is live.
	const title = $derived(getTagById(id)?.metadata.title ?? `Tag #${id}`);

	let online = $state(true);
	$effect(() => {
		online = navigator.onLine;
	});

	let versions = $state<TagVersion[]>([]);
	let loading = $state(true);
	let loadError = $state('');

	// Expanded version details, cached per commit sha.
	interface VersionView {
		parsed: ParsedTag | null; // null when the document failed to parse
		raw: string;
		diff: DiffLine[] | null; // vs current; null for the current version
	}
	let expanded = $state<string | null>(null);
	let views = $state<Record<string, VersionView>>({});
	let viewError = $state('');
	// HEAD as this page last saw it; its blob sha rides along as the revert's
	// base_sha (no-silent-clobber, §6.8).
	let headContent: string | null = null;
	let headSha: string | null = null;

	let editorName = $state('');
	let reverting = $state(false);
	let revertError = $state('');
	let revertSuccess = $state('');

	onMount(() => {
		editorName = localStorage.getItem('numtags-editor-name') ?? '';
	});

	// Load whenever the id changes — SvelteKit reuses this component when
	// navigating between two tags' history pages, so onMount is not enough.
	$effect(() => {
		void id;
		resetVersionState();
		revertError = '';
		revertSuccess = '';
		load();
	});

	function resetVersionState() {
		versions = [];
		views = {};
		expanded = null;
		viewError = '';
		headContent = null;
		headSha = null;
	}

	async function load() {
		if (!configured || local || isNaN(id)) {
			loading = false;
			return;
		}
		loading = true;
		loadError = '';
		try {
			versions = await fetchHistory(id);
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function tryParse(raw: string): ParsedTag | null {
		try {
			return parse(parseTagFile(raw).content);
		} catch {
			return null; // malformed document — the raw text still shows
		}
	}

	async function toggle(sha: string, isCurrent: boolean) {
		revertError = '';
		viewError = '';
		if (expanded === sha) {
			expanded = null;
			return;
		}
		expanded = sha;
		if (views[sha]) return;
		// While a fetch is in flight the template shows the loading line for
		// whatever `expanded` points at (no cached view yet) — an abandoned
		// fetch must only report/collapse if its row is still the open one.
		try {
			if (headContent === null) {
				const file = await fetchTagFile(id);
				headContent = file.content;
				headSha = file.sha;
			}
			const head = headContent;
			const raw = isCurrent ? head : (await fetchTagFile(id, sha)).content;
			views = {
				...views,
				[sha]: {
					raw,
					parsed: tryParse(raw),
					diff: isCurrent ? null : diffLines(head, raw),
				},
			};
		} catch (e) {
			if (expanded === sha) {
				viewError = e instanceof Error ? e.message : String(e);
				expanded = null;
			}
		}
	}

	async function revert(sha: string) {
		if (reverting) return;
		const name = editorName.trim() || 'anonymous';
		if (
			!confirm(
				`Revert “${title}” to the version from ${when(versions.find((v) => v.sha === sha)?.date ?? '')}? ` +
					`The revert is public and itself revertable.`,
			)
		)
			return;
		reverting = true;
		revertError = '';
		revertSuccess = '';
		let headMoved = false;
		try {
			localStorage.setItem('numtags-editor-name', editorName.trim());
			await revertTag(id, sha, name, headSha ?? undefined);
			revertSuccess =
				'Reverted — the catalog is updated. The app’s bundled copy refreshes on the next site deploy.';
			headMoved = true; // our own commit
		} catch (e) {
			revertError = e instanceof Error ? e.message : String(e);
			headMoved = e instanceof CatalogError && e.status === 409; // someone else's
		} finally {
			reverting = false;
		}
		if (headMoved) {
			// Drop the caches and reload so the list (and any diff the user
			// opens next) tells the truth about the new HEAD.
			resetVersionState();
			await load();
		}
	}

	function when(date: string): string {
		return date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
	}
</script>

<svelte:head>
	<title>History: {title} - numtags</title>
</svelte:head>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<div class="max-w-4xl mx-auto space-y-4">
	<header class="space-y-1">
		<h1 class="text-2xl sm:text-3xl font-bold text-ink-bright">History</h1>
		<p class="text-ink-muted">
			<a href="/tag/id/{id}" class="underline underline-offset-2 hover:text-ink">{title}</a>
			— every version of this catalog tag, newest first.
		</p>
	</header>

	{#if isNaN(id) || (!local && !configured)}
		<div class="card-bg border rounded p-6 text-center space-y-2">
			<p class="text-ink">
				{isNaN(id) ? "That tag doesn't exist." : "History needs the catalog service (not configured)."}
			</p>
			<a href="/" class="btn-primary inline-block">Back to Library</a>
		</div>
	{:else if local}
		<div class="card-bg border rounded p-6 text-center space-y-2">
			<p class="text-ink">This is a private tag in your library — it has no public history.</p>
			<p class="text-sm text-ink-muted">
				Publish it to the catalog from its edit screen and every later change will be tracked here.
			</p>
			<a href="/tag/id/{id}" class="btn-primary inline-block">Back to the tag</a>
		</div>
	{:else if loading}
		<div class="flex flex-col items-center justify-center py-12 gap-3">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
			<p class="text-sm text-ink-muted">Loading history…</p>
		</div>
	{:else if loadError}
		<div class="card-bg border rounded p-6 text-center space-y-3">
			<p class="text-ink">Couldn't load history — {loadError}</p>
			{#if !online}
				<p class="text-sm text-ink-muted">You're offline — history needs a connection.</p>
			{/if}
			<button class="btn-primary" onclick={load}>Retry</button>
		</div>
	{:else}
		{#if revertSuccess}
			<p class="text-sm text-success border border-success rounded p-3" role="status">
				{revertSuccess}
			</p>
		{/if}
		{#if revertError}
			<p class="text-sm text-danger border border-danger rounded p-3" role="alert">{revertError}</p>
		{/if}
		{#if !online}
			<p class="text-sm text-ink-muted border border-paper-3 rounded p-3">
				You're offline — history may be stale, and reverting needs a connection.
			</p>
		{/if}

		<ol class="space-y-2">
			{#each versions as v, i (v.sha)}
				{@const isCurrent = i === 0}
				{@const view = views[v.sha]}
				<li class="card-bg border rounded">
					<button
						class="w-full text-left p-3 sm:p-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 hover:bg-paper-1 transition-colors"
						aria-expanded={expanded === v.sha}
						onclick={() => toggle(v.sha, isCurrent)}
					>
						<span class="font-medium text-ink min-w-0 max-w-full truncate">{v.editor}</span>
						<span class="text-sm text-ink-muted">{when(v.date)}</span>
						{#if isCurrent}
							<span class="text-xs border border-success text-success rounded px-1.5 py-0.5">current</span>
						{/if}
						<span class="w-full text-sm text-ink-muted font-mono truncate">{v.message}</span>
					</button>

					{#if expanded === v.sha}
						<div class="border-t border-paper-2 p-3 sm:p-4 space-y-3">
							{#if !view}
								<p class="text-sm text-ink-muted">Loading this version…</p>
							{:else}
								{#if view.parsed}
									<NotationRenderer parsed={view.parsed} mode="wrapped" fontScale={settings.fontScale} />
								{:else}
									<pre class="text-xs text-ink font-mono overflow-x-auto p-2 border border-paper-3 rounded">{view.raw}</pre>
								{/if}

								{#if view.diff}
									{#if hasChanges(view.diff)}
										<details>
											<summary class="cursor-pointer text-sm text-accent min-h-[44px] flex items-center">
												What changes if you revert to this version
											</summary>
											<pre class="text-xs font-mono overflow-x-auto p-2 border border-paper-3 rounded leading-relaxed">{#each view.diff as line}<span
														class={line.kind === 'added'
															? 'block bg-success/15 text-success'
															: line.kind === 'removed'
																? 'block bg-danger/15 text-danger'
																: 'block text-ink-muted'}
														>{line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '- ' : '  '}{line.text}</span
													>{/each}</pre>
										</details>

										<div class="flex flex-wrap items-end gap-3 pt-1">
											<label class="block text-sm text-ink">
												Your name (for the revert commit)
												<input
													type="text"
													maxlength="80"
													class="search-input !py-2 mt-1 max-w-[16rem]"
													bind:value={editorName}
													placeholder="anonymous"
												/>
											</label>
											<button
												class="btn-secondary min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
												disabled={reverting || !online}
												title={!online ? "You're offline — reverting needs a connection" : ''}
												onclick={() => revert(v.sha)}
											>
												{reverting ? 'Reverting…' : 'Revert to this version'}
											</button>
										</div>
									{:else}
										<p class="text-sm text-ink-muted">Identical to the current version.</p>
									{/if}
								{/if}
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ol>

		{#if viewError}
			<p class="text-sm text-danger" role="alert">Couldn't load that version — {viewError}</p>
		{/if}

		{#if versions.length === 1}
			<p class="text-sm text-ink-muted text-center">No edits yet — this is the original.</p>
		{:else if versions.length === 0}
			<div class="card-bg border rounded p-6 text-center space-y-2">
				<p class="text-ink">No history for this tag.</p>
				<p class="text-sm text-ink-muted">
					It may be newer than the deployed catalog, or the id is wrong.
				</p>
			</div>
		{/if}

		<p class="text-sm text-ink-muted text-center">
			<a href="/changes" class="underline underline-offset-2 hover:text-ink">
				All recent catalog changes →
			</a>
		</p>
	{/if}
</div>
