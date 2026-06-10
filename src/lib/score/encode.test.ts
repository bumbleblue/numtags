/**
 * Encoder unit tests — every mapping rule in FABLE_SPEC §6.4, with extra
 * attention on the four known-fuzzy areas: rhythm crudeness, octave home,
 * the posted heuristic, and enharmonic-against-key spelling.
 */
import { describe, expect, it } from 'vitest';
import { encode } from './encode';
import type { NoteEvent, ScoreModel, Step } from './types';
import { VOICE_ROLES } from './types';

const n = (step: Step, octave: number, dur: number, extra: Partial<NoteEvent> = {}): NoteEvent => ({
	kind: 'note',
	step,
	alter: 0,
	octave,
	durationBeats: dur,
	...extra
});
const r = (dur: number): NoteEvent => ({ kind: 'rest', durationBeats: dur });
const lyr = (
	text: string,
	syllabic: 'single' | 'begin' | 'middle' | 'end' = 'single'
): NoteEvent['lyric'] => ({ text, syllabic });

/** All four voices sing the same line — handy for single-line assertions. */
function score(
	measures: NoteEvent[][],
	opts: {
		key?: string;
		mode?: 'major' | 'minor';
		ts?: { beats: number; beatType: number };
	} = {}
): ScoreModel {
	return {
		tonicPitchClass: 0,
		mode: opts.mode ?? 'major',
		keyName: opts.key ?? 'C',
		timeSignature: opts.ts ?? { beats: 4, beatType: 4 },
		voices: VOICE_ROLES.map((role) => ({ role, measures }))
	};
}

const firstLine = (s: ScoreModel) => encode(s).split('\n')[0];

describe('encode: degree (letter distance from tonic)', () => {
	it('maps the C major scale to 1–7', () => {
		const s = score([
			[n('C', 4, 1), n('D', 4, 1), n('E', 4, 1), n('F', 4, 1)],
			[n('G', 4, 1), n('A', 4, 1), n('B', 4, 1), n('C', 5, 1)]
		]);
		expect(firstLine(s)).toBe("1 2 3 4 | 5 6 7 1' |");
	});

	it('is key-relative: F major scale is also 1–7', () => {
		const s = score(
			[
				[n('F', 4, 1), n('G', 4, 1), n('A', 4, 1), n('B', 4, 1, { alter: -1 })],
				[r(4)]
			],
			{ key: 'F' }
		);
		expect(firstLine(s)).toBe('1 2 3 4 | 0 0 0 0 |');
	});
});

describe('encode: accidental (alter minus key signature alter)', () => {
	it('keeps written enharmonics distinct in C (Eb → b3, D# → #2)', () => {
		const s = score([
			[n('E', 4, 1, { alter: -1 }), n('D', 4, 1, { alter: 1 }), n('C', 4, 2)]
		]);
		expect(firstLine(s)).toBe('b3 #2 1 - |');
	});

	it('in F, B natural is #4 and Bb is plain 4', () => {
		const s = score([[n('B', 4, 1), n('B', 4, 1, { alter: -1 }), n('A', 4, 2)]], {
			key: 'F'
		});
		expect(firstLine(s)).toBe('#4 4 3 - |');
	});

	it('in G, F natural is b7 and F# is plain 7', () => {
		const s = score([[n('F', 5, 1), n('F', 5, 1, { alter: 1 }), n('G', 5, 2)]], {
			key: 'G'
		});
		expect(firstLine(s)).toBe("b7 7 1' - |");
	});
});

describe('encode: octave (written window relative to tonic at octave 4)', () => {
	it("marks octaves relative to the tonic-at-4 home: 5, 5 5' 1''", () => {
		const s = score([[n('G', 3, 1), n('G', 4, 1), n('G', 5, 1), n('C', 6, 1)]]);
		expect(firstLine(s)).toBe("5, 5 5' 1'' |");
	});

	it('uses the letter-based octave so B# and Cb land right', () => {
		// B#3 sounds like C4 but is written below the home window → #7,
		// Cb4 sounds like B3 but is written inside the window → b1
		const s = score([
			[n('B', 3, 1, { alter: 1 }), n('C', 4, 1, { alter: -1 }), n('C', 4, 2)]
		]);
		expect(firstLine(s)).toBe('#7, b1 1 - |');
	});

	it('moves the home window with the key (F: C4 is 5,)', () => {
		const s = score([[n('C', 4, 1), n('F', 4, 1), n('E', 5, 1), n('F', 5, 1)]], {
			key: 'F'
		});
		expect(firstLine(s)).toBe("5, 1 7 1' |");
	});
});

