<!-- Small badge naming where a local tag came from (spec §7 Library: origin badge). -->
<script lang="ts">
	import type { TagOrigin } from '$lib/types';

	interface Props {
		origin?: TagOrigin;
	}

	let { origin }: Props = $props();

	const LABELS: Record<TagOrigin, string> = {
		catalog: 'Catalog',
		authored: 'Written by you',
		'imported-musicxml': 'MusicXML',
		'imported-midi': 'MIDI',
		'imported-image': 'Image',
	};

	const label = $derived(origin ? LABELS[origin] : undefined);
</script>

{#if label && origin !== 'catalog'}
	<span
		class="inline-flex items-center border border-nord-3 rounded px-1.5 py-0.5 text-xs text-nord-7 whitespace-nowrap"
	>
		{label}
	</span>
{/if}
