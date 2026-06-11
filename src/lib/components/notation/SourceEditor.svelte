<!--
	SourceEditor — the notation-source textarea of the review screen
	(FABLE_SPEC §6.5/§6.6), with the syntax-error affordances people need
	while learning the notation and the input system at once:

	  · red squiggles under the offending tokens IN the input (a backdrop
	    div mirrors the text behind a transparent textarea; only the error
	    ranges are visible, as wavy underlines);
	  · a plain-language error list below — each entry says what to type
	    instead and clicking it selects the offending token.

	Squiggle ranges come from parse warnings (line/col/token). The preview
	re-parses debounced, so a range is drawn only if the token still sits
	at its recorded position — stale positions just skip a frame.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import type { ParseWarning } from '$lib/notation/types';

	interface Props {
		value: string;
		/** Structured parse warnings (squiggles + list). */
		warnings?: ParseWarning[];
		/** Position-less warnings (e.g. beat-count mismatches) for the list. */
		extraWarnings?: string[];
		oninput?: () => void;
		/** Called on blur / after paste (lenient normalize, §6.6). */
		onnormalize?: () => void;
	}

	let {
		value = $bindable(),
		warnings = [],
		extraWarnings = [],
		oninput,
		onnormalize,
	}: Props = $props();

	let textareaEl = $state<HTMLTextAreaElement>();
	let backdropEl = $state<HTMLDivElement>();

	const lines = $derived(value.split('\n'));

	// ── glyph toolbar (§6.6 discoverability), grouped semantically ───────
	const GLYPH_GROUPS: { label: string; glyphs: [string, string][] }[] = [
		{
			label: 'notes',
			glyphs: [
				['#', 'sharp (before the digit: #5)'],
				['b', 'flat (before the digit: b3)'],
				["'", 'octave up (after the digit: 5\')'],
				[',', 'octave down (after the digit: 5,)'],
			],
		},
		{
			label: 'rhythm',
			glyphs: [
				['-', 'hold the note one more beat'],
				['.', 'dotted (add half)'],
				['/', 'eighth (// = sixteenth)'],
				['0', 'rest'],
				['|', 'barline'],
			],
		},
		{
			label: 'holds',
			glyphs: [
				['~', 'tie (before the note it ties into: ~5)'],
				['x', 'posted — hold until the director cuts'],
				['_', 'held lyric beat'],
			],
		},
	];

	async function insertGlyph(glyph: string) {
		const el = textareaEl;
		const start = el?.selectionStart ?? value.length;
		const end = el?.selectionEnd ?? start;
		value = value.slice(0, start) + glyph + value.slice(end);
		oninput?.();
		await tick();
		if (el) {
			el.focus();
			el.selectionStart = el.selectionEnd = start + glyph.length;
		}
	}

	// ── squiggle ranges (verified against the current text) ──────────────
	interface Seg {
		text: string;
		error: boolean;
	}

	function lineMarkers(lineNo: number): ParseWarning[] {
		return warnings
			.filter(
				(w) =>
					w.line === lineNo &&
					w.col !== undefined &&
					w.token !== undefined &&
					// only mark a range the token still occupies (debounce lag)
					lines[lineNo - 1]?.slice(w.col, w.col + w.token.length) === w.token,
			)
			.sort((a, b) => a.col! - b.col!);
	}

	function segmentsOf(line: string, lineNo: number): Seg[] {
		const segs: Seg[] = [];
		let pos = 0;
		for (const w of lineMarkers(lineNo)) {
			if (w.col! < pos) continue; // overlapping duplicate (same token twice)
			if (w.col! > pos) segs.push({ text: line.slice(pos, w.col), error: false });
			segs.push({ text: w.token!, error: true });
			pos = w.col! + w.token!.length;
		}
		if (pos < line.length) segs.push({ text: line.slice(pos), error: false });
		return segs;
	}

	function syncScroll() {
		if (!textareaEl || !backdropEl) return;
		backdropEl.scrollTop = textareaEl.scrollTop;
		backdropEl.scrollLeft = textareaEl.scrollLeft;
	}

	// ── click an error → select the offending token ──────────────────────
	function jumpTo(w: ParseWarning) {
		const el = textareaEl;
		if (!el || w.line === undefined) return;
		const lineStart = lines
			.slice(0, w.line - 1)
			.reduce((sum, l) => sum + l.length + 1, 0);
		const start = lineStart + (w.col ?? 0);
		el.focus();
		el.setSelectionRange(start, start + (w.token?.length ?? 0));
	}

	const hasWarnings = $derived(warnings.length > 0 || extraWarnings.length > 0);