describe('encode: rhythm (crude beat grid)', () => {
	it('sustains: N beats → digit + (N-1) holds', () => {
		const s = score([[n('C', 4, 2), n('D', 4, 2)], [n('E', 4, 4)], [r(4)]]);
		expect(firstLine(s)).toBe('1 - 2 - | 3 - - - | 0 0 0 0 |');
	});

	it('sub-beat notes keep their own cell: eighth → /, sixteenth → //', () => {
		const s = score([
			[n('C', 4, 0.5), n('D', 4, 0.5), n('E', 4, 0.25), n('F', 4, 0.25), n('G', 4, 2.5)]
		]);
		expect(firstLine(s)).toBe('1/ 2/ 3// 4// 5 - - |');
	});

	it('dotted: 1.5 beats → digit.', () => {
		const s = score([[n('C', 4, 1.5), n('D', 4, 0.5), n('E', 4, 2)]]);
		expect(firstLine(s)).toBe('1. 2/ 3 - |');
	});

	it('rounds odd durations to the nearest beat (lossy by design)', () => {
		const s = score([[n('C', 4, 1.25), n('D', 4, 1.25), n('E', 4, 1.5)]]);
		expect(firstLine(s)).toBe('1 2 3. |');
	});

	it('uses the meter beat as the cell: in 2/2 a half note is one cell', () => {
		const s = score([[n('C', 4, 2), n('D', 4, 2)]], { ts: { beats: 2, beatType: 2 } });
		expect(firstLine(s)).toBe('1 2 |');
	});
});

describe('encode: rests', () => {
	it('emits one 0 per beat of rest', () => {
		const s = score([[r(1), n('C', 4, 1), r(2)]]);
		expect(firstLine(s)).toBe('0 1 0 0 |');
	});

	it('merges consecutive sub-beat rests up to whole beats', () => {
		const s = score([[n('C', 4, 1), r(0.5), r(0.5), n('D', 4, 1), n('E', 4, 1)]]);
		expect(firstLine(s)).toBe('1 0 2 3 |');
	});

	it('drops a lone sixteenth rest (crude grid)', () => {
		const s = score([[n('C', 4, 1), r(0.25), n('D', 4, 1), n('E', 4, 1)]]);
		expect(firstLine(s)).toBe('1 2 3 |');
	});
});

describe('encode: ties', () => {
	it('prefixes the continued note with ~', () => {
		const s = score([
			[n('C', 4, 4)],
			[n('C', 4, 2, { tiedFromPrev: true }), n('D', 4, 2)]
		]);
		expect(firstLine(s)).toBe('1 - - - | ~1 - 2 - |');
	});
});

describe('encode: posted (heuristic — final fermata or very long final note)', () => {
	it('fermata on the final note → single X cell', () => {
		const s = score([[n('C', 4, 2), n('D', 4, 2, { fermata: true })]]);
		expect(firstLine(s)).toBe('1 - X |');
	});

	it('final note of 4+ beats → X even without a fermata', () => {
		const s = score([[n('C', 4, 4)]]);
		expect(firstLine(s)).toBe('X |');
	});

	it('a short final note is not posted', () => {
		const s = score([[n('C', 4, 2), n('D', 4, 2)]]);
		expect(firstLine(s)).toBe('1 - 2 - |');
	});

	it('a fermata mid-score is not posted', () => {
		const s = score([[n('C', 4, 1, { fermata: true }), n('D', 4, 1), n('E', 4, 2)]]);
		expect(firstLine(s)).toBe('1 2 3 - |');
	});

	it('a final rest blocks posting', () => {
		const s = score([[n('C', 4, 3, { fermata: true }), r(1)]]);
		expect(firstLine(s)).toBe('1 - - 0 |');
	});

	it('the 4-beat threshold counts meter beats, not quarters', () => {
		// in 2/2 a 4-quarter note is only 2 cells — not posted
		const s = score([[n('C', 4, 4)]], { ts: { beats: 2, beatType: 2 } });
		expect(firstLine(s)).toBe('1 - |');
	});
});

describe('encode: pickup (anacrusis)', () => {
	it('emits a partial first measure before the first barline', () => {
		const s = score([[n('C', 4, 1)], [n('D', 4, 2), n('E', 4, 2)]]);
		expect(firstLine(s)).toBe('1 | 2 - 3 - |');
	});

	it('a full first measure is not a pickup', () => {
		const s = score([[n('C', 4, 2), n('D', 4, 2)], [n('E', 4, 2), n('F', 4, 2)]]);
		expect(firstLine(s)).toBe('1 - 2 - | 3 - 4 - |');
	});
});

