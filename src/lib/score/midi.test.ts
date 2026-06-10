/**
 * MIDI importer tests (FABLE_SPEC §6.2): track→voice mapping, PPQ→beats with
 * sixteenth quantization, barline-splitting ties, key-signature reading,
 * key inference fallback, and diatonic enharmonic spelling.
 */
import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseMIDI } from './midi';

/**
 * @tonejs/midi's encoder writes the key-signature byte as `keyIndex + 7`
 * instead of the spec's signed sharps/flats count, so its own parser cannot
 * read the value back. Patch the FF 59 meta event with the real sf byte.
 */
function withKeySignatureBytes(bytes: Uint8Array, sf: number): Uint8Array {
	for (let i = 0; i + 4 < bytes.length; i++) {
		if (bytes[i] === 0xff && bytes[i + 1] === 0x59 && bytes[i + 2] === 0x02) {
			bytes[i + 3] = sf & 0xff;
			return bytes;
		}
	}
	throw new Error('no key signature event found in encoded MIDI');
}

interface SimpleNote {
	midi: number;
	ticks: number;
	durationTicks: number;
}

function buildMidi(
	tracks: { name?: string; notes: SimpleNote[] }[],
	opts: { timeSignature?: [number, number]; keySignature?: { sf: number; scale: 'major' | 'minor' } } = {}
): Uint8Array {
	const midi = new Midi();
	if (opts.timeSignature) {
		midi.header.timeSignatures.push({ ticks: 0, timeSignature: opts.timeSignature });
	}
	if (opts.keySignature) {
		// key name here is irrelevant — the byte gets patched below
		midi.header.keySignatures.push({ ticks: 0, key: 'C', scale: opts.keySignature.scale });
	}
	for (const t of tracks) {
		const track = midi.addTrack();
		if (t.name) track.name = t.name;
		for (const n of t.notes) track.addNote(n);
	}
	const bytes = midi.toArray();
	return opts.keySignature ? withKeySignatureBytes(bytes, opts.keySignature.sf) : bytes;
}

const PPQ = new Midi().header.ppq; // 480

const q = (midi: number, beat: number, beats = 1): SimpleNote => ({
	midi,
	ticks: Math.round(beat * PPQ),
	durationTicks: Math.round(beats * PPQ)
});

describe('parseMIDI: 4 named tracks', () => {
	const bytes = buildMidi(
		[
			{ name: 'Bass', notes: [q(53, 0, 2)] }, // F3 half
			{ name: 'Lead', notes: [q(65, 0, 2)] }, // F4 half
			{ name: 'Tenor', notes: [q(69, 0, 1), q(70, 1, 1)] }, // A4, Bb4
			{ name: 'Baritone', notes: [q(60, 0, 2)] } // C4 half
		],
		{ timeSignature: [4, 4], keySignature: { sf: -1, scale: 'major' } }
	);
	const { score, warnings } = parseMIDI(bytes);

	it('maps tracks to roles by name, regardless of track order', () => {
		expect(warnings).toEqual([]);
		expect(score.voices.map((v) => v.role)).toEqual(['tenor', 'lead', 'baritone', 'bass']);
		expect(score.voices[0].measures[0][0]).toMatchObject({ step: 'A', octave: 4 });
		expect(score.voices[3].measures[0][0]).toMatchObject({ step: 'F', octave: 3 });
	});

	it('reads the key signature meta event', () => {
		expect(score.keyName).toBe('F');
		expect(score.tonicPitchClass).toBe(5);
		expect(score.mode).toBe('major');
	});

	it('spells notes diatonically against the key (70 → Bb, not A#)', () => {
		expect(score.voices[0].measures[0][1]).toMatchObject({ step: 'B', alter: -1, octave: 4 });
	});

	it('fills gaps with rests to the end of the measure', () => {
		expect(score.voices[1].measures[0].map((e) => [e.kind, e.durationBeats])).toEqual([
			['note', 2],
			['rest', 2]
		]);
	});
});