</script>

<div class="space-y-2">
	<div class="flex flex-wrap gap-x-4 gap-y-2" role="toolbar" aria-label="Insert notation glyph">
		{#each GLYPH_GROUPS as group}
			<div class="glyph-group" aria-label={group.label}>
				<div class="flex gap-1">
					{#each group.glyphs as [g, hint]}
						<button
							class="btn-secondary !px-0 w-11 min-h-[44px] font-mono text-base"
							title={hint}
							aria-label="{g} — {hint}"
							onclick={() => insertGlyph(g)}>{g}</button
						>
					{/each}
				</div>
				<span class="glyph-group-label">{group.label}</span>
			</div>
		{/each}
	</div>

	<div
		class="editor-shell relative rounded border border-nord-3 bg-nord-1 focus-within:ring-2 focus-within:ring-nord-8"
	>
		<!-- mirror layer: transparent text, visible squiggles -->
		<div bind:this={backdropEl} class="backdrop font-mono text-sm leading-relaxed p-3" aria-hidden="true">
			{#each lines as line, i}<div class="bline">{#each segmentsOf(line, i + 1) as seg}{#if seg.error}<span
								class="sq">{seg.text}</span
							>{:else}{seg.text}{/if}{/each}{#if line === ''}&nbsp;{/if}</div>{/each}
		</div>
		<textarea
			bind:this={textareaEl}
			bind:value
			oninput={oninput}
			onblur={onnormalize}
			onpaste={() => setTimeout(() => onnormalize?.())}
			onscroll={syncScroll}
			rows={Math.max(6, lines.length + 2)}
			spellcheck="false"
			autocapitalize="off"
			autocomplete="off"
			class="relative block w-full font-mono text-sm leading-relaxed p-3 bg-transparent text-nord-4 border-none focus:outline-none focus:ring-0 whitespace-pre overflow-x-auto resize-none"
			aria-label="Notation source — voice lines only (ASCII shorthand)"
		></textarea>
	</div>

	{#if hasWarnings}
		<ul class="space-y-1" aria-live="polite">
			{#each warnings as w}
				<li>
					<button
						type="button"
						class="err-item w-full text-left text-sm text-nord-4 rounded px-2 py-1.5 flex gap-2 items-baseline"
						onclick={() => jumpTo(w)}
						title="Click to select the token in the source"
					>
						{#if w.line !== undefined}
							<span class="shrink-0 font-mono text-xs text-nord-5">line {w.line}</span>
						{/if}
						<span>{w.message}</span>
					</button>
				</li>
			{/each}
			{#each extraWarnings as msg}
				<li class="text-sm text-nord-4 px-2 py-1.5 flex gap-2 items-baseline">
					<span class="shrink-0 font-mono text-xs text-nord-5">rhythm</span>
					<span>{msg}</span>
				</li>
			{/each}
		</ul>
	{:else if value.trim()}
		<p class="text-xs text-nord-5 px-2" aria-live="polite">No syntax errors.</p>
	{/if}
</div>

<style>
	/* The backdrop must mirror the textarea's metrics exactly (same font,
	   size, leading, padding — set via the same utility classes) so each
	   squiggle sits under its token. */
	.backdrop {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		color: transparent;
		white-space: pre;
	}

	.bline {
		min-height: 1.625em; /* = leading-relaxed line box */
	}

	.sq {
		text-decoration: underline wavy var(--error);
		text-decoration-thickness: 0.08em;
		text-underline-offset: 0.25em;
		background: color-mix(in srgb, var(--error) 14%, transparent);
		border-radius: 2px;
	}

	.err-item {
		border-left: 2px solid var(--error);
		background: color-mix(in srgb, var(--error) 7%, transparent);
	}

	.err-item:hover {
		background: color-mix(in srgb, var(--error) 14%, transparent);
	}

	.glyph-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		row-gap: 0.15rem;
	}

	.glyph-group-label {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		color: color-mix(in srgb, var(--ink) 45%, transparent);
	}
</style>
