<!--
	NotationRenderer — renders a parsed tag (FABLE_SPEC §3/§4.4) in the two
	mobile layout modes of §8:

	  · wrapped (default): printed-choral-style systems. Whole measures are
	    greedy-fit into the available width (measured via ResizeObserver);
	    a measure is never split across systems. Scrolls down only.
	  · continuous: one horizontal strip per staff, overflow-x scroll with
	    momentum, voices + lyrics locked as one block, sticky voice labels.

	Both modes consume the same parsed model; only wrapping differs. All
	notation marks are CSS-drawn by BeatCell from semantic tokens (§9).
-->
<script lang="ts">
	import { parse } from '$lib/notation/parse';
	import {
		VOICE_ABBREV,
		VOICE_NAMES,
		type Beat,
		type ParsedTag,
	} from '$lib/notation/types';
	import type { Playhead } from '$lib/audio/player.svelte';
	import BeatCell from './BeatCell.svelte';

	interface Props {
		/** Canonical ASCII notation body — parsed internally. */
		body?: string;
		/** Pre-parsed tag; takes precedence over `body` when given. */
		parsed?: ParsedTag;
		mode?: 'wrapped' | 'continuous';
		/** Truncate each staff to N measures (card previews; lyrics hidden). */
		maxMeasures?: number;
		fontScale?: number;
		/**
		 * Beat-anchored lyric editing (§6.5/§6.6): when set, lyric rows render
		 * as per-beat inputs fed from `lyricCells` ([staff][row][flatBeat])
		 * instead of the parsed lyric lines. Tab continues a word (appends a
		 * hyphen and moves on), Space starts the next word, Backspace on an
		 * empty cell steps back.
		 */
		editableLyrics?: boolean;
		lyricCells?: string[][][];
		onlyricinput?: (staff: number, row: number, flat: number, value: string) => void;
		/**
		 * Playback (spec §6.9): `onplayvoice` turns the voice labels into
		 * play/stop buttons (revealed on staff hover; always faintly visible on
		 * touch). `playhead` washes the sounding column — all voices for the
		 * full mix, one row when `playhead.voice` is set. `playingVoice` marks
		 * which solo voice is sounding so its label shows stop.
		 */
		playhead?: Playhead | null;
		playingVoice?: number | null;
		onplayvoice?: (voice: number) => void;
	}

	let {
		body,
		parsed,
		mode = 'wrapped',
		maxMeasures,
		fontScale = 1,
		editableLyrics = false,
		lyricCells,
		onlyricinput,
		playhead = null,
		playingVoice = null,
		onplayvoice,
	}: Props = $props();

	const tag: ParsedTag = $derived(parsed ?? parse(body ?? ''));
	const showLyrics = $derived(maxMeasures === undefined);

	/* ── Layout constants (px — must mirror the CSS vars below) ─────────── */
	// Edit mode widens beat columns so syllables fit their inputs (inputs
	// can't overhang the way rendered spans do); wrapping refits automatically.
	const BEAT_PX = $derived(Math.round((editableLyrics ? 56 : 38) * fontScale));
	// Voice-label column; wider when labels double as play buttons.
	const LABEL_PX = $derived(Math.round((onplayvoice ? 42 : 26) * fontScale));
	const MEASURE_EXTRA = 8; // measure block inline padding + border
	const MEASURE_GAP = 2; // column-gap between blocks in a system
	const FRAME_PAD = 16; // staff frame inline padding + border

	/* ── Container width (wrapped mode greedy-fit input) ────────────────── */
	let container: HTMLDivElement | undefined = $state();
	let containerWidth = $state(0);

	$effect(() => {
		if (!container) return;
		const ro = new ResizeObserver((entries) => {
			containerWidth = entries[0].contentRect.width;
		});
		ro.observe(container);
		return () => ro.disconnect();
	});

	/** Width available for measure blocks inside a system. */
	const availWidth = $derived(
		Math.max((containerWidth || 360) - LABEL_PX - FRAME_PAD, BEAT_PX * 2),
	);

	/**
	 * Greedy-fit whole measures into systems (§8.1). Returns arrays of
	 * measure indices. The pickup occupies the start of system 1 and the
	 * first measure always joins it (a measure is never split; an oversize
	 * measure gets a system of its own and may overflow).
	 */
	function fitSystems(beatCounts: number[], pickupLen: number): number[][] {
		const systems: number[][] = [];
		let cur: number[] = [];
		let used = pickupLen > 0 ? pickupLen * BEAT_PX + MEASURE_EXTRA + MEASURE_GAP : 0;
		for (let mi = 0; mi < beatCounts.length; mi++) {
			const w = beatCounts[mi] * BEAT_PX + MEASURE_EXTRA;
			if (cur.length > 0 && used + MEASURE_GAP + w > availWidth) {
				systems.push(cur);
				cur = [];
				used = 0;
			}
			cur.push(mi);
			used += (used > 0 ? MEASURE_GAP : 0) + w;
		}
		if (cur.length > 0) systems.push(cur);
		return systems;
	}

	/** Pad/trim a lyric row's cells to exactly the measure's beat count. */
	function padCells(cells: (string | null)[] | undefined, len: number): (string | null)[] {
		const c = cells ?? [];
		return c.length === len
			? c
			: [...c.slice(0, len), ...Array(Math.max(0, len - c.length)).fill(null)];
	}

	/** Slice `len` cells out of a flat per-beat array starting at `off`. */
	function sliceFlat(row: string[], off: number, len: number): string[] {
		return Array.from({ length: len }, (_, i) => row[off + i] ?? '');
	}

	/** Flat-beat offset of each measure (pickup occupies 0..pickupLen-1). */
	function measureOffsets(beatCounts: number[], pickupLen: number): number[] {
		const out: number[] = [];
		let acc = pickupLen;
		for (const n of beatCounts) {
			out.push(acc);
			acc += n;
		}
		return out;
	}

	/* ── Lyric-input keyboard navigation (edit mode) ─────────────────────── */
	function focusLyric(si: number, ri: number, flat: number): boolean {
		const el = container?.querySelector<HTMLInputElement>(
			`input[data-lyric="${si}:${ri}:${flat}"]`,
		);
		if (!el) return false;
		el.focus();
		el.select();
		return true;
	}

	function lyricKeydown(e: KeyboardEvent, si: number, ri: number, flat: number) {
		const input = e.currentTarget as HTMLInputElement;
		if (e.key === 'Tab') {
			// Tab continues the word: hyphenate this syllable, move to the next
			// beat. At either end, fall through to natural tab order.
			if (!e.shiftKey && input.value.trim() && !input.value.endsWith('-')) {
				onlyricinput?.(si, ri, flat, input.value + '-');
			}
			if (focusLyric(si, ri, flat + (e.shiftKey ? -1 : 1))) e.preventDefault();
		} else if (e.key === ' ') {
			e.preventDefault(); // syllables never contain spaces — space = next word
			focusLyric(si, ri, flat + 1);
		} else if (e.key === 'Backspace' && input.value === '') {
			if (focusLyric(si, ri, flat - 1)) e.preventDefault();
		} else if (
			e.key === 'ArrowRight' &&
			input.selectionStart === input.value.length &&
			input.selectionEnd === input.selectionStart
		) {
			if (focusLyric(si, ri, flat + 1)) e.preventDefault();
		} else if (e.key === 'ArrowLeft' && input.selectionStart === 0 && input.selectionEnd === 0) {
			if (focusLyric(si, ri, flat - 1)) e.preventDefault();
		}
	}
