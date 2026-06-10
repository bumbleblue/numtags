<script lang="ts">
	import { settings, type LayoutMode } from '$lib/settings.svelte';
	import NotationRenderer from '$lib/components/notation/NotationRenderer.svelte';

	const FONT_SIZES = [
		{ value: 0.85, label: 'Small' },
		{ value: 1, label: 'Default' },
		{ value: 1.15, label: 'Large' },
		{ value: 1.3, label: 'Extra large' },
	];

	// Short sample for the live preview (canonical ASCII, spec §3).
	const SAMPLE = `| 3 5 4 - | ~4 - b3 - | 3 - - - |
| 1 1 1 - | 2 1 7, - | 1 - - - |
| 5, 5, 5, - | ~5, - 5, - | 5, - - - |
| 1, 3, 2, - | ~2, - #4,/ 5,/ | 1, - - - |
Close your eyes _ _ _ in _ sleep. _`;

	function setLayout(mode: LayoutMode) {
		settings.defaultLayout = mode;
	}
</script>

<svelte:head>
	<title>Settings - numtags</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-8">
	<header>
		<h1 class="text-3xl font-bold text-nord-4 mb-2">Settings</h1>
		<p class="text-nord-5">
			How notation is laid out and sized, everywhere in the app. Saved on this device.
		</p>
	</header>

	<!-- Default layout mode (§8.3) -->
	<section class="card-bg rounded shadow-sm border p-6 space-y-3">
		<h2 class="text-xl font-semibold text-nord-4">Default layout</h2>
		<p class="text-sm text-nord-5">
			<strong class="text-nord-4">Wrapped</strong> breaks the staff into systems that fit your
			screen, like printed music. <strong class="text-nord-4">Scroll</strong> keeps one continuous
			line you swipe through. You can still switch per tag — this sets the starting mode.
		</p>
		<div
			class="inline-flex rounded border border-nord-3 overflow-hidden"
			role="group"
			aria-label="Default layout mode"
		>
			<button
				onclick={() => setLayout('wrapped')}
				class="px-5 min-h-[44px] text-sm font-medium transition-colors {settings.defaultLayout ===
				'wrapped'
					? 'bg-nord-8 text-nord-0'
					: 'bg-nord-1 text-nord-5 hover:text-nord-4'}"
				aria-pressed={settings.defaultLayout === 'wrapped'}
			>
				Wrapped
			</button>
			<button
				onclick={() => setLayout('continuous')}
				class="px-5 min-h-[44px] text-sm font-medium transition-colors {settings.defaultLayout ===
				'continuous'
					? 'bg-nord-8 text-nord-0'
					: 'bg-nord-1 text-nord-5 hover:text-nord-4'}"
				aria-pressed={settings.defaultLayout === 'continuous'}
			>
				Scroll
			</button>
		</div>
	</section>

	<!-- Notation font size -->
	<section class="card-bg rounded shadow-sm border p-6 space-y-4">
		<h2 class="text-xl font-semibold text-nord-4">Notation size</h2>
		<div class="flex flex-wrap gap-2">
			{#each FONT_SIZES as size (size.value)}
				<button
					onclick={() => (settings.fontScale = size.value)}
					class="px-4 min-h-[44px] rounded border text-sm font-medium transition-colors {settings.fontScale ===
					size.value
						? 'bg-nord-8 border-nord-8 text-nord-0'
						: 'bg-nord-1 border-nord-3 text-nord-5 hover:text-nord-4'}"
					aria-pressed={settings.fontScale === size.value}
				>
					{size.label}
				</button>
			{/each}
		</div>

		<!-- Live preview -->
		<div>
			<h3 class="text-sm font-medium text-nord-5 mb-2">Preview</h3>
			<NotationRenderer
				body={SAMPLE}
				mode={settings.defaultLayout}
				fontScale={settings.fontScale}
			/>
		</div>
	</section>
</div>
