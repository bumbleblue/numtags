<!--
	Review & edit — the shared surface for all import paths, manual authoring
	and catalog edits (FABLE_SPEC §6.5, §6.6, §6.8, §7.1).

	Sources, by query param:
	  · (none)       → the sessionStorage Draft from /import (else redirect there)
	  · ?local=ID    → the private IndexedDB library
	  · ?catalog=ID  → the bundled catalog snapshot
	A session draft that matches the query param wins (never lose work).

	Never auto-saves; the draft persists to sessionStorage on every meaningful
	change (debounced) and to the library BEFORE any network call.
-->
<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import NotationRenderer from '$lib/components/notation/NotationRenderer.svelte';
	import SourceEditor from '$lib/components/notation/SourceEditor.svelte';
	import { clearDraft, getDraft, setDraft, type Draft } from '$lib/draft';
	import { allTags } from '$lib/generated-tags';
	import { deleteLocalTag, getLocalTag, saveLocalTag } from '$lib/library/db';
	import { composeBody, splitBody, type LyricCells } from '$lib/notation/lyrics';
	import { normalize } from '$lib/notation/normalize';
	import { parse } from '$lib/notation/parse';
	import { beatMismatchWarnings, shiftVoiceOctave } from '$lib/notation/transform';
	import { VOICE_NAMES, type ParsedTag } from '$lib/notation/types';
	import { encode, LETTER_PC, parseKeyName } from '$lib/score/encode';
	import { settings } from '$lib/settings.svelte';
	import { serializeTag } from '$lib/tagfile';
	import type { Tag } from '$lib/types';

	const serviceUrl = (env.PUBLIC_SERVICE_URL ?? '').replace(/\/+$/, '');

	let online = $state(true);
	$effect(() => {
		online = navigator.onLine;
	});

	// ── draft state ──────────────────────────────────────────────────────────
	let draft = $state<Draft | null>(null);
	let loaded = $state(false);
	let notFound = $state(false);

	// The source textarea holds ONLY voice lines; lyrics live as per-beat
	// cells typed under the rendered notes (beat-anchored lyric editor).
	let voiceBody = $state('');
	let lyricCells = $state<LyricCells>([]);
	let meta = $state({
		title: '',
		arranger: '',
		difficulty: 'Easy' as Tag['metadata']['difficulty'],
		original_key: '',
		source_url: '',
		lyrics: '',
		comments: '',
	});

	let parsed = $state<ParsedTag>({ staffs: [], warnings: [] });
	let dirty = $state(false);
	let saving = $state(false);
	let publishing = $state(false);
	let saveError = $state('');
	let publishError = $state('');
	let editorName = $state('');
	let tab = $state<'source' | 'details'>('source');
	// Mobile (< lg): the input and the preview toggle; desktop shows both.
	let view = $state<'edit' | 'preview'>('edit');

	const isCatalogEdit = $derived(draft?.editing?.kind === 'catalog');
	const isImageImport = $derived(draft?.tag.metadata.origin === 'imported-image');
	const confidence = $derived(draft?.confidence ?? draft?.score?.confidence);
	const canPublish = $derived(Boolean(serviceUrl) && online);
	const publishUnavailableReason = $derived(
		!serviceUrl
			? 'Publishing needs the catalog service (not configured)'
			: !online
				? "You're offline — save a private copy now, publish later"
				: '',
	);
	const beatWarnings = $derived(beatMismatchWarnings(parsed));

	onMount(async () => {
		editorName = localStorage.getItem('numtags-editor-name') ?? '';
		const params = page.url.searchParams;
		const localParam = params.get('local');
		const catalogParam = params.get('catalog');
		const session = getDraft();

		if (localParam !== null) {
			const id = Number(localParam);
			if (session?.editing?.kind === 'local' && session.editing.id === id) {
				draft = session; // resume in-progress edit (§7.1 never lose work)
			} else {
				const tag = await getLocalTag(id);
				if (!tag) {
					notFound = true;
					loaded = true;
					return;
				}
				draft = { tag, editing: { kind: 'local', id } };
			}
		} else if (catalogParam !== null) {
			const id = Number(catalogParam);
			if (session?.editing?.kind === 'catalog' && session.editing.id === id) {
				draft = session;
			} else {
				const tag = allTags.find((t) => t.metadata.tag_id === id);
				if (!tag) {
					notFound = true;
					loaded = true;
					return;
				}
				draft = { tag: structuredClone(tag), editing: { kind: 'catalog', id } };
			}
		} else {
			draft = session;
			if (!draft) {
				goto('/import', { replaceState: true });
				return;
			}
		}

		const m = draft.tag.metadata;
		({ voiceBody, lyricCells } = splitBody(draft.tag.content));
		meta = {
			title: m.title === 'Untitled' ? '' : m.title,
			arranger: m.arranger === 'unknown' ? '' : m.arranger,
			difficulty: m.difficulty,
			original_key: m.original_key ?? '',
			source_url: m.source_url ?? '',
			lyrics: m.lyrics ?? '',
			comments: m.comments ?? '',
		};
		parsed = parse(voiceBody);
		loaded = true;
	});

	// Live preview: re-parse debounced ~150ms on keystroke (§6.5).
	$effect(() => {
		const b = voiceBody;
		if (!loaded) return;
		const t = setTimeout(() => (parsed = parse(b)), 150);
		return () => clearTimeout(t);
	});

	// Keep the lyric grid shaped to the parsed staffs: every staff gets at
	// least one (possibly empty) row to type into; extra cells are retained
	// while editing and trimmed on compose.
	$effect(() => {
		const staffCount = parsed.staffs.length;
		if (!loaded || staffCount === 0) return;
		if (lyricCells.length < staffCount || lyricCells.some((rows) => rows.length === 0)) {
			const next = [...lyricCells];
			for (let si = 0; si < staffCount; si++) {
				if (!next[si]) next[si] = [];
				if (next[si].length === 0) next[si] = [[]];
			}
			lyricCells = next;
		}
	});

	/** The canonical body: voice lines + composed lyric lines (§3.3). */
	function composedBody(): string {
		return composeBody(voiceBody, lyricCells);
	}

	function onLyricInput(si: number, ri: number, flat: number, value: string) {
		const next = lyricCells.map((rows) => rows.map((r) => [...r]));
		while (next.length <= si) next.push([]);
		while (next[si].length <= ri) next[si].push([]);
		const row = next[si][ri];
		while (row.length <= flat) row.push('');
		row[flat] = value;
		lyricCells = next;
		touch();
	}

	function addLyricRow() {
		lyricCells = lyricCells.map((rows) => [...rows, []]);
		touch();
	}

	function removeEmptyLyricRows() {
		lyricCells = lyricCells.map((rows) => {
			const kept = rows.filter((r) => r.some((c) => c.trim()));
			return kept.length ? kept : [[]];
		});
		touch();
	}

	const hasExtraRows = $derived(lyricCells.some((rows) => rows.length > 1));

	// ── never lose work: persist the draft on every meaningful change ───────
	let persistTimer: ReturnType<typeof setTimeout> | undefined;
	function touch() {
		if (!loaded || !draft) return;
		dirty = true;
		clearTimeout(persistTimer);
		persistTimer = setTimeout(() => {
			if (draft) setDraft(currentDraft());
		}, 400);
	}

	beforeNavigate(({ cancel }) => {
		if (dirty && !saving && !publishing) {
			if (!confirm('You have unsaved changes — leave anyway? (The draft is kept for this session.)'))
				cancel();
		}
	});

	function currentTag(): Tag {
		const base = draft!.tag;
		const metadata: Tag['metadata'] = {
			...base.metadata,
			title: meta.title.trim() || 'Untitled',
			arranger: meta.arranger.trim() || 'unknown',
			difficulty: meta.difficulty,
		};
		const opt = (key: 'original_key' | 'source_url' | 'lyrics' | 'comments', val: string) => {
			if (val.trim()) metadata[key] = val.trim();
			else delete metadata[key];
		};
		opt('original_key', meta.original_key);
		opt('source_url', meta.source_url);
		opt('lyrics', meta.lyrics);
		opt('comments', meta.comments);
		return { ...base, metadata, content: composedBody() };
	}

	function currentDraft(): Draft {
		return { ...draft!, tag: currentTag() };
	}

	// ── §6.5 controls ────────────────────────────────────────────────────────
	const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

	function changeKey(key: string) {
		meta.original_key = key;
		if (draft?.score && key) {
			// Re-encode live from the retained ScoreModel (§6.4 fuzzy area 4).
			const tonic = parseKeyName(key);
			draft.score.keyName = key;
			draft.score.mode = /m\s*$/.test(key) ? 'minor' : 'major';
			draft.score.tonicPitchClass = ((LETTER_PC[tonic.letter] + tonic.alter) % 12 + 12) % 12;
			({ voiceBody, lyricCells } = splitBody(encode(draft.score)));
		}
		touch();
	}

	function shiftVoice(voiceIndex: number, delta: number) {
		voiceBody = shiftVoiceOctave(voiceBody, voiceIndex, delta);
		touch();
	}

	/**
	 * Lenient normalize on blur/paste — never blocking (§6.6). If a full body
	 * (with lyric lines) lands in the voice textarea, the lyric lines move
	 * into the beat-anchored editor instead of staying as stray text.
	 */
	function normalizeBody() {
		const n = normalize(voiceBody);
		const hasLyricLines = n.split('\n').some((l) => l.trim() && !l.includes('|'));
		if (n === voiceBody && !hasLyricLines) return;
		const pasted = splitBody(n);
		voiceBody = pasted.voiceBody;
		if (pasted.lyricCells.some((rows) => rows.length > 0)) {
			lyricCells = pasted.lyricCells.map((rows, si) => (rows.length ? rows : (lyricCells[si] ?? [])));
		}
		touch();
	}

	// ── actions ──────────────────────────────────────────────────────────────
	const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

	/** Save into the private library; catalog edits become a private copy. */
	async function saveToLibrary(): Promise<Tag | null> {
		if (!draft) return null;
		saveError = '';
		saving = true;
		try {
			const tag = currentTag();
			if (draft.editing?.kind === 'local') {
				tag.metadata.tag_id = draft.editing.id; // overwrite the same entry
			} else {
				tag.metadata.tag_id = 0; // assign a fresh local id (incl. private copies)
				tag.slug = '';
			}
			const saved = await saveLocalTag(tag);
			clearDraft();
			dirty = false;
			await goto(`/tag/id/${saved.metadata.tag_id}`);
			return saved;
		} catch (e) {
			saveError = `Couldn't save: ${message(e)}`;
			return null;
		} finally {
			saving = false;
		}
	}

	/**
	 * Publish to / update the public catalog (§6.8, services/README.md).
	 * §7.1: the work is persisted to the local library BEFORE the network
	 * call; any failure keeps it (plus the session draft).
	 */
	async function publish() {
		if (!draft || !canPublish || publishing) return;
		publishError = '';
		publishing = true;
		let safetyId: number | null = null;
		try {
			localStorage.setItem('numtags-editor-name', editorName);

			// 1. Local safety copy first — never lose work.
			const safety = currentTag();
			safety.metadata.tag_id = draft.editing?.kind === 'local' ? draft.editing.id : 0;
			if (draft.editing?.kind !== 'local') safety.slug = '';
			safetyId = (await saveLocalTag(safety)).metadata.tag_id;

			const editor = editorName.trim() || 'anonymous';

			if (draft.editing?.kind === 'catalog') {
				// 2a. Update an existing catalog tag: fetch the base sha, PUT.
				const id = draft.editing.id;
				const head = await fetch(`${serviceUrl}/catalog/tags/${id}`);
				if (!head.ok) throw new Error(`couldn't load the catalog entry (${head.status})`);
				const { sha } = await head.json();
				const tag = currentTag();
				tag.metadata.tag_id = id;
				const res = await fetch(`${serviceUrl}/catalog/tags/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content: serializeTag(tag), base_sha: sha, editor_name: editor }),
				});
				if (res.status === 409) {
					publishError =
						'This tag changed since you loaded it — reload & re-apply your edit. Your version is saved as a private copy in your library.';
					return;
				}
				if (!res.ok) throw new Error(`the catalog service answered ${res.status}`);
				await deleteLocalTag(safetyId); // published — the safety copy served its purpose
				clearDraft();
				dirty = false;
				await goto(`/tag/id/${id}`);
			} else {
				// 2b. Publish a new tag: POST, server assigns the catalog id.
				const tag = currentTag();
				tag.metadata.tag_id = 0;
				const res = await fetch(`${serviceUrl}/catalog/tags`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content: serializeTag(tag), editor_name: editor }),
				});
				if (!res.ok) throw new Error(`the catalog service answered ${res.status}`);
				// Keep the private copy (the new catalog id isn't in the bundled
				// snapshot until the next sync) and land on it.
				clearDraft();
				dirty = false;
				await goto(`/tag/id/${safetyId}`);
			}
		} catch (e) {
			publishError = `Couldn't publish — ${message(e)}. Your work is saved in your library; try again later.`;
		} finally {
			publishing = false;
		}
	}
</script>

<svelte:head>
	<title>Review &amp; edit - numtags</title>
</svelte:head>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<div class="max-w-6xl mx-auto space-y-4">
	<header class="flex items-baseline justify-between gap-3 flex-wrap">
		<h1 class="text-2xl sm:text-3xl font-bold text-nord-6">Review &amp; edit</h1>
		{#if loaded && draft}
			<p class="text-sm text-nord-5">
				{#if isCatalogEdit}
					editing catalog tag #{draft.editing?.id}
				{:else if draft.editing?.kind === 'local'}
					editing your tag #{draft.editing.id}
				{:else}
					{draft.tag.metadata.origin === 'authored' ? 'new tag' : draft.tag.metadata.origin}
				{/if}
			</p>
		{/if}
	</header>

	{#if !loaded}
		<p class="text-nord-5 py-8 text-center">Loading draft…</p>
	{:else if notFound}
		<div class="text-center py-12 space-y-3">
			<p class="text-nord-4">That tag doesn't exist or was removed.</p>
			<a href="/import" class="btn-primary inline-block">Start an import</a>
		</div>
	{:else if draft}
		<!-- import-warning banner (§6.5) -->
		{#if draft.warnings?.length}
			<div class="border border-nord-13 rounded p-3 bg-nord-1 text-sm space-y-1">
				<p class="font-medium text-nord-13">Import notes</p>
				<ul class="list-disc ml-5 text-nord-4">
					{#each draft.warnings as w}<li>{w}</li>{/each}
				</ul>
			</div>
		{/if}

		<!-- image-import confidence banner + compare-to-original (§6.3/§6.5) -->
		{#if isImageImport}
			<div class="border border-nord-12 rounded p-3 bg-nord-1 text-sm space-y-2">
				<p class="font-medium text-nord-12">
					Converted from an image — check carefully.
					{#if confidence !== undefined}
						Confidence: {Math.round(confidence * 100)}%.
					{/if}
					Voice assignment (Tenor vs Lead) is the usual suspect.
				</p>
				{#if draft.sourceImage}
					<details>
						<summary class="cursor-pointer text-nord-8 min-h-[44px] flex items-center">
							Compare to original
						</summary>
						<img
							src={draft.sourceImage}
							alt="Original sheet music"
							class="mt-2 max-w-full rounded border border-nord-3 bg-white"
						/>
					</details>
				{/if}
			</div>
		{/if}

		<!-- mobile: the input and the preview toggle (desktop shows both) -->
		<div class="lg:hidden inline-flex rounded border border-nord-3 overflow-hidden" role="tablist" aria-label="Editor view">
			<button
				role="tab"
				aria-selected={view === 'edit'}
				class="px-4 min-h-[44px] text-sm {view === 'edit'
					? 'bg-nord-8 text-nord-0 font-medium'
					: 'bg-nord-1 text-nord-4'}"
				onclick={() => (view = 'edit')}>Input</button
			>
			<button
				role="tab"
				aria-selected={view === 'preview'}
				class="px-4 min-h-[44px] text-sm {view === 'preview'
					? 'bg-nord-8 text-nord-0 font-medium'
					: 'bg-nord-1 text-nord-4'}"
				onclick={() => (view = 'preview')}>Preview</button
			>
		</div>

		<!-- input ⟷ preview, side by side on desktop (§6.5) -->
		<div class="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
			<!-- input pane: source ⟷ metadata tabs, errors live here -->
			<div class="space-y-3 {view === 'preview' ? 'hidden lg:block' : ''}">
				<div class="inline-flex rounded border border-nord-3 overflow-hidden" role="tablist">
					<button
						role="tab"
						aria-selected={tab === 'source'}
						class="px-4 min-h-[44px] text-sm {tab === 'source'
							? 'bg-nord-8 text-nord-0 font-medium'
							: 'bg-nord-1 text-nord-4'}"
						onclick={() => (tab = 'source')}>Notation source</button
					>
					<button
						role="tab"
						aria-selected={tab === 'details'}
						class="px-4 min-h-[44px] text-sm {tab === 'details'
							? 'bg-nord-8 text-nord-0 font-medium'
							: 'bg-nord-1 text-nord-4'}"
						onclick={() => (tab = 'details')}>Details</button
					>
				</div>

				{#if tab === 'source'}
					<SourceEditor
						bind:value={voiceBody}
						warnings={parsed.warnings}
						extraWarnings={beatWarnings}
						oninput={touch}
						onnormalize={normalizeBody}
					/>
					<p class="text-xs text-nord-5">
						Notes and measures only — voices top-to-bottom: Tenor, Lead, Baritone, Bass.
						Whitespace is cosmetic; <code class="font-mono">|</code> marks measures. Lyrics are
						typed under the notes in the preview (pasting a full tag with lyric lines
						still works — they move into the lyric editor).
					</p>
				{:else}
					<section class="card-bg border rounded p-4 grid gap-4 sm:grid-cols-2">
						<label class="block text-sm text-nord-4">
							Title
							<input type="text" class="search-input !py-2 mt-1" bind:value={meta.title} oninput={touch} placeholder="Untitled" />
						</label>
						<label class="block text-sm text-nord-4">
							Arranger
							<input type="text" class="search-input !py-2 mt-1" bind:value={meta.arranger} oninput={touch} placeholder="unknown" />
						</label>
						<label class="block text-sm text-nord-4">
							Difficulty
							<select class="search-input !py-2 mt-1" bind:value={meta.difficulty} onchange={touch}>
								<option>Easy</option>
								<option>Medium</option>
								<option>Hard</option>
							</select>
						</label>
						<label class="block text-sm text-nord-4">
							Source URL
							<input type="url" class="search-input !py-2 mt-1" bind:value={meta.source_url} oninput={touch} placeholder="https://www.barbershoptags.com/…" />
						</label>
						<label class="block text-sm text-nord-4 sm:col-span-2">
							Lyrics
							<textarea class="search-input !py-2 mt-1" rows="2" bind:value={meta.lyrics} oninput={touch}></textarea>
						</label>
						<label class="block text-sm text-nord-4 sm:col-span-2">
							Comments
							<textarea class="search-input !py-2 mt-1" rows="2" bind:value={meta.comments} oninput={touch}></textarea>
						</label>
					</section>
				{/if}
			</div>

			<!-- preview pane: live render + beat-anchored lyric editor (§6.5/§6.6) -->
			<div class="{view === 'edit' ? 'hidden lg:block' : ''} lg:sticky lg:top-4">
				<section class="card-bg border rounded p-3 sm:p-4 space-y-2">
					<NotationRenderer
						{parsed}
						mode="wrapped"
						fontScale={settings.fontScale}
						editableLyrics
						{lyricCells}
						onlyricinput={onLyricInput}
					/>
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
						<p class="text-xs text-nord-5">
							Type lyrics under the notes — <kbd class="font-mono">Tab</kbd> continues a word
							(adds the hyphen), <kbd class="font-mono">Space</kbd> starts the next word.
						</p>
						<button class="text-xs text-nord-8 underline min-h-[44px]" onclick={addLyricRow}>
							+ alternate lyric row
						</button>
						{#if hasExtraRows}
							<button class="text-xs text-nord-5 underline min-h-[44px]" onclick={removeEmptyLyricRows}>
								remove empty rows
							</button>
						{/if}
					</div>
				</section>
			</div>
		</div>

		<!-- §6.5 controls: key (re-encodes when a score exists) + voice octaves -->
		<section class="card-bg border rounded p-3 sm:p-4 space-y-3">
			<div class="flex flex-wrap items-center gap-3">
				<label class="flex items-center gap-2 text-sm text-nord-4">
					Key
					<select
						class="search-input !w-auto !py-2 text-sm"
						value={meta.original_key}
						onchange={(e) => changeKey(e.currentTarget.value)}
					>
						<option value="">—</option>
						{#if meta.original_key && !KEY_NAMES.includes(meta.original_key) && !KEY_NAMES.map((k) => k + 'm').includes(meta.original_key)}
							<option value={meta.original_key}>{meta.original_key}</option>
						{/if}
						<optgroup label="Major">
							{#each KEY_NAMES as k}<option value={k}>{k}</option>{/each}
						</optgroup>
						<optgroup label="Minor">
							{#each KEY_NAMES as k}<option value={k + 'm'}>{k}m</option>{/each}
						</optgroup>
					</select>
				</label>
				<span class="text-xs text-nord-5">
					{draft.score
						? 'changing the key re-encodes the notation from the imported score'
						: 'sets the original key (metadata only)'}
				</span>
			</div>
			<div class="flex flex-wrap gap-x-4 gap-y-2">
				{#each VOICE_NAMES as name, vi}
					<div class="flex items-center gap-1 text-sm text-nord-4">
						<span class="w-16">{name}</span>
						<button
							class="btn-secondary !px-3 min-h-[44px] min-w-[44px]"
							title="Shift {name} down an octave"
							onclick={() => shiftVoice(vi, -1)}>↓ oct</button
						>
						<button
							class="btn-secondary !px-3 min-h-[44px] min-w-[44px]"
							title="Shift {name} up an octave"
							onclick={() => shiftVoice(vi, 1)}>↑ oct</button
						>
					</div>
				{/each}
			</div>
		</section>

		<!-- actions (§6.5) -->
		{#if saveError}<p class="text-sm text-nord-11" role="alert">{saveError}</p>{/if}
		{#if publishError}<p class="text-sm text-nord-11" role="alert">{publishError}</p>{/if}

		<section class="card-bg border rounded p-4 space-y-3">
			<div class="flex flex-wrap gap-2 items-center">
				<button class="btn-primary min-h-[44px]" onclick={saveToLibrary} disabled={saving || publishing}>
					{#if saving}Saving…{:else if isCatalogEdit}Save a private copy{:else}Save to library{/if}
				</button>
				<button
					class="btn-secondary min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
					onclick={publish}
					disabled={!canPublish || publishing || saving}
					title={publishUnavailableReason}
				>
					{#if publishing}
						{isCatalogEdit ? 'Updating…' : 'Publishing…'}
					{:else}
						{isCatalogEdit ? 'Update catalog' : 'Publish to catalog'}
					{/if}
				</button>
				{#if !canPublish}
					<span class="text-xs text-nord-5">{publishUnavailableReason}.</span>
				{/if}
			</div>
			{#if canPublish}
				<label class="block text-sm text-nord-4 max-w-xs">
					Your name (for the catalog commit)
					<input type="text" class="search-input !py-2 mt-1" bind:value={editorName} placeholder="anonymous" />
				</label>
				<p class="text-xs text-nord-5">
					Catalog tags are CC0; publishing affirms this is a faithful translation. Your work is
					also kept in your private library before anything is sent.
				</p>
			{/if}
		</section>
	{/if}
</div>
