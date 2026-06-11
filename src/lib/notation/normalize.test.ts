import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalize } from './normalize';
import { parse } from './parse';

const readTagBody = (name: string): string => {
	const path = fileURLToPath(
		new URL(`../../../data/tags/${name}`, import.meta.url),
	);
	const content = readFileSync(path, 'utf-8');
	const parts = content.split(/^---$/m);
	return parts[2];
};

describe('normalize — legacy glyph mappings', () => {
	it('converts combining dot above (U+0307) to one apostrophe per dot', () => {
		expect(normalize('| 1̇ |')).toBe("| 1' |");
		expect(normalize('| 5̇̇ |')).toBe("| 5'' |");
	});

	it('converts combining dot below (U+0323) to one comma per dot', () => {
		expect(normalize('| 5̣ |')).toBe('| 5, |');
		expect(normalize('| 5̣̣ |')).toBe('| 5,, |');
	});

	it('converts combining low line (U+0332) to one slash per line (subdivision)', () => {
		expect(normalize('| 2̲ |')).toBe('| 2/ |');
		expect(normalize('| 2̲̲ |')).toBe('| 2// |');
	});

	it('converts ♯ to # and ♭ to b prefixes', () => {
		expect(normalize('| ♯4 |')).toBe('| #4 |');
		expect(normalize('| ♭6 |')).toBe('| b6 |');
	});

	it('orders marks canonically: accidental, digit, octave, subdivision, dot', () => {
		expect(normalize('| ♯4̣ |')).toBe('| #4, |');
		// ireland.md bass: digit + dot below + low line
		expect(normalize('| 3̣̲ |')).toBe('| 3,/ |');
		// ireland.md tenor: digit + dot above + middle dot (dotted)
		expect(normalize('| 3̇· |')).toBe("| 3'. |");
		// tidy variant: marks typed out of order come back canonical
		expect(normalize('| 3̲̇ |')).toBe("| 3'/ |");
	});

	it('converts ⁀ (U+2040) to a ~ prefix on the same token', () => {
		expect(normalize('| ⁀4 |')).toBe('| ~4 |');
		expect(normalize('| ⁀5̣ |')).toBe('| ~5, |');
	});

	it('splits a tie glued onto the previous note into two cells', () => {
		// seasons.md: `5⁀4` and `6̲⁀5̲`
		expect(normalize('| 5⁀4 - |')).toBe('| 5 ~4 - |');
		expect(normalize('| 6̲⁀5̲ |')).toBe('| 6/ ~5/ |');
	});

	it('converts en and em dashes to the single hold token', () => {
		expect(normalize('| 3 – |')).toBe('| 3 - |');
		expect(normalize('| 3 — |')).toBe('| 3 - |');
	});

	it('converts a standalone middle dot (legacy rest) to 0', () => {
		expect(normalize('| 6 - · |')).toBe('| 6 - 0 |');
	});

	it('uppercases typed x to the canonical posted X', () => {
		expect(normalize('| 1 x |')).toBe('| 1 X |');
		expect(normalize('| 1 xx |')).toBe('| 1 XX |');
		expect(normalize('| 1 X |')).toBe('| 1 X |');
	});

	it('converts a middle dot attached after a digit (legacy dotted) to a period', () => {
		expect(normalize('| 1· |')).toBe('| 1. |');
		expect(normalize('| 3̇· 7̲ |')).toBe("| 3'. 7/ |");
	});

	it('collapses whitespace runs in voice lines to single spaces', () => {
		expect(normalize('|  3   5  4  - |   1  |')).toBe('| 3 5 4 - | 1 |');
	});

	it('preserves interior spacing in lyric lines (double spaces kept)', () => {
		expect(normalize('slee-py time   down -   south.')).toBe(
			'slee-py time   down -   south.',
		);
		expect(normalize('Close your eyes,  in sleep.')).toBe(
			'Close your eyes,  in sleep.',
		);
	});

	it('trims only trailing whitespace from lyric lines', () => {
		expect(normalize('        slee-py time   ')).toBe('        slee-py time');
	});

	it('passes voice labels and unknown tokens through untouched', () => {
		expect(normalize('Tenor: 3 - | ⁀4 |')).toBe('Tenor: 3 - | ~4 |');
		expect(normalize('| 3 wat |')).toBe('| 3 wat |');
	});
});

