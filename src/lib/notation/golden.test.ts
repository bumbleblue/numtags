/**
 * Golden tests over the 5 hand-transcribed catalog tags (FABLE_SPEC §13).
 * Any parser/encoder change that alters these must be deliberate.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalize } from './normalize.js';
import { parse } from './parse.js';

const dir = join(import.meta.dirname, '..', '..', '..', 'data', 'tags');
const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

function body(file: string): string {
	return readFileSync(join(dir, file), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
}

describe('golden catalog tags', () => {
	it('has the 5 golden tags', () => {
		expect(files.sort()).toEqual([
			'close-your-eyes.md',
			'ireland.md',
			'seasons.md',
			'sleepy-time.md',
			'so-tired.md',
		]);
	});

	it.each(files)('%s is canonical ASCII (normalize is a no-op)', (file) => {
		const b = body(file);
		expect(normalize(b)).toBe(b);
		// no legacy glyphs anywhere in the body
		expect(b).not.toMatch(/[̀-ͯ⁀–—·♭♯]/);
	});

	it.each(files)('%s parses with 4 voices and zero warnings', (file) => {
		const tag = parse(body(file));
		expect(tag.warnings).toEqual([]);
		expect(tag.staffs).toHaveLength(1);
		expect(tag.staffs[0].measures.every((m) => m.length === 4)).toBe(true);
	});

	it('matches the golden structure snapshot', () => {
		const summary = Object.fromEntries(
			files.map((file) => {
				const s = parse(body(file)).staffs[0];
				return [
					file,
					{
						pickupBeats: s.pickup[0]?.length ?? 0,
						beatsPerMeasure: s.measures.map((m) => m[0].length),
						lyricRows: s.lyricRows.map((r) =>
							[...r.pickup, ...r.measures.flat()].map((c) => c ?? '·').join(' '),
						),
					},
				];
			}),
		);
		expect(summary).toMatchInlineSnapshot(`
			{
			  "close-your-eyes.md": {
			    "beatsPerMeasure": [
			      4,
			      4,
			      4,
			    ],
			    "lyricRows": [
			      "Close your eyes, · · · · · · · · ·",
			      "· · · · (close your eyes) · · · · ·",
			      "· · · · · · · · in · sleep. ·",
			    ],
			    "pickupBeats": 0,
			  },
			  "ireland.md": {
			    "beatsPerMeasure": [
			      3,
			      3,
			      3,
			      2,
			    ],
			    "lyricRows": [
			      "Ire- land, my Ire- land, I’m long- ing for you. ·",
			    ],
			    "pickupBeats": 0,
			  },
			  "seasons.md": {
			    "beatsPerMeasure": [
			      3,
			      4,
			      3,
			      3,
			      3,
			      3,
			      3,
			      3,
			      3,
			      3,
			      3,
			      3,
			      3,
			      3,
			    ],
			    "lyricRows": [
			      "Sea- sons may die, · and · so · will I, · but not · · my · · love · · (for you) · Oh not my love · · for · · you · (Oh not · for you) · ·",
			    ],
			    "pickupBeats": 0,
			  },
			  "sleepy-time.md": {
			    "beatsPerMeasure": [
			      4,
			      2,
			      2,
			    ],
			    "lyricRows": [
			      "When it’s slee- py time · down · south. ·",
			    ],
			    "pickupBeats": 2,
			  },
			  "so-tired.md": {
			    "beatsPerMeasure": [
			      3,
			      4,
			      2,
			    ],
			    "lyricRows": [
			      "So tired of wait- ing · for you. ·",
			    ],
			    "pickupBeats": 0,
			  },
			}
		`);
	});
});
