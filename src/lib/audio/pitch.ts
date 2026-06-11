/**
 * Beat → pitch math for playback (companion to the encoder's §6.4 mapping,
 * run forward): movable-Do degrees against the tag's original_key, tonic
 * homed at octave 4 — the same convention encode.ts writes, so what the
 * importer produced is what playback sounds.
 *
 * Playback is a pitch reference, not engraving: degrees map chromatically
 * through the major scale (minor tags spell themselves with accidentals).
 */

import { parseKeyName, LETTER_PC } from '$lib/score/encode';
import type { Beat } from '$lib/notation/types';

/** Semitone offset of each major-scale degree above the tonic (1=Do … 7=Ti). */
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;

/** Tonic pitch class (0=C … 11=B) for a key name like "C", "Bb", "F#m". Default C. */
export function tonicPitchClass(keyName: string | undefined): number {
	const { letter, alter } = parseKeyName(keyName ?? 'C');
	return ((LETTER_PC[letter] + alter) % 12 + 12) % 12;
}

/**
 * MIDI note number for a note Beat. Home window starts at the tonic in
 * octave 4 (key of C: bare 1 = C4 = 60, `5,` = G3). Null for non-notes.
 */
export function beatToMidi(beat: Beat, tonicPc: number): number | null {
	if (beat.kind !== 'note' || beat.degree === undefined) return null;
	const tonicMidi = 60 + tonicPc; // tonic at octave 4 (C4 = 60)
	const accidental =
		beat.accidental === 'sharp' ? 1 : beat.accidental === 'flat' ? -1 : 0;
	return (
		tonicMidi + MAJOR_STEPS[beat.degree - 1] + accidental + 12 * (beat.octave ?? 0)
	);
}

export function midiToFreq(midi: number): number {
	return 440 * 2 ** ((midi - 69) / 12);
}