describe('encode: lyric line (from the Lead voice)', () => {
	it('places one syllable per onset, space-separated', () => {
		const s = score([
			[
				n('C', 4, 1, { lyric: lyr('When') }),
				n('D', 4, 1, { lyric: lyr("it's") }),
				n('E', 4, 2, { lyric: lyr('time') })
			]
		]);
		const lines = encode(s).split('\n');
		expect(lines).toHaveLength(5);
		expect(lines[4]).toBe("When it's time");
	});

	it('joins begin/middle syllables to the next syllable with a hyphen', () => {
		const s = score([
			[
				n('C', 4, 1, { lyric: lyr('slee', 'begin') }),
				n('C', 4, 1, { lyric: lyr('py', 'end') }),
				n('C', 4, 2, { lyric: lyr('time') })
			]
		]);
		expect(encode(s).split('\n')[4]).toBe('slee-py time');
	});

	it('marks held and rest beats with _ and trims trailing holds', () => {
		const s = score([[n('C', 4, 1, { lyric: lyr('go') }), r(1), n('C', 4, 2, { lyric: lyr('on') })]]);
		expect(encode(s).split('\n')[4]).toBe('go _ on');
	});

	it('a tied continuation carries no syllable (held beat)', () => {
		const s = score([
			[n('C', 4, 4, { lyric: lyr('hold') })],
			[n('C', 4, 2, { tiedFromPrev: true }), n('D', 4, 2, { lyric: lyr('me') })]
		]);
		expect(encode(s).split('\n')[4]).toBe('hold _ _ _ _ _ me');
	});

	it('does not hyphenate across an intervening held beat', () => {
		const s = score([
			[
				n('C', 4, 2, { lyric: lyr('ne', 'begin') }),
				n('C', 4, 1, { lyric: lyr('ver', 'end') }),
				n('C', 4, 1, { lyric: lyr('more') })
			]
		]);
		expect(encode(s).split('\n')[4]).toBe('ne _ ver more');
	});

	it('keeps the syllable on a posted X cell', () => {
		const s = score([
			[n('C', 4, 2, { lyric: lyr('la') }), n('C', 4, 2, { fermata: true, lyric: lyr('home') })]
		]);
		const lines = encode(s).split('\n');
		expect(lines[0]).toBe('1 - X |');
		expect(lines[4]).toBe('la _ home');
	});

	it('omits the lyric line entirely when there are no lyrics', () => {
		const s = score([[n('C', 4, 2), n('D', 4, 2)]]);
		expect(encode(s).split('\n')).toHaveLength(4);
	});
});

describe('encode: layout (staffs, barlines, voice order)', () => {
	it('breaks into staffs of 4 measures separated by a blank line', () => {
		const measure = [n('C', 4, 2), n('D', 4, 2)];
		const s = score([measure, measure, measure, measure, measure, measure]);
		const staffs = encode(s).split('\n\n');
		expect(staffs).toHaveLength(2);
		expect(staffs[0].split('\n')[0]).toBe('1 - 2 - | 1 - 2 - | 1 - 2 - | 1 - 2 - |');
		expect(staffs[1].split('\n')[0]).toBe('1 - 2 - | 1 - 2 - |');
		expect(staffs[1].split('\n')).toHaveLength(4);
	});

	it('counts the pickup outside the 4-measure staff window', () => {
		const measure = [n('C', 4, 2), n('D', 4, 2)];
		const s = score([[n('C', 4, 1)], measure, measure, measure, measure, measure]);
		const staffs = encode(s).split('\n\n');
		expect(staffs).toHaveLength(2);
		expect(staffs[0].split('\n')[0]).toBe('1 | 1 - 2 - | 1 - 2 - | 1 - 2 - | 1 - 2 - |');
		expect(staffs[1].split('\n')[0]).toBe('1 - 2 - |');
	});

	it('always prints voices in Tenor/Lead/Baritone/Bass order regardless of input order', () => {
		const s: ScoreModel = {
			tonicPitchClass: 0,
			mode: 'major',
			keyName: 'C',
			timeSignature: { beats: 4, beatType: 4 },
			voices: [
				{ role: 'bass', measures: [[n('F', 3, 2), r(2)]] },
				{ role: 'tenor', measures: [[n('A', 4, 2), r(2)]] },
				{ role: 'lead', measures: [[n('F', 4, 2), r(2)]] },
				{ role: 'baritone', measures: [[n('C', 4, 2), r(2)]] }
			]
		};
		expect(encode(s).split('\n')).toEqual([
			'6 - 0 0 |',
			'4 - 0 0 |',
			'1 - 0 0 |',
			'4, - 0 0 |'
		]);
	});

	it('is deterministic', () => {
		const s = score([
			[n('C', 4, 1, { lyric: lyr('go') }), n('E', 4, 1, { alter: -1 }), n('G', 3, 2)]
		]);
		expect(encode(s)).toBe(encode(s));
	});
});
