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
		type Beat,
		type ParsedTag,
	} from '$lib/notation/types';
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
	}

	let { body, parsed, mode = 'wrapped', maxMeasures, fontScale = 1 }: Props = $props();

	const tag: ParsedTag = $derived(parsed ?? parse(body ?? ''));
	const showLyrics = $derived(maxMeasures === undefined);

	/* ── Layout constants (px — must mirror the CSS vars below) ─────────── */
	const BEAT_PX = $derived(Math.round(38 * fontScale)); // beat-column width
	const LABEL_PX = $derived(Math.round(26 * fontScale)); // voice-label column
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
</script>

{#snippet measureBlock(
	measure: Beat[][],
	lyricCells: (string | null)[][],
	alt: boolean,
	isPickup: boolean,
)}
	<div
		class="measure"
		class:alt
		class:pickup={isPickup}
		style="--cols: {measure[0]?.length ?? 1}"
	>
		{#each measure as voiceBeats}
			{#each voiceBeats as beat}
				<BeatCell {beat} />
			{/each}
		{/each}
		{#each lyricCells as row, li}
			{#each row as syllable}
				<div class="lyric-cell" class:lyric-sep={li === 0}>
					<span class="lyric-text">{syllable ?? ' '}</span>
				</div>
			{/each}
		{/each}
	</div>
{/snippet}

{#snippet labelCol(voiceCount: number, lyricRowCount: number, sticky: boolean)}
	<div class="labels" class:sticky>
		{#each { length: voiceCount } as _, vi}
			<div class="label-cell"><span class="label-text">{VOICE_ABBREV[vi] ?? '·'}</span></div>
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

		{#if measures.length > 0 || pickupLen > 0}
			{#if mode === 'wrapped'}
				<div class="staff-frame" class:staff-gap={si > 0}>
					{#each fitSystems(beatCounts, pickupLen) as system, sysIdx}
						<div class="system">
							{@render labelCol(voiceCount, lyricRows.length, false)}
							{#if sysIdx === 0 && pickupLen > 0}
								{@render measureBlock(
									staff.pickup,
									lyricRows.map((r) => padCells(r.pickup, pickupLen)),
									false,
									true,
								)}
							{/if}
							{#each system as mi}
								{@render measureBlock(
									measures[mi],
									lyricRows.map((r) => padCells(r.measures[mi], beatCounts[mi])),
									mi % 2 === 1,
									false,
								)}
							{/each}
						</div>
					{/each}
				</div>
			{:else}
				<div class="staff-frame scroll" class:staff-gap={si > 0}>
					<div class="strip">
						{@render labelCol(voiceCount, lyricRows.length, true)}
						{#if pickupLen > 0}
							{@render measureBlock(
								staff.pickup,
								lyricRows.map((r) => padCells(r.pickup, pickupLen)),
								false,
								true,
							)}
						{/if}
						{#each measures as measure, mi}
							{@render measureBlock(
								measure,
								lyricRows.map((r) => padCells(r.measures[mi], beatCounts[mi])),
								mi % 2 === 1,
								false,
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
		color: #d8dee9; /* nord-4 */
		min-width: 0;
	}

	.staff-gap {
		margin-top: 1.5rem;
	}

	/* Frame around one staff (carries the old renderer's look) */
	.staff-frame {
		background: #2e3440; /* nord-0 — darker than the measure blocks */
		border: 1px solid #4c566a; /* nord-3 */
		border-radius: 4px;
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
		background: #2e3440; /* nord-0, covers content scrolling beneath */
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
		color: rgba(216, 222, 233, 0.45); /* nord-4, subtle */
	}

	.label-cell.lyric-row {
		height: var(--lyric-h);
	}

	/* ── Measure blocks: beats as grid columns, voices then lyrics as rows ─ */
	.measure {
		display: grid;
		grid-template-columns: repeat(var(--cols), var(--beat-w));
		background: #3b4252; /* nord-1 */
		border-radius: 2px;
		padding: 0.15rem 3px; /* inline padding ≈ MEASURE_EXTRA */
		overflow: visible;
		flex-shrink: 0;
	}

	.measure.alt {
		background: #434c5e; /* nord-2 */
	}

	/* Pickup floats on the frame background; its right border is barline 1 */
	.measure.pickup {
		background: transparent;
		border-right: 1px solid #4c566a; /* nord-3 */
		border-radius: 0;
	}

	/* ── Lyric cells ───────────────────────────────────────────────────── */
	.lyric-cell {
		height: var(--lyric-h);
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.15em;
		padding-left: 0.1em;
		overflow: visible;
	}

	.lyric-text {
		font-size: 0.78em;
		font-weight: 700;
		white-space: nowrap;
		color: #d8dee9; /* nord-4 */
	}

	/* Separator between the last voice row and the first lyric row */
	.lyric-sep {
		border-top: 1px solid rgba(76, 86, 106, 0.5); /* nord-3, subtle */
	}
</style>
