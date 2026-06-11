import { describe, expect, it } from 'vitest';
import type { Beat } from '$lib/notation/types';
import { beatToMidi, midiToFreq, tonicPitchClass } from './pitch';

const note = (degree: Beat['degree'], extra: Partial<Beat> = {}): Beat => ({
	kind: 'note',
	degree,
	...extra,
});

describe('tonicPitchClass', () => {
	it('parses plain, sharp, flat, and minor key names', () => {
		expect(tonicPitchClass('C')).toBe(0);
		expect(tonicPitchClass('F')).toBe(5);
		expect(tonicPitchClass('Bb')).toBe(10);
		expect(tonicPitchClass('F#')).toBe(6);
		expect(tonicPitchClass('Am')).toBe(9); // minor: tonic letter still rules (movable Do)
	});

	it('defaults to C for missing or junk keys', () => {
		expect(tonicPitchClass(undefined)).toBe(0);
		expect(tonicPitchClass('')).toBe(0);
		expect(tonicPitchClass('??')).toBe(0);
	});
});

describe('beatToMidi', () => {
	const C = tonicPitchClass('C');

	it('homes the tonic at octave 4 (spec §3.1: key of C, bare 5 = G4)', () => {
		expect(beatToMidi(note(1), C)).toBe(60); // C4
		expect(beatToMidi(note(5), C)).toBe(67); // G4
		expect(beatToMidi(note(5, { octave: -1 }), C)).toBe(55); // G3
		expect(beatToMidi(note(5, { octave: 1 }), C)).toBe(79); // G5
	});

	it('realizes the §3.4 worked example in C', () => {
		// Tenor 3 = E4, Lead 7, = B3, Baritone b7, = Bb3, Bass 1, = C3
		expect(beatToMidi(note(3), C)).toBe(64);
		expect(beatToMidi(note(7, { octave: -1 }), C)).toBe(59);
		expect(beatToMidi(note(7, { octave: -1, accidental: 'flat' }), C)).toBe(58);
		expect(beatToMidi(note(1, { octave: -1 }), C)).toBe(48);
	});

	it('realizes the same degrees a fourth higher in F', () => {
		const F = tonicPitchClass('F');
		expect(beatToMidi(note(1), F)).toBe(65); // F4
		expect(beatToMidi(note(3), F)).toBe(69); // A4
		expect(beatToMidi(note(7, { accidental: 'flat' }), F)).toBe(75); // Eb5 (b7 of F, in window)
	});

	it('treats #2 and b3 as the same pitch', () => {
		expect(beatToMidi(note(2, { accidental: 'sharp' }), C)).toBe(
			beatToMidi(note(3, { accidental: 'flat' }), C),
		);
	});

	it('returns null for non-note beats', () => {
		expect(beatToMidi({ kind: 'hold' }, C)).toBeNull();
		expect(beatToMidi({ kind: 'rest' }, C)).toBeNull();
		expect(beatToMidi({ kind: 'posted' }, C)).toBeNull();
		expect(beatToMidi({ kind: 'empty' }, C)).toBeNull();
	});
});

describe('midiToFreq', () => {
	it('tunes A4 = 440 and C4 ≈ 261.63', () => {
		expect(midiToFreq(69)).toBe(440);
		expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
	});
});
