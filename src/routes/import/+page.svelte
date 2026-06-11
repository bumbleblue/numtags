<!--
	Import / new — the tiered entry point (FABLE_SPEC §6.1, §7.1).
	Cheapest-and-best first: write it yourself → MusicXML → MIDI → image (OMR).
	Every path lands in /review via a sessionStorage Draft — never auto-saved.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { setDraft, type Draft } from '$lib/draft';
	import {
		makeDraftTag,
		parseBbsId,
		parseBbsTagsXML,
		sniffFile,
		type BbsAutofill,
	} from '$lib/import-utils';
	import { blankTemplateBody } from '$lib/notation/transform';
	import { parseMusicXMLWithWarnings } from '$lib/score/musicxml';
	import { encode } from '$lib/score/encode';
	import type { ScoreModel } from '$lib/score/types';
	import { parseTagFile } from '$lib/tagfile';
	import type { TagOrigin } from '$lib/types';

	const serviceUrl = (env.PUBLIC_SERVICE_URL ?? '').replace(/\/+$/, '');

	let online = $state(true);
	$effect(() => {
		online = navigator.onLine;
	});

	const omrAvailable = $derived(Boolean(serviceUrl) && online);
	const omrUnavailableReason = $derived(
		!serviceUrl
			? 'needs the conversion service (not configured)'
			: !online
				? 'needs a connection — you appear to be offline'
				: '',
	);

	/** Per-path error message (§7.1 unsupported/corrupt/total-failure states). */
	let importError = $state<{ path: string; message: string; offerManual?: boolean } | null>(null);
	let busy = $state<string | null>(null);

	// ── barbershoptags.com autofill (§6.7) ──────────────────────────────────
	let bbsInput = $state('');
	let bbsStatus = $state<'idle' | 'pending' | 'ok' | 'fail'>('idle');
	let autofill = $state<BbsAutofill | null>(null);

	async function runAutofill() {
		const id = parseBbsId(bbsInput);
		if (!id) {
			bbsStatus = 'fail';
			autofill = null;
			return;
		}
		bbsStatus = 'pending';
		try {
			const res = await fetch(`${serviceUrl}/proxy/bbstags?id=${id}`);
			if (!res.ok) throw new Error();
			const parsed = parseBbsTagsXML(await res.text(), id);
			if (!parsed?.title) throw new Error();
			autofill = parsed;
			bbsStatus = 'ok';
		} catch {
			// §7.1: skip silently with a small note — they can type metadata.
			autofill = null;
			bbsStatus = 'fail';
		}
	}

	// ── shared draft hand-off ───────────────────────────────────────────────
	function toReview(draft: Draft) {
		setDraft(draft);
		goto('/review');
	}

	function scoreToReview(
		score: ScoreModel,
		warnings: string[],
		origin: TagOrigin,
		extra: Partial<Draft> = {},
	) {
		const body = encode(score);
		const tag = makeDraftTag(body, origin, autofill, score.keyName);
		toReview({ tag, score, warnings, ...extra });
	}

	// ── path 1: write it yourself (§6.6) ────────────────────────────────────
	function writeItYourself() {
		toReview({ tag: makeDraftTag(blankTemplateBody(), 'authored', autofill) });
	}

	// ── file pickers ────────────────────────────────────────────────────────
	let musicxmlInput = $state<HTMLInputElement>();
	let midiInput = $state<HTMLInputElement>();
	let imageInput = $state<HTMLInputElement>();
	let tagfileInput = $state<HTMLInputElement>();

	function pickedFile(input: HTMLInputElement | undefined): File | null {
		const file = input?.files?.[0] ?? null;
		if (input) input.value = ''; // allow re-picking the same file
		return file; // picker cancelled → null → no-op (§7.1)
	}

	const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

	// ── path 2: MusicXML (.xml / .musicxml / .mxl) ──────────────────────────
	async function handleMusicXML() {
		const file = pickedFile(musicxmlInput);
		if (!file) return;
		importError = null;
		busy = 'musicxml';
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const kind = sniffFile(bytes);
			if (kind === 'midi') throw new Error('That looks like a MIDI file — use the MIDI option.');
			if (kind !== 'musicxml' && kind !== 'mxl') {
				throw new Error("That's not a MusicXML file.");
			}
			const { score, warnings } = parseMusicXMLWithWarnings(bytes);
			scoreToReview(score, warnings, 'imported-musicxml');
		} catch (e) {
			importError = {
				path: 'musicxml',
				message: `${message(e)} Accepted: .xml, .musicxml, .mxl (e.g. a MuseScore export).`,
				offerManual: true,
			};
		} finally {
			busy = null;
		}
	}

	// ── path 3: MIDI (.mid / .midi) ─────────────────────────────────────────
	async function handleMIDI() {
		const file = pickedFile(midiInput);
		if (!file) return;
		importError = null;
		busy = 'midi';
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			if (sniffFile(bytes) !== 'midi') throw new Error("That's not a MIDI file.");
			// Dynamic import: @tonejs/midi is CJS and must stay out of the SSR graph.
			const { parseMIDI } = await import('$lib/score/midi');
			const { score, warnings } = parseMIDI(bytes);
			scoreToReview(score, warnings, 'imported-midi');
		} catch (e) {
			importError = {
				path: 'midi',
				message: `${message(e)} Accepted: .mid, .midi.`,
				offerManual: true,
			};
		} finally {
			busy = null;
		}
	}

	// ── path 4: image / GIF / PDF via OMR (§6.3, §7.1) ──────────────────────
	const OMR_TIMEOUT_MS = 120_000; // generous: scale-to-zero cold starts
	const SOURCE_IMAGE_MAX = 2 * 1024 * 1024;

	let omrState = $state<'idle' | 'pending' | 'error'>('idle');
	let omrError = $state('');
	let omrFile: File | null = $state(null); // kept across failures — never discard input

	function handleImagePicked() {
		const file = pickedFile(imageInput);
		if (!file) return;
		omrFile = file;
		runOmr();
	}

	async function runOmr() {
		if (!omrFile) return;
		importError = null;
		omrError = '';
		omrState = 'pending';
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), OMR_TIMEOUT_MS);
		try {
			const form = new FormData();
			form.append('file', omrFile);
			const res = await fetch(`${serviceUrl}/omr`, {
				method: 'POST',
				body: form,
				signal: controller.signal,
			});
			if (!res.ok) {
				let detail = '';
				try {
					detail = (await res.json()).detail;
				} catch {
					/* non-JSON error body */
				}
				throw new Error(detail || `The conversion service answered ${res.status}.`);
			}
			const confidenceHeader = Number.parseFloat(res.headers.get('X-Confidence') ?? '');
			const confidence = Number.isNaN(confidenceHeader) ? undefined : confidenceHeader;
			const xml = await res.text();
			const { score, warnings } = parseMusicXMLWithWarnings(xml);
			if (confidence !== undefined) score.confidence = confidence;
			const sourceImage =
				omrFile.size <= SOURCE_IMAGE_MAX && omrFile.type.startsWith('image/')
					? await fileToDataURL(omrFile)
					: undefined;
			omrState = 'idle';
			scoreToReview(score, warnings, 'imported-image', { sourceImage, confidence });
		} catch (e) {
			omrState = 'error';
			omrError =
				e instanceof DOMException && e.name === 'AbortError'
					? 'The conversion service took too long (it may be warming up).'
					: message(e);
		} finally {
			clearTimeout(timer);
		}
	}

	function fileToDataURL(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
	}

	// ── power-user path: a .md tag file ─────────────────────────────────────
	async function handleTagFile() {
		const file = pickedFile(tagfileInput);
		if (!file) return;
		importError = null;
		busy = 'tagfile';
		try {
			const tag = parseTagFile(await file.text());
			tag.metadata.tag_id = 0; // re-assign in the local namespace on save
			tag.slug = '';
			toReview({ tag });
		} catch (e) {
			importError = {
				path: 'tagfile',
				message: `${message(e)} Accepted: a numtags .md file (YAML frontmatter + notation).`,
				offerManual: true,
			};
		} finally {
			busy = null;
		}
	}
