<script lang="ts">
	import '../app.css';
	import { onMount, type Snippet } from 'svelte';
	import { page } from '$app/stores';

	let { children }: { children: Snippet } = $props();

	let deferredPrompt: Event | null = $state(null);
	let showInstallButton = $state(false);

	// View settings (layout, size, sharps-only) live on the tag page rail,
	// so there is no Settings entry here.
	const NAV = [
		{ href: '/', label: 'Library' },
		{ href: '/import', label: 'Import' },
		{ href: '/notation', label: 'Guide' },
		{ href: '/about', label: 'About' },
	];

	function isActive(href: string, pathname: string): boolean {
		return href === '/' ? pathname === '/' : pathname.startsWith(href);
	}

	onMount(() => {
		// PWA install prompt
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			showInstallButton = true;
		});

		// In dev, evict any previously registered worker — runtime caching
		// would serve stale modules under the dev server's HMR.
		if ('serviceWorker' in navigator && import.meta.env.DEV) {
			navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
		}

		// Register service worker for PWA (production only)
		if ('serviceWorker' in navigator && !import.meta.env.DEV) {
			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {
					console.log('SW registered: ', registration);
				})
				.catch((registrationError) => {
					console.log('SW registration failed: ', registrationError);
				});
		}
	});

	function installPWA() {
		const prompt = deferredPrompt as
			| (Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> })
			| null;
		if (prompt) {
			prompt.prompt();
			prompt.userChoice.then(() => {
				deferredPrompt = null;
				showInstallButton = false;
			});
		}
	}
</script>

<svelte:head>
	<title>numtags - Barbershop Tags</title>
</svelte:head>

<div class="min-h-screen bg-paper-0 flex flex-col">
	<!-- Header -->
	<header class="border-b border-paper-2">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex flex-wrap justify-between items-center gap-x-4 py-2 sm:h-16 sm:py-0">
				<a href="/" class="flex items-center space-x-2 min-h-[44px]">
					<img src="/numtag-logo.svg" alt="numtags logo" class="w-8 h-8" />
					<span class="text-2xl font-bold text-ink-bright tracking-[-0.045em]">numtags</span>
				</a>

				<nav
					class="flex items-center gap-x-1 overflow-x-auto whitespace-nowrap max-w-full -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					aria-label="Main navigation"
				>
					{#each NAV as item (item.href)}
						<a
							href={item.href}
							class="px-2.5 sm:px-3 rounded text-sm font-medium min-h-[44px] inline-flex items-center transition-colors {isActive(
								item.href,
								$page.url.pathname,
							)
								? 'text-ink-bright underline underline-offset-8 decoration-1'
								: 'text-ink-muted hover:text-ink'}"
							aria-current={isActive(item.href, $page.url.pathname) ? 'page' : undefined}
						>
							{item.label}
						</a>
					{/each}
					{#if showInstallButton}
						<button onclick={installPWA} class="btn-primary text-sm min-h-[44px] ml-1">
							Install App
						</button>
					{/if}
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-paper-2 mt-auto">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="text-center text-ink-muted text-sm">
				<p>numtags - Learn and share barbershop tags</p>
				<div class="mt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
					<a
						href="https://github.com/bumbleblue/numtags"
						class="underline underline-offset-2 hover:text-ink"
					>
						Open Source on GitHub
					</a>
					<span class="text-accent-recessed">·</span>
					<a href="/impressum" class="underline underline-offset-2 hover:text-ink">
						Impressum
					</a>
				</div>
			</div>
		</div>
	</footer>
</div>