describe('parseMIDI: track-count fallbacks', () => {
	it('maps unnamed tracks by average pitch (highest = tenor … lowest = bass)', () => {
		const bytes = buildMidi(
			[
				{ notes: [q(60, 0, 4)] }, // C4
				{ notes: [q(69, 0, 4)] }, // A4 (highest → tenor)
				{ notes: [q(48, 0, 4)] }, // C3 (lowest → bass)
				{ notes: [q(65, 0, 4)] } // F4
			],
			{ timeSignature: [4, 4], keySignature: { sf: 0, scale: 'major' } }
		);
		const { score } = parseMIDI(bytes);
		expect(score.voices[0].measures[0][0]).toMatchObject({ step: 'A', octave: 4 });
		expect(score.voices[1].measures[0][0]).toMatchObject({ step: 'F', octave: 4 });
		expect(score.voices[2].measures[0][0]).toMatchObject({ step: 'C', octave: 4 });
		expect(score.voices[3].measures[0][0]).toMatchObject({ step: 'C', octave: 3 });
	});

	it('splits a single polyphonic track into 4 voices by pitch order, with a warning', () => {
		const bytes = buildMidi(
			[
				{
					notes: [
						// chord 1: C5 G4 E4 C4 · chord 2: C5 A4 F4 F3
						q(72, 0, 4), q(67, 0, 4), q(64, 0, 4), q(60, 0, 4),
						q(72, 4, 4), q(69, 4, 4), q(65, 4, 4), q(53, 4, 4)
					]
				}
			],
			{ timeSignature: [4, 4] }
		);
		const { score, warnings } = parseMIDI(bytes);
		expect(warnings.some((w) => /split into 4 voices by pitch order/i.test(w))).toBe(true);
		expect(score.voices[0].measures[1][0].step).toBe('C'); // tenor: C5
		expect(score.voices[0].measures[1][0].octave).toBe(5);
		expect(score.voices[3].measures[0][0]).toMatchObject({ step: 'C', octave: 4 });
		expect(score.voices[3].measures[1][0]).toMatchObject({ step: 'F', octave: 3 });
	});

	it('handles 2 tracks by splitting each into 2 voices, with a warning', () => {
		const bytes = buildMidi(
			[
				{ notes: [q(69, 0, 4), q(65, 0, 4)] }, // treble: A4 + F4
				{ notes: [q(60, 0, 4), q(53, 0, 4)] } // bass: C4 + F3
			],
			{ timeSignature: [4, 4], keySignature: { sf: -1, scale: 'major' } }
		);
		const { score, warnings } = parseMIDI(bytes);
		expect(warnings.some((w) => /2 tracks/i.test(w))).toBe(true);
		expect(score.voices[0].measures[0][0]).toMatchObject({ step: 'A', octave: 4 });
		expect(score.voices[1].measures[0][0]).toMatchObject({ step: 'F', octave: 4 });
		expect(score.voices[2].measures[0][0]).toMatchObject({ step: 'C', octave: 4 });
		expect(score.voices[3].measures[0][0]).toMatchObject({ step: 'F', octave: 3 });
	});

	it('handles 3 tracks best-effort (baritone left empty), with a warning', () => {
		const bytes = buildMidi(
			[
				{ notes: [q(69, 0, 4)] },
				{ notes: [q(65, 0, 4)] },
				{ notes: [q(53, 0, 4)] }
			],
			{ timeSignature: [4, 4], keySignature: { sf: 0, scale: 'major' } }
		);
		const { score, warnings } = parseMIDI(bytes);
		expect(warnings.some((w) => /3 melodic tracks/i.test(w))).toBe(true);
		expect(score.voices[2].measures[0].every((e) => e.kind === 'rest')).toBe(true);
		expect(score.voices[3].measures[0][0]).toMatchObject({ step: 'F', octave: 3 });
	});
});

describe('parseMIDI: rhythm', () => {
	it('quantizes onsets and durations to a sixteenth grid', () => {
		const bytes = buildMidi(
			[{ name: 'Lead', notes: [{ midi: 60, ticks: 475, durationTicks: 490 }] }],
			{ timeSignature: [4, 4], keySignature: { sf: 0, scale: 'major' } }
		);
		const { score } = parseMIDI(bytes);
		const events = score.voices[0].measures[0];
		expect(events.map((e) => [e.kind, e.durationBeats])).toEqual([
			['rest', 1],
			['note', 1],
			['rest', 2]
		]);
	});

	it('splits notes spanning barlines into tied events', () => {
		const bytes = buildMidi([{ notes: [q(60, 0, 8)] }], {
			timeSignature: [4, 4],
			keySignature: { sf: 0, scale: 'major' }
		});
		const { score, warnings } = parseMIDI(bytes);
		expect(warnings.some((w) => /single melodic track/i.test(w))).toBe(true);
		const tenor = score.voices[0];
		expect(tenor.measures).toHaveLength(2);
		expect(tenor.measures[0][0]).toMatchObject({ kind: 'note', durationBeats: 4 });
		expect(tenor.measures[0][0].tiedFromPrev).toBeUndefined();
		expect(tenor.measures[1][0]).toMatchObject({
			kind: 'note',
			durationBeats: 4,
			tiedFromPrev: true
		});
	});

	it('defaults to 4/4 with a warning when no time signature exists', () => {
		const bytes = buildMidi([{ notes: [q(60, 0, 4)] }]);
		const { score, warnings } = parseMIDI(bytes);
		expect(score.timeSignature).toEqual({ beats: 4, beatType: 4 });
		expect(warnings.some((w) => /no time signature/i.test(w))).toBe(true);
	});
});

