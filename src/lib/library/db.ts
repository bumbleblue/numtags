/**
 * Local-first private library (FABLE_SPEC §4.3): user imports and drafts
 * persist in IndexedDB as Tag objects with a local id namespace
 * (≥ LOCAL_ID_BASE) so they never collide with catalog ids.
 *
 * Browser-only — callers must guard with `browser` (SvelteKit) or onMount.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { LOCAL_ID_BASE, type Tag } from '../types';

const DB_NAME = 'numtags';
const STORE = 'tags';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, 1, {
			upgrade(d) {
				d.createObjectStore(STORE, { keyPath: 'metadata.tag_id' });
			},
		});
	}
	return dbPromise;
}

export async function getLocalTags(): Promise<Tag[]> {
	const tags = (await (await db()).getAll(STORE)) as Tag[];
	return tags.sort((a, b) => a.metadata.tag_id - b.metadata.tag_id);
}

export async function getLocalTag(id: number): Promise<Tag | undefined> {
	return (await (await db()).get(STORE, id)) as Tag | undefined;
}

/**
 * Save a tag to the private library. A tag without an id (tag_id ≤ 0 or
 * missing) gets the next free local id. Returns the saved tag.
 */
export async function saveLocalTag(tag: Tag): Promise<Tag> {
	const d = await db();
	let id = tag.metadata.tag_id;
	if (!id || id <= 0) {
		const keys = (await d.getAllKeys(STORE)) as number[];
		id = Math.max(LOCAL_ID_BASE - 1, ...keys) + 1;
	}
	const saved: Tag = {
		...tag,
		metadata: { ...tag.metadata, tag_id: id },
		slug: tag.slug || `local-${id}`,
	};
	await d.put(STORE, saved);
	return saved;
}

export async function deleteLocalTag(id: number): Promise<void> {
	await (await db()).delete(STORE, id);
}

export function isLocalId(id: number): boolean {
	return id >= LOCAL_ID_BASE;
}

/** Test hook: close and forget the cached connection. */
export async function _closeForTests(): Promise<void> {
	if (dbPromise) {
		(await dbPromise).close();
		dbPromise = null;
	}
}
