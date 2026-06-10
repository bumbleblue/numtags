/**
 * Union data layer: the bundled catalog (generated-tags) + the private local
 * library (IndexedDB, ids ≥ LOCAL_ID_BASE — spec §4.3).
 *
 * The catalog is available instantly (and on the server). Local tags are
 * browser-only: pages call `refreshLocalLibrary()` (e.g. in onMount/$effect)
 * and re-run their search when it resolves. Reads never throw — a failed
 * IndexedDB read leaves the cached locals as-is (§7.1: quiet failure, never
 * an error page).
 */
import type { Tag, SearchFilters, SearchResult } from './types';
import Fuse from 'fuse.js';
import { allTags } from './generated-tags';
import { browser } from '$app/environment';
import { getLocalTags, getLocalTag } from './library/db';
import { LOCAL_ID_BASE } from './types';

/* ── Local-library cache ─────────────────────────────────────────────── */

let localCache: Tag[] = [];
let fuse: Fuse<Tag> | null = null;

/** Catalog + cached local tags (locals last, sorted by id). */
function unionTags(): Tag[] {
  return localCache.length > 0 ? [...allTags, ...localCache] : allTags;
}

/**
 * Re-read the local library from IndexedDB and rebuild the search index.
 * Browser-only; resolves to the refreshed local tags. Failures resolve to
 * the previous cache (and report via the optional return flag — callers
 * that care can compare or wrap in their own try/catch via `onError`).
 */
export async function refreshLocalLibrary(): Promise<{ tags: Tag[]; ok: boolean }> {
  if (!browser) return { tags: [], ok: true };
  try {
    localCache = await getLocalTags();
    fuse = null; // rebuild lazily over the new union
    return { tags: localCache, ok: true };
  } catch (e) {
    console.warn('Could not read local library:', e);
    return { tags: localCache, ok: false };
  }
}

/** Cached local tags from the last refresh (sync; may be stale/empty). */
export function getCachedLocalTags(): Tag[] {
  return localCache;
}

/* ── Search (Fuse over the union) ────────────────────────────────────── */

export function initializeSearch(): void {
  fuse = new Fuse(unionTags(), {
    keys: ['metadata.title', 'metadata.lyrics', 'metadata.arranger', 'content'],
    threshold: 0.3,
    includeScore: true,
  });
}

export function searchTags(filters: SearchFilters): SearchResult[] {
  const union = unionTags();
  let results: SearchResult[];

  const query = filters.query?.trim() ?? '';
  if (query === '') {
    results = union.map((tag, index) => ({ item: tag, refIndex: index, score: 0 }));
  } else if (/^\d+$/.test(query)) {
    // Numeric query → match tag ids (exact first, then prefix).
    results = union
      .filter((tag) => String(tag.metadata.tag_id).startsWith(query))
      .sort((a, b) => {
        const ax = String(a.metadata.tag_id) === query ? 0 : 1;
        const bx = String(b.metadata.tag_id) === query ? 0 : 1;
        return ax - bx || a.metadata.tag_id - b.metadata.tag_id;
      })
      .map((tag, index) => ({ item: tag, refIndex: index, score: 0 }));
  } else {
    if (!fuse) initializeSearch();
    results = fuse!.search(query);
  }

  if (filters.arranger && filters.arranger.trim() !== '') {
    const needle = filters.arranger.toLowerCase().trim();
    results = results.filter((r) => r.item.metadata.arranger.toLowerCase().includes(needle));
  }

  if (filters.difficulty) {
    results = results.filter((r) => r.item.metadata.difficulty === filters.difficulty);
  }

  if (filters.parts && filters.parts.length > 0) {
    results = results.filter((r) => filters.parts!.includes(r.item.metadata.parts));
  }

  return results;
}

/* ── Lookup ──────────────────────────────────────────────────────────── */

/**
 * Synchronous lookup over catalog + *cached* locals. For local ids prefer
 * `getTagByIdAsync` (reads IndexedDB directly, works on deep links before
 * any refresh has run).
 */
export function getTagById(id: number): Tag | undefined {
  return (
    allTags.find((tag) => tag.metadata.tag_id === id) ??
    localCache.find((tag) => tag.metadata.tag_id === id)
  );
}

/** Catalog (sync path) or IndexedDB (local ids). Browser-safe: returns undefined on the server for local ids. */
export async function getTagByIdAsync(id: number): Promise<Tag | undefined> {
  if (id < LOCAL_ID_BASE) {
    return allTags.find((tag) => tag.metadata.tag_id === id);
  }
  if (!browser) return undefined;
  try {
    return await getLocalTag(id);
  } catch (e) {
    console.warn('Could not read local tag:', e);
    return localCache.find((tag) => tag.metadata.tag_id === id);
  }
}

export function getAllTags(): Tag[] {
  return unionTags();
}

export function getUniqueDifficulties(): string[] {
  return [...new Set(unionTags().map((tag) => tag.metadata.difficulty))];
}

export function getUniqueParts(): number[] {
  return [...new Set(unionTags().map((tag) => tag.metadata.parts))].sort((a, b) => a - b);
}