// The pre-migration sleepy-time.md body, verbatim from git history
// (9edb17e) — data/tags/ now stores canonical ASCII, so the legacy
// form lives here as the migration fixture.
const LEGACY_SLEEPY_TIME = `
1  2  |  3  3  3 ⁀2  | ♭3 ⁀2  |  3  —  |
1  2  |  1  1  1  -  |  1  —  |  1  —  |
1  7̣  |  6̣  6̣  6̣  -  | ♭6̣ ⁀5̣  |  5̣  —  |
1  7̣  |  6̣  5̣ ♯4̣  -  |  4̣  —  |  1̣  —  |
When it’s 
        slee-py time   down -   south.  
`;

describe('normalize — idempotence', () => {
	const canonical = [
		'1 2 | 3 3 3 ~2 | b3 ~2 | 3 - |',
		'1 2 | 1 1 1 - | 1 - | 1 - |',
		'1 7, | 6, 6, 6, - | b6, ~5, | 5, - |',
		'1 7, | 6, 5, #4, - | 4, - | 1, - |',
		'When it’s',
		'        slee-py time   down -   south.',
	].join('\n');

	it('leaves canonical ASCII input unchanged', () => {
		expect(normalize(canonical)).toBe(canonical);
	});

	it('leaves canonical tokens with stacked/combined marks unchanged', () => {
		const line = "| ~b3' 5'' 5,, 3// 3. #2'/. 0 - X XXX |";
		expect(normalize(line)).toBe(line);
	});

	it('is idempotent on legacy input', () => {
		const legacy = LEGACY_SLEEPY_TIME;
		expect(normalize(normalize(legacy))).toBe(normalize(legacy));
	});
});

describe('normalize — legacy golden round-trip', () => {
	it('migrates sleepy-time.md verbatim to exact canonical ASCII', () => {
		const expected = [
			'',
			'1 2 | 3 3 3 ~2 | b3 ~2 | 3 - |',
			'1 2 | 1 1 1 - | 1 - | 1 - |',
			'1 7, | 6, 6, 6, - | b6, ~5, | 5, - |',
			'1 7, | 6, 5, #4, - | 4, - | 1, - |',
			'When it’s',
			'        slee-py time   down -   south.',
			'',
		].join('\n');
		expect(normalize(LEGACY_SLEEPY_TIME)).toBe(expected);
	});

	it.each([
		'close-your-eyes.md',
		'ireland.md',
		'seasons.md',
		'sleepy-time.md',
		'so-tired.md',
	])(
		'normalizes %s to pure-ASCII voice lines that parse without warnings',
		(name) => {
			const normalized = normalize(readTagBody(name));
			for (const line of normalized.split('\n')) {
				if (line.includes('|')) {
					// eslint-disable-next-line no-control-regex
					expect(line).toMatch(/^[\x00-\x7F]*$/);
				}
			}
			const parsed = parse(normalized);
			expect(parsed.warnings).toEqual([]);
			expect(parsed.staffs.length).toBeGreaterThan(0);
		},
	);

	it('parses the migrated sleepy-time body into the expected semantic beats', () => {
		const { staffs, warnings } = parse(
			normalize(LEGACY_SLEEPY_TIME),
		);
		expect(warnings).toEqual([]);
		expect(staffs).toHaveLength(1);
		const staff = staffs[0];

		// Pickup: 2 beats in every voice.
		expect(staff.pickup[0]).toEqual([
			{ kind: 'note', degree: 1 },
			{ kind: 'note', degree: 2 },
		]);
		expect(staff.pickup[2]).toEqual([
			{ kind: 'note', degree: 1 },
			{ kind: 'note', degree: 7, octave: -1 },
		]);

		// Measure 1, tenor: 3 3 3 ~2
		expect(staff.measures[0][0]).toEqual([
			{ kind: 'note', degree: 3 },
			{ kind: 'note', degree: 3 },
			{ kind: 'note', degree: 3 },
			{ kind: 'note', degree: 2, tiedFromPrev: true },
		]);
		// Measure 1, bass: 6, 5, #4, -
		expect(staff.measures[0][3]).toEqual([
			{ kind: 'note', degree: 6, octave: -1 },
			{ kind: 'note', degree: 5, octave: -1 },
			{ kind: 'note', degree: 4, accidental: 'sharp', octave: -1 },
			{ kind: 'hold' },
		]);
		// Measure 2, tenor: b3 ~2
		expect(staff.measures[1][0]).toEqual([
			{ kind: 'note', degree: 3, accidental: 'flat' },
			{ kind: 'note', degree: 2, tiedFromPrev: true },
		]);

		// Two stacked lyric rows; the first covers the pickup.
		expect(staff.lyricRows).toHaveLength(2);
		expect(staff.lyricRows[0].pickup).toEqual(['When', 'it’s']);
	});
});
