import { describe, expect, it } from 'vitest';
import { parse } from './parse';
import type { Beat } from './types';

/** Parse a single-voice-line body and return the first measure's beats. */
const beatsOf = (cells: string): Beat[] =>
	parse(`| ${cells} |`).staffs[0].measures[0][0];

/** Parse a single token into its Beat. */
const beat = (token: string): Beat => beatsOf(token)[0];

/** A 4-voice staff from one line repeated (keeps token tests warning-free). */
const staff4 = (line: string): string => Array(4).fill(line).join('\n');

describe('parse — note tokens', () => {
	it('parses a bare digit as a note', () => {
		expect(beat('3')).toEqual({ kind: 'note', degree: 3 });
		expect(beat('1')).toEqual({ kind: 'note', degree: 1 });
		expect(beat('7')).toEqual({ kind: 'note', degree: 7 });
	});

	it('parses # and b accidental prefixes', () => {
		expect(beat('#2')).toEqual({
			kind: 'note',
			degree: 2,
			accidental: 'sharp',
		});
		expect(beat('b3')).toEqual({ kind: 'note', degree: 3, accidental: 'flat' });
	});

	it('parses stacking octave marks as a signed integer', () => {
		expect(beat("5'")).toEqual({ kind: 'note', degree: 5, octave: 1 });
		expect(beat("5''")).toEqual({ kind: 'note', degree: 5, octave: 2 });
		expect(beat('5,')).toEqual({ kind: 'note', degree: 5, octave: -1 });
		expect(beat('5,,')).toEqual({ kind: 'note', degree: 5, octave: -2 });
	});

	it('omits octave for the home octave (no marks)', () => {
		expect(beat('5').octave).toBeUndefined();
	});

	it('parses subdivision slashes (1=eighth, 2=sixteenth)', () => {
		expect(beat('3/')).toEqual({ kind: 'note', degree: 3, subdivision: 1 });
		expect(beat('3//')).toEqual({ kind: 'note', degree: 3, subdivision: 2 });
	});

	it('parses the dotted suffix', () => {
		expect(beat('3.')).toEqual({ kind: 'note', degree: 3, dotted: true });
	});

	it('parses the ~ tie prefix', () => {
		expect(beat('~4')).toEqual({ kind: 'note', degree: 4, tiedFromPrev: true });
	});

	it('parses combined prefixes and suffixes', () => {
		expect(beat("~b3'")).toEqual({
			kind: 'note',
			degree: 3,
			accidental: 'flat',
			octave: 1,
			tiedFromPrev: true,
		});
		expect(beat('#2,/.')).toEqual({
			kind: 'note',
			degree: 2,
			accidental: 'sharp',
			octave: -1,
			subdivision: 1,
			dotted: true,
		});
	});
});

describe('parse — other tokens', () => {
	it('parses - as hold, 0 as rest', () => {
		expect(beat('-')).toEqual({ kind: 'hold' });
		expect(beat('0')).toEqual({ kind: 'rest' });
	});

	it('parses one or more X as posted', () => {
		expect(beat('X')).toEqual({ kind: 'posted' });
		expect(beat('XXX')).toEqual({ kind: 'posted' });
	});

	it('marks unparseable tokens invalid with raw set, plus a warning — never throws', () => {
		for (const raw of ['9', '5x', "5',", '3///', '..', 'wat', '~-']) {
			const { staffs, warnings } = parse(`| ${raw} |`);
			expect(staffs[0].measures[0][0][0]).toEqual({ kind: 'invalid', raw });
			expect(warnings.some((w) => w.message.includes(`"${raw}"`))).toBe(true);
		}
	});

	it('reports the line and staff of an invalid token', () => {
		const body = `${staff4('| 1 |')}\n\n| 1 |\n| 1 |\n| zz |\n| 1 |`;
		const warning = parse(body).warnings.find((w) =>
			w.message.includes('"zz"'),
		);
		expect(warning).toMatchObject({ staffIndex: 1, line: 8 });
	});

	it('rejects marks typed out of canonical order', () => {
		expect(beat("5.'").kind).toBe('invalid');
		expect(beat('5/,').kind).toBe('invalid');
	});
});