</script>

<svelte:head>
	<title>Add a tag - numtags</title>
</svelte:head>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<div class="max-w-2xl mx-auto space-y-6">
	<header>
		<h1 class="text-2xl sm:text-3xl font-bold text-ink-bright">Add a tag</h1>
		<p class="text-ink mt-1">
			Every path lands in <span class="text-accent">review</span> first — nothing is saved until you
			say so.
		</p>
	</header>

	<!-- barbershoptags.com autofill (§6.7) -->
	<section class="card-bg border rounded p-4 space-y-2">
		<h2 class="font-semibold text-ink-bright">Coming from barbershoptags.com?</h2>
		{#if serviceUrl}
			<p class="text-sm text-ink-muted">
				Paste a tag URL or id to prefill title, arranger, key and lyrics.
			</p>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={bbsInput}
					placeholder="https://www.barbershoptags.com/tag-7… or 7"
					class="search-input !py-2 text-sm"
					onkeydown={(e) => e.key === 'Enter' && runAutofill()}
				/>
				<button
					class="btn-secondary min-h-[44px] whitespace-nowrap"
					onclick={runAutofill}
					disabled={bbsStatus === 'pending' || !online}
				>
					{bbsStatus === 'pending' ? 'Fetching…' : 'Autofill'}
				</button>
			</div>
			{#if bbsStatus === 'ok' && autofill}
				<p class="text-sm text-success">
					Autofilled: “{autofill.title}”{autofill.arranger ? ` — arr. ${autofill.arranger}` : ''}.
					It will prefill whichever path you pick below.
				</p>
			{:else if bbsStatus === 'fail'}
				<p class="text-sm text-ink-muted">Couldn't autofill — you can type the details in review.</p>
			{/if}
		{:else}
			<p class="text-sm text-ink-muted">
				Autofill needs the conversion service (not configured) — you can type the details in
				review.
			</p>
		{/if}
	</section>

	{#if importError}
		<div class="border border-danger rounded p-4 bg-paper-1 space-y-2" role="alert">
			<p class="text-danger font-medium">{importError.message}</p>
			{#if importError.offerManual}
				<p class="text-sm text-ink">
					You can pick another file, or
					<button class="text-accent underline min-h-[44px]" onclick={writeItYourself}>
						write it yourself
					</button>
					instead.
				</p>
			{/if}
		</div>
	{/if}

	<!-- tiered entry, cheapest-and-best first (§6.1) -->
	<section class="space-y-3">
		<button
			class="w-full text-left card-bg border rounded p-4 min-h-[44px] hover:border-accent transition-colors"
			onclick={writeItYourself}
		>
			<span class="block font-semibold text-ink-bright">Write it yourself</span>
			<span class="block text-sm text-ink-muted mt-0.5">
				Type the notation directly — fully offline, what you type is what's stored.
			</span>
		</button>

		<button
			class="w-full text-left card-bg border rounded p-4 min-h-[44px] hover:border-accent transition-colors disabled:opacity-60"
			onclick={() => musicxmlInput?.click()}
			disabled={busy !== null}
		>
			<span class="block font-semibold text-ink-bright">
				MusicXML file
				{#if busy === 'musicxml'}<span class="text-ink-muted font-normal"> · reading…</span>{/if}
			</span>
			<span class="block text-sm text-ink-muted mt-0.5">
				.xml · .musicxml · .mxl — e.g. a MuseScore export. Perfect pitch, spelling and lyrics.
			</span>
		</button>

		<button
			class="w-full text-left card-bg border rounded p-4 min-h-[44px] hover:border-accent transition-colors disabled:opacity-60"
			onclick={() => midiInput?.click()}
			disabled={busy !== null}
		>
			<span class="block font-semibold text-ink-bright">
				MIDI file
				{#if busy === 'midi'}<span class="text-ink-muted font-normal"> · reading…</span>{/if}
			</span>
			<span class="block text-sm text-ink-muted mt-0.5">
				.mid · .midi — reliable pitch and rhythm; you may need to set the key in review.
			</span>
		</button>

		<div
			class="w-full card-bg border rounded p-4 {omrAvailable ? '' : 'opacity-60'}"
			class:border-accent={omrState === 'pending'}
		>
			<button
				class="w-full text-left min-h-[44px] disabled:cursor-not-allowed"
				onclick={() => imageInput?.click()}
				disabled={!omrAvailable || omrState === 'pending'}
			>
				<span class="block font-semibold text-ink-bright">Image (photo / GIF / PDF)</span>
				<span class="block text-sm text-ink-muted mt-0.5">
					{#if omrAvailable}
						Snap a photo or upload sheet music — best-effort conversion, always check the result.
					{:else}
						Unavailable: {omrUnavailableReason}. MusicXML, MIDI and writing it yourself still
						work.
					{/if}
				</span>
			</button>
			{#if omrState === 'pending'}
				<p class="text-sm text-accent mt-2 animate-pulse">warming up · reading the music…</p>
			{:else if omrState === 'error'}
				<div class="mt-2 space-y-2">
					<p class="text-sm text-danger">{omrError}</p>
					<div class="flex flex-wrap gap-2">
						<!-- never discard the picked file (§7.1) -->
						<button class="btn-primary min-h-[44px]" onclick={runOmr}>
							Retry{omrFile ? ` “${omrFile.name}”` : ''}
						</button>
						<button class="btn-secondary min-h-[44px]" onclick={() => imageInput?.click()}>
							Pick a different file
						</button>
						<button class="btn-secondary min-h-[44px]" onclick={writeItYourself}>
							Write it yourself
						</button>
					</div>
				</div>
			{/if}
		</div>

		<button
			class="w-full text-left card-bg border rounded p-4 min-h-[44px] hover:border-accent transition-colors disabled:opacity-60"
			onclick={() => tagfileInput?.click()}
			disabled={busy !== null}
		>
			<span class="block font-semibold text-ink-bright">
				numtags file
				{#if busy === 'tagfile'}<span class="text-ink-muted font-normal"> · reading…</span>{/if}
			</span>
			<span class="block text-sm text-ink-muted mt-0.5">
				A .md tag file (YAML frontmatter + notation) — for power users and round-trips.
			</span>
		</button>
	</section>

	<input
		bind:this={musicxmlInput}
		type="file"
		accept=".xml,.musicxml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml"
		class="hidden"
		onchange={handleMusicXML}
	/>
	<input
		bind:this={midiInput}
		type="file"
		accept=".mid,.midi,audio/midi"
		class="hidden"
		onchange={handleMIDI}
	/>
	<input
		bind:this={imageInput}
		type="file"
		accept="image/*,.gif,.pdf,application/pdf"
		class="hidden"
		onchange={handleImagePicked}
	/>
	<input bind:this={tagfileInput} type="file" accept=".md,text/markdown" class="hidden" onchange={handleTagFile} />
</div>
