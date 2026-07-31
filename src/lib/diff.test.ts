import { describe, expect, it } from 'vitest';
import { diffLines, hasChanges } from './diff';

describe('diffLines', () => {
	it('marks identical texts as all-same', () => {
		const d = diffLines('a\nb', 'a\nb');
		expect(d).toEqual([
			{ kind: 'same', text: 'a' },
			{ kind: 'same', text: 'b' },
		]);
		expect(hasChanges(d)).toBe(false);
	});

	it('reports a changed line as removed-then-added', () => {
		const d = diffLines('| 3 5 4 - |\n| 1 1 1 - |', '| 3 5 5 - |\n| 1 1 1 - |');
		expect(d).toEqual([
			{ kind: 'removed', text: '| 3 5 4 - |' },
			{ kind: 'added', text: '| 3 5 5 - |' },
			{ kind: 'same', text: '| 1 1 1 - |' },
		]);
		expect(hasChanges(d)).toBe(true);
	});

	it('handles pure insertion and deletion, including at the ends', () => {
		expect(diffLines('a\nc', 'a\nb\nc')).toEqual([
			{ kind: 'same', text: 'a' },
			{ kind: 'added', text: 'b' },
			{ kind: 'same', text: 'c' },
		]);
		expect(diffLines('a\nb\nc', 'b')).toEqual([
			{ kind: 'removed', text: 'a' },
			{ kind: 'same', text: 'b' },
			{ kind: 'removed', text: 'c' },
		]);
	});

	it('survives empty inputs', () => {
		// '' splits to [''] — one empty line on each side, which matches.
		expect(diffLines('', '')).toEqual([{ kind: 'same', text: '' }]);
		expect(diffLines('', 'a')).toEqual([
			{ kind: 'removed', text: '' },
			{ kind: 'added', text: 'a' },
		]);
	});
});
