/**
 * User settings (spec §7 Settings, §8.3 layout toggle), persisted to
 * localStorage. Svelte 5 runes-friendly: import `settings` and read/write
 * its properties; persistence happens on write.
 */
import { browser } from '$app/environment';

export type LayoutMode = 'wrapped' | 'continuous';

export interface Settings {
	defaultLayout: LayoutMode;
	fontScale: number; // 1 = default
	sharpsOnly: boolean; // display every accidental as a sharp (UI only, §3 data unchanged)
}

const KEY = 'numtags-settings';

const DEFAULTS: Settings = { defaultLayout: 'wrapped', fontScale: 1, sharpsOnly: false };

function load(): Settings {
	if (!browser) return { ...DEFAULTS };
	try {
		return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
	} catch {
		return { ...DEFAULTS };
	}
}

class SettingsStore {
	#state = $state<Settings>(load());

	get defaultLayout() {
		return this.#state.defaultLayout;
	}
	set defaultLayout(v: LayoutMode) {
		this.#state.defaultLayout = v;
		this.#persist();
	}

	get fontScale() {
		return this.#state.fontScale;
	}
	set fontScale(v: number) {
		this.#state.fontScale = v;
		this.#persist();
	}

	get sharpsOnly() {
		return this.#state.sharpsOnly;
	}
	set sharpsOnly(v: boolean) {
		this.#state.sharpsOnly = v;
		this.#persist();
	}

	#persist() {
		if (browser) localStorage.setItem(KEY, JSON.stringify(this.#state));
	}
}

export const settings = new SettingsStore();

/** Per-tag-view sticky layout choice (§8.3 “remembers the last choice”). */
export function rememberLayout(mode: LayoutMode): void {
	if (browser) sessionStorage.setItem('numtags-layout', mode);
}
export function recallLayout(): LayoutMode {
	if (browser) {
		const v = sessionStorage.getItem('numtags-layout');
		if (v === 'wrapped' || v === 'continuous') return v;
	}
	return settings.defaultLayout;
}
