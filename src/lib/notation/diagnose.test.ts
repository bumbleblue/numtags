import { describe, expect, it } from 'vitest';
import { diagnoseToken } from './diagnose';

describe('diagnoseToken — common mistakes get a what-to-type-instead hint', () => {
	it('legacy Unicode glyphs point to their ASCII form', () => {
		expect(diagnoseToken('♯5')).toContain('# (sharp)');
		expect(diagnoseToken('♭3')).toContain('b (flat)');
		expect(diagnoseToken('⁀4')).toContain('~ (tie)');
		expect(diagnoseToken('–')).toContain('- (hold)');
		expect(diagnoseToken('5̇')).toContain("octave marks '");
	});

	it('letter note names explain scale degrees', () => {
		expect(diagnoseToken('A')).toContain('scale degrees 1–7');
		expect(diagnoseToken("C#'")).toContain('scale degrees 1–7');
	});

	it('out-of-range digits explain the octave marks', () => {
		expect(diagnoseToken('8')).toContain("1–7");
		expect(diagnoseToken('9')).toContain("add ' after the digit");
	});

	it('accidental after the digit shows the corrected token', () => {
		expect(diagnoseToken('5#')).toContain('#5, not 5#');
		expect(diagnoseToken('3b')).toContain('b3, not 3b');
	});

	it('octave mark before the digit explains the suffix position', () => {
		expect(diagnoseToken("'5")).toContain('after the digit');
	});

	it('tie after the digit explains tie placement', () => {
		expect(diagnoseToken('3~')).toContain('in front of the note');
	});

	it('run-together notes suggest spaces', () => {
		expect(diagnoseToken('12')).toContain('space');
		expect(diagnoseToken('1-2')).toContain('space');
	});

	it('too many slashes explains the subdivision limit', () => {
		expect(diagnoseToken('3///')).toContain('sixteenth');
	});

	it('right characters in the wrong order explains the canonical order', () => {
		expect(diagnoseToken("5.'")).toContain('tie, sharp/flat, digit, octave, subdivision, dot');
		expect(diagnoseToken('5/,')).toContain('tie, sharp/flat, digit, octave, subdivision, dot');
	});

	it('anything else falls back to the token cheat-sheet', () => {
		expect(diagnoseToken('wat')).toContain('- hold, 0 rest, x posted');
	});
});
