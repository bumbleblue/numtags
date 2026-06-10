/**
 * Draft handoff between the Import flow and the Review & edit screen
 * (spec §6.1/§6.5). Drafts ride in sessionStorage so a reload or a
 * navigation never loses work (§7.1) — review additionally persists to
 * the IndexedDB library before any network call.
 */
import { browser } from '$app/environment';
import type { ScoreModel } from './score/types';
import type { Tag } from './types';

export interface Draft {
	tag: Tag;
	/** Retained for re-encoding when the user changes the key in review. */
	score?: ScoreModel;
	/** Import-path context for the review banner (§6.5). */
	warnings?: string[];
	/** Image imports: data-URL of the source for "compare to original". */
	sourceImage?: string;
	confidence?: number;
	/** What review should do on save: new local draft, or edit an existing one. */
	editing?: { kind: 'local' | 'catalog'; id: number };
}

const KEY = 'numtags-draft';

export function setDraft(draft: Draft): void {
	if (!browser) return;
	sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function getDraft(): Draft | null {
	if (!browser) return null;
	const raw = sessionStorage.getItem(KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as Draft;
	} catch {
		return null;
	}
}

export function clearDraft(): void {
	if (browser) sessionStorage.removeItem(KEY);
}
