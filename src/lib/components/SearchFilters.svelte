<script lang="ts">
	interface Props {
		difficulties?: string[];
		parts?: number[];
		arranger?: string;
		difficulty?: string;
		selectedParts?: number[];
		onchange?: () => void;
	}

	let {
		difficulties = [],
		parts = [],
		arranger = $bindable(''),
		difficulty = $bindable(''),
		selectedParts = $bindable([]),
		onchange,
	}: Props = $props();

	const hasActive = $derived(arranger !== '' || difficulty !== '' || selectedParts.length > 0);

	function togglePart(part: number) {
		selectedParts = selectedParts.includes(part)
			? selectedParts.filter((p) => p !== part)
			: [...selectedParts, part];
		onchange?.();
	}

	export function clear() {
		arranger = '';
		difficulty = '';
		selectedParts = [];
		onchange?.();
	}
</script>

<div class="space-y-4">
	{#if hasActive}
		<div class="flex items-center justify-between">
			<button
				onclick={clear}
				class="text-sm text-accent hover:text-accent-hover min-h-[44px] px-1 flex items-center"
			>
				Clear filters
			</button>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Arranger Filter -->
		<div>
			<label for="arranger" class="block text-sm font-medium text-ink-muted mb-1"> Arranger </label>
			<input
				type="text"
				id="arranger"
				bind:value={arranger}
				oninput={() => onchange?.()}
				placeholder="Type arranger name..."
				class="w-full px-3 py-2.5 min-h-[44px] border border-paper-3 rounded focus:outline-none focus:border-ink-muted focus:ring-0 bg-transparent text-ink placeholder-ink-muted"
			/>
		</div>

		<!-- Difficulty Filter -->
		<div>
			<label for="difficulty" class="block text-sm font-medium text-ink-muted mb-1">
				Difficulty
			</label>
			<select
				id="difficulty"
				bind:value={difficulty}
				onchange={() => onchange?.()}
				class="w-full pl-3 pr-12 py-2.5 min-h-[44px] border border-paper-3 rounded focus:outline-none focus:border-ink-muted focus:ring-0 bg-transparent text-ink"
				style="padding-right: 3rem;"
			>
				<option value="">All difficulties</option>
				{#each difficulties as d (d)}
					<option value={d}>{d}</option>
				{/each}
			</select>
		</div>

		<!-- Parts Filter -->
		<div>
			<div class="block text-sm font-medium text-ink-muted mb-1">Parts</div>
			<div class="flex flex-wrap gap-x-4 gap-y-1">
				{#each parts as part (part)}
					<label class="flex items-center min-h-[44px] cursor-pointer">
						<input
							type="checkbox"
							checked={selectedParts.includes(part)}
							onchange={() => togglePart(part)}
							class="h-4 w-4 text-accent focus:ring-accent border-paper-3 rounded bg-transparent"
						/>
						<span class="ml-2 text-sm text-ink-muted">{part} part{part === 1 ? '' : 's'}</span>
					</label>
				{/each}
			</div>
		</div>
	</div>
</div>
