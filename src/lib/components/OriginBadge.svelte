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
		class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-nord-9 bg-opacity-20 text-nord-9 whitespace-nowrap"
	>
		{label}
	</span>
{/if}
