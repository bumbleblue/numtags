import { describe, expect, it } from 'vitest';
import { parse } from './parse';
import { beatMismatchWarnings, blankTemplateBody, shiftVoiceOctave } from './transform';

describe('shiftVoiceOctave', () => {
	it('shifts plain notes up: no marks → one apostrophe', () => {
		expect(shiftVoiceOctave('| 1 2 3 |', 0, 1)).toBe("| 1' 2' 3' |");
	});

	it('shifts down into commas and cancels apostrophes', () => {
		expect(shiftVoiceOctave("| 1' 2 3, |", 0, -1)).toBe('| 1 2, 3,, |');
	});

	it('stacks marks across multiple octaves', () => {
		expect(shiftVoiceOctave("| 5'' |", 0, 1)).toBe("| 5''' |");
		expect(shiftVoiceOctave('| 5,, |', 0, -1)).toBe('| 5,,, |');
	});

	it('preserves tie, accidental, subdivision and dot around the octave marks', () => {
		expect(shiftVoiceOctave('| ~#2/ b3,. |', 0, 1)).toBe("| ~#2'/ b3. |");
	});

	it('only touches the targeted voice line within each staff', () => {
		const body = ['| 3 - |', '| 1 - |', '| 5, - |', '| 1, - |', 'la la'].join('\n');
		expect(shiftVoiceOctave(body, 3, -1)).toBe(
			['| 3 - |', '| 1 - |', '| 5, - |', '| 1,, - |', 'la la'].join('\n'),
		);
	});

	it('targets the voice in every staff block, resetting at blank lines', () => {
		const body = ['| 1 |', '| 5, |', '', '| 2 |', '| 6, |'].join('\n');
		expect(shiftVoiceOctave(body, 1, 1)).toBe(['| 1 |', '| 5 |', '', '| 2 |', '| 6 |'].join('\n'));
	});

	it('leaves holds, rests, posted, barlines, invalid tokens and spacing verbatim', () => {
		const line = '|  1   -  0  X   qq |';
		expect(shiftVoiceOctave(line, 0, 1)).toBe("|  1'   -  0  X   qq |");
	});

	it('keeps voice labels and lyric lines untouched, and counts labeled lines correctly', () => {
		const body = ['T: 1 | 2 |', 'L: 1 | 7, |', 'Oh my'].join('\n');
		expect(shiftVoiceOctave(body, 1, 1)).toBe(['T: 1 | 2 |', "L: 1' | 7 |", 'Oh my'].join('\n'));
	});

	it('handles pickup beats before the first barline', () => {
		expect(shiftVoiceOctave('5, 5, | 1 - |', 0, 1)).toBe("5 5 | 1' - |");
	});

	it('is a no-op for delta 0 and out-of-range voice index', () => {
		const body = '| 1 2 |\n| 3 4 |';
		expect(shiftVoiceOctave(body, 0, 0)).toBe(body);
		expect(shiftVoiceOctave(body, 5, 1)).toBe(body);
	});

	it('round-trips: shifting up then down restores the body', () => {
		const body = ['| 3 5 4 - | ~4 - - 4 |', '| 1 1 1 - | 2 1 7, 7, |'].join('\n');
		expect(shiftVoiceOctave(shiftVoiceOctave(body, 0, 1), 0, -1)).toBe(body);
	});

	it('still parses to the same structure with octaves moved', () => {
		const body = '| 1 b3 5 |';
		const shifted = shiftVoiceOctave(body, 0, -2);
		const beats = parse(shifted).staffs[0].measures[0][0];
		expect(beats.map((b) => b.octave)).toEqual([-2, -2, -2]);
		expect(beats.map((b) => b.degree)).toEqual([1, 3, 5]);
	});
});

describe('blankTemplateBody', () => {
	it('parses as one clean 4-voice staff with a lyric row and no warnings', () => {
		const parsed = parse(blankTemplateBody());
		expect(parsed.warnings).toEqual([]);
		expect(parsed.staffs).toHaveLength(1);
		expect(parsed.staffs[0].measures[0]).toHaveLength(4);
		expect(parsed.staffs[0].lyricRows).toHaveLength(1);
	});
});

describe('beatMismatchWarnings', () => {
	it('is silent when all voices agree', () => {
		const parsed = parse(['| 1 2 | 3 - |', '| 1 2 | 3 - |', '| 1 2 | 3 - |', '| 1 2 | 3 - |'].join('\n'));
		expect(beatMismatchWarnings(parsed)).toEqual([]);
	});

	it('flags a measure where voices have different beat counts', () => {
		const parsed = parse(['| 1 2 | 3 - |', '| 1 2 | 3 - - |', '| 1 2 | 3 - |', '| 1 2 | 3 - |'].join('\n'));
		const warnings = beatMismatchWarnings(parsed);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('measure 2');
		expect(warnings[0]).toContain('2 / 3 / 2 / 2');
	});

	it('reports the staff number for later staffs', () => {
		const parsed = parse(['| 1 |', '| 1 |', '', '| 1 2 |', '| 1 |'].join('\n'));
		const warnings = beatMismatchWarnings(parsed);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('Staff 2');
	});
});
