import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { composeBody, composeLyricLine, splitBody, staffBeatCount } from './lyrics';
import { parse } from './parse';

const dir = join(import.meta.dirname, '..', '..', '..', 'data', 'tags');
const goldens = readdirSync(dir).filter((f) => f.endsWith('.md'));

function body(file: string): string {
	return readFileSync(join(dir, file), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
}

describe('composeLyricLine', () => {
	it('joins hyphen-continued cells into one chunk', () => {
		expect(composeLyricLine(['slee-', 'py', 'time'])).toBe('slee-py time');
	});

	it('emits _ for empty cells and drops trailing empties', () => {
		expect(composeLyricLine(['When', 'it’s', '', 'down', '', 'south.', '', ''])).toBe(
			'When it’s _ down _ south.',
		);
	});

	it('keeps leading empties (staggered echo rows)', () => {
		expect(composeLyricLine(['', '', '', '', '(close', 'your', 'eyes)'])).toBe(
			'_ _ _ _ (close your eyes)',
		);
	});

	it('a trailing hyphen before an empty beat ends the word cleanly', () => {
		expect(composeLyricLine(['dar-', '', 'ling'])).toBe('dar- _ ling');
	});

	it('all-empty row composes to nothing', () => {
		expect(composeLyricLine(['', '', ''])).toBe('');
	});

	it('three-cell word', () => {
		expect(composeLyricLine(['won-', 'der-', 'ful'])).toBe('won-der-ful');
	});
});

describe('splitBody / composeBody round-trip', () => {
	it.each(goldens)('%s round-trips voice + lyric split', (file) => {
		const b = body(file);
		const { voiceBody, lyricCells } = splitBody(b);

		// voiceBody holds exactly the voice lines, nothing else
		for (const line of voiceBody.split('\n')) {
			if (line.trim()) expect(line).toContain('|');
		}

		const recomposed = composeBody(voiceBody, lyricCells);
		// Semantically identical: same beats, same lyric grid
		const a = parse(b);
		const c = parse(recomposed);
		expect(c.warnings).toEqual([]);
		expect(c.staffs.length).toBe(a.staffs.length);
		for (let si = 0; si < a.staffs.length; si++) {
			expect(c.staffs[si].measures).toEqual(a.staffs[si].measures);
			expect(c.staffs[si].lyricRows).toEqual(a.staffs[si].lyricRows);
		}
	});

	it('cells align to the flattened beat grid', () => {
		const b = body('sleepy-time.md');
		const { lyricCells } = splitBody(b);
		const staff = parse(b).staffs[0];
		expect(staffBeatCount(staff)).toBe(10); // 2 pickup + 4 + 2 + 2
		expect(lyricCells[0][0]).toHaveLength(10);
		expect(lyricCells[0][0].slice(0, 6)).toEqual(['When', 'it’s', 'slee-', 'py', 'time', '']);
	});

	it('multi-row staffs keep their rows (close-your-eyes echoes)', () => {
		const { lyricCells } = splitBody(body('close-your-eyes.md'));
		expect(lyricCells[0]).toHaveLength(3);
		expect(lyricCells[0][1][4]).toBe('(close');
		expect(lyricCells[0][2][8]).toBe('in');
	});

	it('composeBody drops all-empty rows and handles no lyrics', () => {
		const voice = '| 1 2 | 3 - |\n| 1 1 | 1 - |\n| 5, 5, | 5, - |\n| 1, 1, | 1, - |';
		expect(composeBody(voice, [[['', '', '', '']]])).toBe(voice + '\n');
		const withRow = composeBody(voice, [[['hel-', 'lo', 'world', '']]]);
		expect(withRow).toContain('hel-lo world');
		expect(parse(withRow).warnings).toEqual([]);
	});
});
