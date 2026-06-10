import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCAL_ID_BASE, type Tag } from '../types';
import {
	_closeForTests,
	deleteLocalTag,
	getLocalTag,
	getLocalTags,
	isLocalId,
	saveLocalTag,
} from './db';

function makeTag(overrides: Partial<Tag['metadata']> = {}): Tag {
	return {
		metadata: {
			title: 'Test tag',
			tag_id: 0,
			arranger: 'unknown',
			difficulty: 'Easy',
			date_added: '2026-06-10',
			parts: 4,
			origin: 'authored',
			...overrides,
		},
		content: '| 1 - | 1 - |\n| 1 - | 1 - |\n| 1 - | 1 - |\n| 1 - | 1 - |\n',
		slug: '',
	};
}

afterEach(async () => {
	for (const t of await getLocalTags()) await deleteLocalTag(t.metadata.tag_id);
	await _closeForTests();
});

describe('local library', () => {
	it('assigns ids in the local namespace and round-trips', async () => {
		const saved = await saveLocalTag(makeTag());
		expect(saved.metadata.tag_id).toBe(LOCAL_ID_BASE);
		expect(isLocalId(saved.metadata.tag_id)).toBe(true);
		expect(saved.slug).toBe(`local-${LOCAL_ID_BASE}`);

		const loaded = await getLocalTag(saved.metadata.tag_id);
		expect(loaded).toEqual(saved);
	});

	it('increments ids and lists in id order', async () => {
		const a = await saveLocalTag(makeTag({ title: 'A' }));
		const b = await saveLocalTag(makeTag({ title: 'B' }));
		expect(b.metadata.tag_id).toBe(a.metadata.tag_id + 1);
		expect((await getLocalTags()).map((t) => t.metadata.title)).toEqual(['A', 'B']);
	});

	it('updates in place when the tag already has an id', async () => {
		const a = await saveLocalTag(makeTag({ title: 'before' }));
		await saveLocalTag({ ...a, metadata: { ...a.metadata, title: 'after' } });
		const all = await getLocalTags();
		expect(all).toHaveLength(1);
		expect(all[0].metadata.title).toBe('after');
	});

	it('deletes', async () => {
		const a = await saveLocalTag(makeTag());
		await deleteLocalTag(a.metadata.tag_id);
		expect(await getLocalTag(a.metadata.tag_id)).toBeUndefined();
		expect(await getLocalTags()).toEqual([]);
	});
});