describe('parse — staff structure', () => {
	it('splits measures on barlines', () => {
		const staff = parse(staff4('| 1 2 | 3 4 |')).staffs[0];
		expect(staff.measures).toHaveLength(2);
		expect(staff.measures[0][0].map((b) => b.degree)).toEqual([1, 2]);
		expect(staff.measures[1][0].map((b) => b.degree)).toEqual([3, 4]);
	});

	it('treats beats before the first barline as the pickup', () => {
		const staff = parse(staff4('1 2 | 3 - |')).staffs[0];
		expect(staff.pickup[0].map((b) => b.degree)).toEqual([1, 2]);
		expect(staff.measures).toHaveLength(1);
	});

	it('has empty pickup arrays when there is no pickup', () => {
		const staff = parse(staff4('| 1 |')).staffs[0];
		expect(staff.pickup).toEqual([[], [], [], []]);
	});

	it('right-aligns shorter pickups with empty beats', () => {
		const body = ['1 2 | 3 |', '2 | 1 |', '5 | 5 |', '1 2 | 1 |'].join('\n');
		const staff = parse(body).staffs[0];
		expect(staff.pickup[0]).toEqual([
			{ kind: 'note', degree: 1 },
			{ kind: 'note', degree: 2 },
		]);
		expect(staff.pickup[1]).toEqual([
			{ kind: 'empty' },
			{ kind: 'note', degree: 2 },
		]);
	});

	it('pads shorter voices to the measure max beat count with empty beats', () => {
		const body = ['| 1 2 3 |', '| 1 2 |', '| 1 2 3 |', '| 1 |'].join('\n');
		const staff = parse(body).staffs[0];
		expect(staff.measures[0][1]).toEqual([
			{ kind: 'note', degree: 1 },
			{ kind: 'note', degree: 2 },
			{ kind: 'empty' },
		]);
		expect(staff.measures[0][3]).toEqual([
			{ kind: 'note', degree: 1 },
			{ kind: 'empty' },
			{ kind: 'empty' },
		]);
	});

	it('pads voices missing whole trailing measures', () => {
		const body = ['| 1 | 2 |', '| 1 |', '| 1 | 2 |', '| 1 | 2 |'].join('\n');
		const staff = parse(body).staffs[0];
		expect(staff.measures[1][1]).toEqual([{ kind: 'empty' }]);
	});

	it('strips optional voice labels, case-insensitively', () => {
		const labeled = [
			'Tenor: 1 | 2 |',
			'Lead: 1 | 2 |',
			'baritone: 1 | 2 |',
			'BS: 1 | 2 |',
		].join('\n');
		const short = [
			'T: 1 | 2 |',
			'L: 1 | 2 |',
			'B: 1 | 2 |',
			'Bs: 1 | 2 |',
		].join('\n');
		const bare = staff4('1 | 2 |');
		expect(parse(labeled).staffs).toEqual(parse(bare).staffs);
		expect(parse(short).staffs).toEqual(parse(bare).staffs);
	});

	it('warns on a staff with other than 4 voice lines, but still parses it', () => {
		const { staffs, warnings } = parse('| 1 |\n| 1 |\n| 1 |');
		expect(staffs).toHaveLength(1);
		expect(staffs[0].measures[0]).toHaveLength(3);
		expect(warnings).toMatchObject([{ staffIndex: 0, line: 1 }]);
		expect(warnings[0].message).toContain('3 voice lines');
	});

	it('does not warn on a 4-voice staff', () => {
		expect(parse(staff4('| 1 |')).warnings).toEqual([]);
	});

	it('parses multiple staffs separated by blank lines', () => {
		const body = `${staff4('| 1 2 |')}\n\n${staff4('| 3 - |')}`;
		const { staffs, warnings } = parse(body);
		expect(warnings).toEqual([]);
		expect(staffs).toHaveLength(2);
		expect(staffs[1].measures[0][0][0]).toEqual({ kind: 'note', degree: 3 });
	});

	it('treats multiple blank lines as one separator', () => {
		const body = `${staff4('| 1 |')}\n\n\n\n${staff4('| 2 |')}`;
		expect(parse(body).staffs).toHaveLength(2);
	});

	it('parses an empty body to no staffs, no warnings', () => {
		expect(parse('')).toEqual({ staffs: [], warnings: [] });
		expect(parse('\n\n')).toEqual({ staffs: [], warnings: [] });
	});
});