</script>

{#snippet measureBlock(
	measure: Beat[][],
	lyricSlices: (string | null)[][],
	alt: boolean,
	isPickup: boolean,
	si: number,
	flatOffset: number,
)}
	<div
		class="measure"
		class:alt
		class:pickup={isPickup}
		style="--cols: {measure[0]?.length ?? 1}"
	>
		{#each measure as voiceBeats, vi}
			{#each voiceBeats as beat, ci}
				<BeatCell
					{beat}
					active={playhead !== null &&
						playhead.staff === si &&
						playhead.col === flatOffset + ci &&
						(playhead.voice === null || playhead.voice === vi)}
				/>
			{/each}
		{/each}
		{#each lyricSlices as row, li}
			{#each row as syllable, ci}
				<div class="lyric-cell" class:lyric-sep={li === 0}>
					{#if editableLyrics}
						<input
							class="lyric-input"
							type="text"
							value={syllable ?? ''}
							data-lyric="{si}:{li}:{flatOffset + ci}"
							spellcheck="false"
							autocapitalize="off"
							autocomplete="off"
							aria-label="Syllable for beat {flatOffset + ci + 1}, row {li + 1}"
							oninput={(e) => onlyricinput?.(si, li, flatOffset + ci, e.currentTarget.value)}
							onkeydown={(e) => lyricKeydown(e, si, li, flatOffset + ci)}
						/>
					{:else}
						<span class="lyric-text">{syllable ?? ' '}</span>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
{/snippet}

{#snippet labelCol(voiceCount: number, lyricRowCount: number, sticky: boolean)}
	<div class="labels" class:sticky>
		{#each { length: voiceCount } as _, vi}
			{#if onplayvoice && vi < VOICE_NAMES.length}
				<button
					class="label-cell play-btn"
					onclick={() => onplayvoice(vi)}
					aria-label="{playingVoice === vi ? 'Stop' : 'Play'} {VOICE_NAMES[vi]}"
					aria-pressed={playingVoice === vi}
				>
					<span class="label-text">{VOICE_ABBREV[vi] ?? '·'}</span>
					<span
						class="play-glyph"
						class:stop={playingVoice === vi}
						class:on={playingVoice === vi}
						aria-hidden="true"
					></span>
				</button>
			{:else}
				<div class="label-cell"><span class="label-text">{VOICE_ABBREV[vi] ?? '·'}</span></div>
			{/if}
		{/each}
		{#each { length: lyricRowCount } as _, li}
			<div class="label-cell lyric-row" class:lyric-sep={li === 0}></div>
		{/each}
	</div>
{/snippet}

<div
	class="renderer font-mono"
	bind:this={container}
	style="--beat-w: {BEAT_PX}px; --label-w: {LABEL_PX}px; font-size: calc(1.05rem * {fontScale});"
>
	{#each tag.staffs as staff, si}
		{@const measures =
			maxMeasures !== undefined ? staff.measures.slice(0, maxMeasures) : staff.measures}
		{@const pickupLen = staff.pickup[0]?.length ?? 0}
		{@const voiceCount = (measures[0] ?? staff.pickup).length}
		{@const beatCounts = measures.map((m) => m[0]?.length ?? 1)}
		{@const lyricRows = showLyrics ? staff.lyricRows : []}
		{@const editRows = editableLyrics ? (lyricCells?.[si] ?? []) : null}
		{@const offsets = measureOffsets(beatCounts, pickupLen)}
		{@const rowCount = editRows ? editRows.length : lyricRows.length}
		{@const pickupSlices = editRows
			? editRows.map((r) => sliceFlat(r, 0, pickupLen))
			: lyricRows.map((r) => padCells(r.pickup, pickupLen))}

		{#if measures.length > 0 || pickupLen > 0}
			{#if mode === 'wrapped'}
				<div class="staff-frame" class:staff-gap={si > 0}>
					{#each fitSystems(beatCounts, pickupLen) as system, sysIdx}
						<div class="system">
							{@render labelCol(voiceCount, rowCount, false)}
							{#if sysIdx === 0 && pickupLen > 0}
								{@render measureBlock(staff.pickup, pickupSlices, false, true, si, 0)}
							{/if}
							{#each system as mi}
								{@render measureBlock(
									measures[mi],
									editRows
										? editRows.map((r) => sliceFlat(r, offsets[mi], beatCounts[mi]))
										: lyricRows.map((r) => padCells(r.measures[mi], beatCounts[mi])),
									mi % 2 === 1,
									false,
									si,
									offsets[mi],
								)}
							{/each}
						</div>
					{/each}
				</div>
			{:else}
				<div class="staff-frame scroll" class:staff-gap={si > 0}>
					<div class="strip">
						{@render labelCol(voiceCount, rowCount, true)}
						{#if pickupLen > 0}
							{@render measureBlock(staff.pickup, pickupSlices, false, true, si, 0)}
						{/if}
						{#each measures as measure, mi}
							{@render measureBlock(
								measure,
								editRows
									? editRows.map((r) => sliceFlat(r, offsets[mi], beatCounts[mi]))
									: lyricRows.map((r) => padCells(r.measures[mi], beatCounts[mi])),
								mi % 2 === 1,
								false,
								si,
								offsets[mi],
							)}
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	{/each}
</div>

<style>
	.renderer {
		/* Geometry shared with BeatCell via CSS custom properties.
		   --beat-w / --label-w are set inline (px) so the JS greedy-fit
		   arithmetic and the CSS agree exactly. */
		--row-h: 2.6em; /* room for octave dots above + tick/dot bands below */
		--lyric-h: 1.5em;
		color: var(--ink);
		min-width: 0;
	}

	.staff-gap {
		margin-top: 1.5rem;
	}

	/* Frame around one staff (carries the old renderer's look) */
	.staff-frame {
		background: var(--paper-0); /* darker than the measure blocks */
		border: 1px solid var(--paper-3);
		border-radius: 2px;
		padding: 0.35rem;
	}

	/* ── Wrapped mode (§8.1) ───────────────────────────────────────────── */
	.staff-frame:not(.scroll) {
		display: flex;
		flex-direction: column;
		row-gap: 1.6rem; /* generous gap between systems */
		overflow-x: auto; /* safety net for a single oversize measure */
	}

	.system {
		display: flex;
		align-items: flex-start;
		column-gap: 2px; /* = MEASURE_GAP */
	}

	/* ── Continuous mode (§8.2) ────────────────────────────────────────── */
	.staff-frame.scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch; /* momentum scrolling */
	}

	.strip {
		display: inline-flex;
		align-items: flex-start;
		column-gap: 2px;
		min-width: max-content; /* voices + lyrics locked as one block */
	}

	/* ── Voice-label column ────────────────────────────────────────────── */
	.labels {
		display: grid;
		grid-template-columns: var(--label-w);
		padding: 0.15rem 0;
		flex-shrink: 0;
	}

	.labels.sticky {
		position: sticky;
		left: 0;
		z-index: 2;
		background: var(--paper-0); /* covers content scrolling beneath */
	}

	/* NOTE: cells that size themselves with var(--row-h)/var(--lyric-h) must
	   keep font-size: 1em (em-based vars resolve at the use site) — smaller
	   text goes on inner spans so every block's rows stay the same height. */
	.label-cell {
		height: var(--row-h);
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 0.45em;
	}

	.label-text {
		font-size: 0.6em;
		font-weight: 400;
		color: color-mix(in srgb, var(--ink) 45%, transparent);
	}

	.label-cell.lyric-row {
		height: var(--lyric-h);
	}

	/* ── Voice play buttons (labels double as play/stop) ──────────────────
	   Desktop: glyphs appear when hovering the staff. Touch (no hover):
	   always faintly visible. The playing voice's stop glyph always shows. */
	button.play-btn {
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		gap: 0.3em;
		padding-left: 0.2em;
	}

	.play-btn:hover .label-text,
	.play-btn[aria-pressed='true'] .label-text {
		color: var(--ink);
	}

	.play-glyph {
		flex-shrink: 0;
		width: 0;
		height: 0;
		border-left: 0.42em solid var(--ink-muted);
		border-top: 0.3em solid transparent;
		border-bottom: 0.3em solid transparent;
		opacity: 0;
		transition: opacity 120ms;
	}

	.play-glyph.stop {
		width: 0.55em;
		height: 0.55em;
		border: none;
		background: var(--ink);
	}

	.staff-frame:hover .play-glyph,
	.play-btn:focus-visible .play-glyph,
	.play-glyph.on {
		opacity: 1;
	}

	@media (hover: none) {
		.play-glyph {
			opacity: 0.45;
		}
		.play-glyph.on {
			opacity: 1;
		}
	}

	/* ── Measure blocks: beats as grid columns, voices then lyrics as rows ─ */
	.measure {
		display: grid;
		grid-template-columns: repeat(var(--cols), var(--beat-w));
		background: var(--paper-1);
		border-radius: 2px;
		padding: 0.15rem 3px; /* inline padding ≈ MEASURE_EXTRA */
		overflow: visible;
		flex-shrink: 0;
	}

	.measure.alt {
		background: var(--paper-2);
	}

	/* Pickup floats on the frame background; its right border is barline 1 */
	.measure.pickup {
		background: transparent;
		border-right: 1px solid var(--paper-3);
		border-radius: 0;
	}

	/* ── Lyric cells ───────────────────────────────────────────────────────
	   Right-aligned to the same anchor as the note cells: digits end 0.45em
	   from the column's right edge (modifiers extend left), so syllables do
	   too — each syllable lines up under its note. Long syllables overhang
	   leftward, like accidentals. */
	.lyric-cell {
		height: var(--lyric-h);
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		padding-bottom: 0.15em;
		padding-right: 0.45em;
		overflow: visible;
	}

	.lyric-text {
		font-size: 0.7em;
		font-weight: 700;
		white-space: nowrap;
		color: var(--lyric);
	}

	/* Separator between the last voice row and the first lyric row */
	.lyric-sep {
		border-top: 1px solid color-mix(in srgb, var(--paper-3) 50%, transparent);
	}

	/* ── Lyric inputs (edit mode): same anchor + type as .lyric-text ────── */
	.lyric-input {
		width: 100%;
		min-width: 0;
		background: transparent;
		border: none;
		border-bottom: 1px dashed color-mix(in srgb, var(--lyric) 35%, transparent);
		border-radius: 0;
		padding: 0 0 0.05em;
		text-align: right;
		font: inherit;
		font-size: 0.7em;
		font-weight: 700;
		color: var(--lyric);
	}

	.lyric-input:focus {
		outline: none;
		border-bottom: 1px solid var(--amber);
		background: color-mix(in srgb, var(--amber) 10%, transparent);
	}
</style>
