<!--
	Hidden dev/demo route for the notation renderer (no nav link).
	(a) A torture-test body exercising every token type, in both layout
	    modes side by side plus a mode toggle.
	(b) The FABLE_SPEC §3.4 worked example.
-->
<script lang="ts">
	import NotationRenderer from '$lib/components/notation/NotationRenderer.svelte';
	import { parse } from '$lib/notation/parse';

	// Every token type: pickup, accidentals (#2 b3 b6 b7), stacked octaves up
	// (5'') and down (1,, b7,,), subdivision / and //, the §9 combined case
	// (3,/ and 3,//: subdivided AND octave-down), dotted (3. 4. 5.), ties
	// incl. across the m1→m2 barline (Lead ~5), posted (X XX), rests, holds,
	// an invalid token (qq), 2 staffs, stacked lyric rows (inline + attached
	// lyric-only block) with _ held beats and hyphen syllable splits.
	const torture = `T: 2/ 3/ | 1' - #2' ~#2' | b3 3. 3,/ -    | 5'' 0 - X
L: 7, 1   | 5 - 5 5       | ~5 5/ b6 -     | 1' 0 - X
B: 0 -    | 3 - #2 ~#2    | 3,// 3,// 4. - | 3 0 - X
Bs: 1, 1, | 1, - 1,, ~1,, | b7,, qq 4, -   | 1,, 0 - X
Oh my dar-ling sweet _ a-do-line my dear _ _ love!

What a won-der-ful day _ to sing this old _ _ tag!

3 3 | 4 ~4 - - | 5. 4/ 3/ - | XX
1 1 | 1 ~7, - - | 1 - ~1 - | XX
5, 5, | 6, ~5, - - | 3, 4, 5, - | XX
1, 1, | 4, ~2, - - | 1, - 1,, - | XX
Way down south _ _ in dix-ie _ land _`;

	// §3.4 worked example (leading | added: the spec writes the first four
	// beats as measure 1, and beats before the first | would parse as pickup).
	const worked = `Tenor: | 3 - 3 - | 4 ~4 3 - |
Lead: | 1 - 1 - | 1 ~7, 1 - |
Baritone: | 5, - b7, - | 6, ~5, 5, - |
Bass: | 1, - 5, - | 4, ~2, 1, - |
My _ town, _ my _ town. _`;

	let mode: 'wrapped' | 'continuous' = $state('wrapped');
	const warnings = $derived(parse(torture).warnings);
</script>

<svelte:head>
	<title>notation renderer — dev</title>
</svelte:head>

<div class="space-y-10">
	<header class="space-y-1">
		<h1 class="text-2xl font-bold text-nord-6">Notation renderer — dev</h1>
		<p class="text-sm text-nord-4">
			Torture test + §3.4 worked example. Check: octave-down dots vs subdivision ticks must read
			as two distinct marks (Tenor <code class="font-mono">3,/</code>, Baritone
			<code class="font-mono">3,//</code>).
		</p>
	</header>

	<section class="space-y-3">
		<div class="flex items-center gap-3">
			<h2 class="text-lg font-semibold text-nord-6">Torture test</h2>
			<div class="inline-flex rounded border border-nord-3 overflow-hidden text-sm">
				<button
					class="px-3 py-1 {mode === 'wrapped' ? 'bg-nord-8 text-nord-0' : 'bg-nord-1 text-nord-4'}"
					onclick={() => (mode = 'wrapped')}
				>
					Wrapped
				</button>
				<button
					class="px-3 py-1 {mode === 'continuous'
						? 'bg-nord-8 text-nord-0'
						: 'bg-nord-1 text-nord-4'}"
					onclick={() => (mode = 'continuous')}
				>
					Scroll
				</button>
			</div>
		</div>
		<NotationRenderer body={torture} {mode} />
		{#if warnings.length > 0}
			<ul class="text-xs text-nord-12 list-disc list-inside">
				{#each warnings as w}
					<li>{w.message}{w.line !== undefined ? ` (line ${w.line})` : ''}</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-nord-6">Both modes side by side</h2>
		<div class="grid gap-6 lg:grid-cols-2 items-start">
			<div class="space-y-1 min-w-0">
				<h3 class="text-sm text-nord-4">wrapped (§8.1)</h3>
				<NotationRenderer body={torture} mode="wrapped" />
			</div>
			<div class="space-y-1 min-w-0">
				<h3 class="text-sm text-nord-4">continuous (§8.2)</h3>
				<NotationRenderer body={torture} mode="continuous" />
			</div>
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-nord-6">§3.4 worked example</h2>
		<NotationRenderer body={worked} {mode} />
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-nord-6">Card preview (maxMeasures = 2)</h2>
		<div class="max-w-sm">
			<NotationRenderer body={torture} mode="wrapped" maxMeasures={2} />
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-nord-6">fontScale = 1.3</h2>
		<NotationRenderer body={worked} mode="wrapped" fontScale={1.3} />
	</section>
</div>