describe('parse — lyrics', () => {
	const voices = staff4('1 2 | 3 3 3 ~2 | b3 ~2 | 3 - |');

	it('distributes cells across pickup beats then measures, in order', () => {
		const body = `${voices}\na b c d e f g h i j`;
		const row = parse(body).staffs[0].lyricRows[0];
		expect(row.pickup).toEqual(['a', 'b']);
		expect(row.measures).toEqual([
			['c', 'd', 'e', 'f'],
			['g', 'h'],
			['i', 'j'],
		]);
	});

	it('fills trailing beats with no cells with null', () => {
		const body = `${voices}\na b c`;
		const row = parse(body).staffs[0].lyricRows[0];
		expect(row.pickup).toEqual(['a', 'b']);
		expect(row.measures).toEqual([
			['c', null, null, null],
			[null, null],
			[null, null],
		]);
	});

	it('treats _ as a held/rest beat (null)', () => {
		const body = `${staff4('| 1 2 3 |')}\nla _ la`;
		expect(parse(body).staffs[0].lyricRows[0].measures[0]).toEqual([
			'la',
			null,
			'la',
		]);
	});

	it('treats a standalone - as one held beat (null)', () => {
		const body = `${staff4('| 1 2 3 |')}\ndown - south`;
		expect(parse(body).staffs[0].lyricRows[0].measures[0]).toEqual([
			'down',
			null,
			'south',
		]);
	});

	it('splits hyphenated words into syllable cells, hyphen kept on the lead syllable', () => {
		const body = `${staff4('| 1 2 3 |')}\nslee-py time`;
		expect(parse(body).staffs[0].lyricRows[0].measures[0]).toEqual([
			'slee-',
			'py',
			'time',
		]);
	});

	it('honors a run of 2+ spaces as one held beat between syllables (legacy)', () => {
		const body = `${staff4('| 1 2 3 |')}\ntime   down`;
		expect(parse(body).staffs[0].lyricRows[0].measures[0]).toEqual([
			'time',
			null,
			'down',
		]);
	});

	it('strips leading whitespace (visual alignment only)', () => {
		const body = `${staff4('| 1 2 |')}\n      la la`;
		expect(parse(body).staffs[0].lyricRows[0].measures[0]).toEqual([
			'la',
			'la',
		]);
	});

	it('stacks multiple lyric lines as multiple LyricRows', () => {
		const body = `${staff4('| 1 2 |')}\nfirst row\nsecond row`;
		const rows = parse(body).staffs[0].lyricRows;
		expect(rows).toHaveLength(2);
		expect(rows[0].measures[0]).toEqual(['first', 'row']);
		expect(rows[1].measures[0]).toEqual(['second', 'row']);
	});

	it('attaches a lyric-only block after a blank line to the previous staff', () => {
		const body = `${staff4('| 1 2 |')}\nin-line\n\nClose your\n_ eyes`;
		const { staffs, warnings } = parse(body);
		expect(warnings).toEqual([]);
		expect(staffs).toHaveLength(1);
		const rows = staffs[0].lyricRows;
		expect(rows).toHaveLength(3);
		expect(rows[0].measures[0]).toEqual(['in-', 'line']);
		expect(rows[1].measures[0]).toEqual(['Close', 'your']);
		expect(rows[2].measures[0]).toEqual([null, 'eyes']);
	});

	it('aligns lyric cells using padded measure beat counts', () => {
		// Voice 1 has 3 beats in measure 1, the others 2 — lyric cells must
		// consume 3 slots for that measure.
		const body =
			['| 1 2 3 | 4 |', '| 1 2 |', '| 1 2 |', '| 1 2 |'].join('\n') +
			'\na b c d';
		const row = parse(body).staffs[0].lyricRows[0];
		expect(row.measures).toEqual([['a', 'b', 'c'], ['d']]);
	});

	it('warns on a lyric-only block with no staff to attach to', () => {
		const { staffs, warnings } = parse('just words\n\n' + staff4('| 1 |'));
		expect(staffs).toHaveLength(1);
		expect(warnings).toMatchObject([{ line: 1 }]);
		expect(warnings[0].message).toContain('no staff');
	});
});

describe('parse — multi-staff bodies with lyrics', () => {
	it('keeps lyric rows attached to their own staff', () => {
		const body = [
			staff4('| 1 2 |'),
			'one two',
			'',
			staff4('| 3 - |'),
			'three _',
		].join('\n');
		const { staffs, warnings } = parse(body);
		expect(warnings).toEqual([]);
		expect(staffs).toHaveLength(2);
		expect(staffs[0].lyricRows[0].measures[0]).toEqual(['one', 'two']);
		expect(staffs[1].lyricRows[0].measures[0]).toEqual(['three', null]);
	});
});
