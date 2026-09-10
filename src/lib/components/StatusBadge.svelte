<!-- Marks catalog entries converted by machine and not yet checked by a person. -->
<script lang="ts">
	import type { TagStatus } from '$lib/types';

	interface Props {
		status?: TagStatus;
	}

	let { status }: Props = $props();
</script>

{#if status === 'auto-generated'}
	<span
		class="inline-flex items-center border border-warning/60 rounded px-1.5 py-0.5 text-xs text-warning whitespace-nowrap"
		title="Converted automatically from the source file — not yet checked by a person"
	>
		Auto-generated
	</span>
{/if}
