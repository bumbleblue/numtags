/**
 * Client for the catalog service's history surface (spec §6.8) — versions,
 * revert, and the recent-changes feed. The publish/update flow keeps its own
 * fetches in the review page; this module serves the read-mostly screens.
 *
 * Every function throws an Error whose message is safe to show the user
 * (§7.1: errors name what happened and what to do, never raw status text).
 */
import { env } from '$env/dynamic/public';

export interface TagVersion {
	sha: string;
	date: string;
	message: string;
	editor: string;
}

export interface RecentChange extends TagVersion {
	tag_id: number | null;
}

export interface CatalogFile {
	tag_id: number;
	path: string;
	sha: string;
	content: string;
}

/** '' when the catalog service isn't configured — screens degrade (§7.1). */
export function serviceUrl(): string {
	return (env.PUBLIC_SERVICE_URL ?? '').replace(/\/+$/, '');
}

async function detail(res: Response): Promise<string> {
	try {
		const body = (await res.json()) as { detail?: string };
		if (typeof body.detail === 'string') return body.detail;
	} catch {
		/* non-JSON error body — fall through to the status line */
	}
	return `the catalog service answered ${res.status}`;
}

/** Error with the HTTP status attached (0 for network-level failures), so
 *  callers can special-case e.g. the 409 optimistic-concurrency conflict. */
export class CatalogError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

/** fetch with both failure modes turned into user-safe messages: a network
 *  rejection ("Failed to fetch") as much as an error status. */
async function request(url: string, init?: RequestInit): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(url, init);
	} catch {
		throw new CatalogError("couldn't reach the catalog service — check your connection", 0);
	}
	if (!res.ok) throw new CatalogError(await detail(res), res.status);
	return res;
}

export async function fetchHistory(tagId: number): Promise<TagVersion[]> {
	const res = await request(`${serviceUrl()}/catalog/tags/${tagId}/history`);
	return res.json();
}

/** The document at HEAD, or at `ref` (a commit sha from the history list). */
export async function fetchTagFile(tagId: number, ref?: string): Promise<CatalogFile> {
	const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : '';
	const res = await request(`${serviceUrl()}/catalog/tags/${tagId}${suffix}`);
	return res.json();
}

/**
 * Revert to `toSha`. `baseSha` is HEAD's blob sha as this client last saw it —
 * the service answers 409 if the tag moved on since (same no-silent-clobber
 * contract as edits, §6.8); the thrown message says to reload.
 */
export async function revertTag(
	tagId: number,
	toSha: string,
	editorName: string,
	baseSha?: string,
): Promise<void> {
	await request(`${serviceUrl()}/catalog/tags/${tagId}/revert`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ to_sha: toSha, editor_name: editorName, base_sha: baseSha ?? null }),
	});
}

export async function fetchRecent(): Promise<RecentChange[]> {
	const res = await request(`${serviceUrl()}/catalog/recent`);
	return res.json();
}