describe('parseMIDI: key handling', () => {
	it('reads minor key signatures as the relative minor', () => {
		const bytes = buildMidi([{ notes: [q(57, 0, 4)] }], {
			timeSignature: [4, 4],
			keySignature: { sf: 0, scale: 'minor' }
		});
		const { score } = parseMIDI(bytes);
		expect(score.keyName).toBe('Am');
		expect(score.mode).toBe('minor');
		expect(score.tonicPitchClass).toBe(9);
	});

	it('infers the key from pitch content when no signature exists, weighting the final bass note', () => {
		const bytes = buildMidi(
			[
				{
					notes: [
						q(72, 0, 4), q(67, 0, 4), q(64, 0, 4), q(60, 0, 4), // C5 G4 E4 C4
						q(72, 4, 4), q(69, 4, 4), q(65, 4, 4), q(53, 4, 4) // C5 A4 F4 F3 ← bass lands on F
					]
				}
			],
			{ timeSignature: [4, 4] }
		);
		const { score, warnings } = parseMIDI(bytes);
		expect(score.keyName).toBe('F');
		expect(score.mode).toBe('major');
		expect(warnings.some((w) => /set the key in review/i.test(w))).toBe(true);
	});

	it('prefers the key whose scale covers the pitch-class histogram', () => {
		// an ascending C major scale: the B natural rules out F major
		const scaleNotes = [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => q(m, i, 1));
		const bytes = buildMidi([{ notes: scaleNotes }], { timeSignature: [4, 4] });
		const { score } = parseMIDI(bytes);
		expect(score.keyName).toBe('C');
	});

	it('spells chromatic notes with continuity: sharps ascending, flats descending', () => {
		const bytes = buildMidi(
			[{ notes: [q(60, 0), q(61, 1), q(62, 2), q(61, 3)] }], // C C# D Db
			{ timeSignature: [4, 4], keySignature: { sf: 0, scale: 'major' } }
		);
		const { score } = parseMIDI(bytes);
		const events = score.voices[0].measures[0];
		expect(events[1]).toMatchObject({ step: 'C', alter: 1 }); // ascending → C#
		expect(events[3]).toMatchObject({ step: 'D', alter: -1 }); // descending → Db
	});

	it('leaves lyrics undefined', () => {
		const bytes = buildMidi([{ notes: [q(60, 0, 4)] }], {
			timeSignature: [4, 4],
			keySignature: { sf: 0, scale: 'major' }
		});
		const { score } = parseMIDI(bytes);
		expect(score.voices[0].measures[0][0].lyric).toBeUndefined();
	});
});

describe('parseMIDI → encode smoke test', () => {
	it('a 4-track quartet round-trips into plausible notation', async () => {
		const { encode } = await import('./encode');
		const bytes = buildMidi(
			[
				{ name: 'Tenor', notes: [q(69, 0, 2), q(69, 2, 2), q(70, 4, 4)] },
				{ name: 'Lead', notes: [q(65, 0, 2), q(64, 2, 2), q(65, 4, 4)] },
				{ name: 'Baritone', notes: [q(60, 0, 2), q(58, 2, 2), q(62, 4, 4)] },
				{ name: 'Bass', notes: [q(53, 0, 2), q(48, 2, 2), q(46, 4, 4)] }
			],
			{ timeSignature: [4, 4], keySignature: { sf: -1, scale: 'major' } }
		);
		const { score } = parseMIDI(bytes);
		expect(encode(score)).toBe(
			['3 - 3 - | X |', '1 - 7, - | X |', '5, - 4, - | X |', '1, - 5,, - | X |'].join('\n')
		);
	});
});
