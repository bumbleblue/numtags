<!--
	BeatCell — one beat-grid cell, rendered from a semantic Beat token
	(FABLE_SPEC §4.4, §9). Every mark is CSS-drawn: octave dots above/below,
	subdivision ticks, the tie arc. No font combining characters anywhere —
	only ordinary glyphs (digits, ♯ ♭, · X 0 -) appear as text.

	§9 disambiguation (octave-down dots vs subdivision tick), exact approach:
	the two marks live in separate, fixed vertical bands below the digit and
	have distinct shapes —
	  · subdivision ticks: short straight horizontal LINES (0.55em × 0.1em),
	    hugging the digit at top: calc(100% + 0.1em);
	  · octave-down dots: small round DOTS (0.2em ø, steel blue nord-9) in a
	    lower band at top: calc(100% + 0.5em) — below even a double tick
	    (which ends at ≈0.4em).
	A digit that is both subdivided and octave-down shows tick(s) first, then
	dots clearly beneath, never one smudge.
-->
<script lang="ts">
	import type { Beat } from '$lib/notation/types';

	let { beat, active = false }: { beat: Beat; active?: boolean } = $props();

	const octave = $derived(beat.octave ?? 0);
	const upDots = $derived(octave > 0 ? octave : 0);
	const downDots = $derived(octave < 0 ? -octave : 0);
	const ticks = $derived(beat.subdivision ?? 0);
</script>

{#if beat.kind === 'note'}
	<div class="cell note" class:playhead={active} class:oct-up={upDots > 0} class:oct-down={downDots > 0}>
		<span class="glyph">
			{#if beat.tiedFromPrev}<span class="tie" aria-hidden="true"></span>{/if}
			{#if beat.accidental}<span class="acc">{beat.accidental === 'sharp' ? '♯' : '♭'}</span>{/if}
			<span class="digit">
				{beat.degree}
				{#if upDots > 0}
					<span class="marks above">
						{#each { length: upDots } as _}<i class="odot up"></i>{/each}
					</span>
				{/if}
				{#if ticks > 0}
					<span class="marks tickband">
						{#each { length: ticks } as _}<i class="tick"></i>{/each}
					</span>
				{/if}
				{#if downDots > 0}
					<span class="marks below">
						{#each { length: downDots } as _}<i class="odot down"></i>{/each}
					</span>
				{/if}
			</span>{#if beat.dotted}<span class="dotafter">·</span>{/if}
		</span>
	</div>
{:else if beat.kind === 'hold'}
	<div class="cell hold" class:playhead={active}>-</div>
{:else if beat.kind === 'rest'}
	<div class="cell rest" class:playhead={active}>0</div>
{:else if beat.kind === 'posted'}
	<div class="cell posted" class:playhead={active}>X</div>
{:else if beat.kind === 'invalid'}
	<div class="cell invalid" class:playhead={active} title="Unparseable token: {beat.raw}">
		<span class="invalid-text">{beat.raw}</span>
	</div>
{:else}
	<div class="cell empty" class:playhead={active}>&nbsp;</div>
{/if}

<style>
	.cell {
		height: var(--row-h, 2.6em);
		display: flex;
		align-items: center;
		justify-content: flex-end; /* digit column right-aligned: ♯/♭ sit left, never shift the digit */
		padding-right: 0.45em;
		position: relative;
		font-weight: 700;
		line-height: 1;
		color: var(--ink); /* home octave */
		overflow: visible;
	}

	/* Follow-along playhead: an ink-tint wash on the sounding cell(s) */
	.playhead {
		background: color-mix(in srgb, var(--ink) 16%, transparent);
		border-radius: 2px;
	}

	.glyph {
		position: relative;
		display: inline-flex;
		align-items: baseline;
	}

	.digit {
		position: relative;
		display: inline-block;
	}

	.acc {
		font-size: 0.8em;
		margin-right: 0.05em;
	}

	/* Out of flow so a dotted digit stays column-aligned with plain digits;
	   the dot overhangs into the cell's 0.45em right padding. */
	.dotafter {
		position: absolute;
		left: calc(100% + 0.08em);
	}

	/* Octave colour cues (§9, secondary to the marks) */
	.oct-up {
		color: var(--ink-bright);
	}
	.oct-down {
		color: var(--note-alt);
	}

	/* ── CSS-drawn marks, centred on the digit ─────────────────────────── */
	.marks {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		pointer-events: none;
	}

	/* octave-up dots: stacked above the digit */
	.marks.above {
		bottom: calc(100% + 0.14em);
		row-gap: 0.12em;
	}

	/* subdivision ticks: straight lines hugging the digit underneath (band 1) */
	.marks.tickband {
		top: calc(100% + 0.1em);
		row-gap: 0.1em;
	}

	/* octave-down dots: round dots in a lower band (band 2, below any tick) */
	.marks.below {
		top: calc(100% + 0.5em);
		row-gap: 0.12em;
	}

	.odot {
		width: 0.2em;
		height: 0.2em;
		border-radius: 9999px;
	}
	.odot.up {
		background: var(--ink-bright);
	}
	.odot.down {
		background: var(--note-alt);
	}

	.tick {
		width: 0.55em;
		height: 0.1em;
		border-radius: 0.05em;
		background: color-mix(in srgb, var(--ink) 85%, transparent); /* line shape, neutral colour */
	}

	/* Tie arc ⌒ entering the cell from the left (CSS border arc, no glyph) */
	.tie {
		position: absolute;
		right: calc(100% + 0.05em);
		top: -0.05em;
		width: 0.75em;
		height: 0.5em;
		border: 0.1em solid transparent;
		border-bottom: none;
		border-top-color: currentColor;
		border-top-left-radius: 50% 100%;
		border-top-right-radius: 50% 100%;
		opacity: 0.7;
	}

	/* ── Non-note cells ────────────────────────────────────────────────── */
	.hold {
		opacity: 0.5;
	}
	.posted {
		opacity: 0.4;
		font-style: italic;
	}
	.rest {
		opacity: 0.45;
	}
	.empty {
		opacity: 0.1;
	}

	.invalid {
		background: color-mix(in srgb, var(--error) 12%, transparent);
		border-radius: 2px;
		justify-content: center;
		cursor: help;
	}
	.invalid-text {
		font-size: 0.85em;
		text-decoration: underline wavy var(--error);
		text-decoration-thickness: 0.08em;
		text-underline-offset: 0.2em;
	}
</style>
