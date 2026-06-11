/**
 * Semantic token model for the numeric notation (FABLE_SPEC §4.4).
 *
 * The parser reads a tag's canonical ASCII body into these tokens — octave and
 * subdivision are integers, not embedded glyphs — so the renderer draws marks
 * via CSS and never depends on font combining-mark behavior.
 */

export type BeatKind =
	| 'note'
	| 'hold' // `-` — sustain the previous note one more beat
	| 'rest' // `0`
	| 'posted' // `X` — hold until the director cuts
	| 'empty' // padding cell (measure alignment)
	| 'invalid'; // unparseable token — kept for §7.1 inline error markers

export interface Beat {
	kind: BeatKind;
	degree?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	accidental?: 'sharp' | 'flat'; // from `#` / `b`
	octave?: number; // signed offset from home octave (`'` up / `,` down)
	subdivision?: number; // 0=quarter, 1=eighth, 2=sixteenth (`/`)
	dotted?: boolean; // `.`
	tiedFromPrev?: boolean; // `~`
	raw?: string; // original token text (always set for 'invalid')
	col?: number; // 0-based source column of the token (set for 'invalid')
}

/**
 * One row of beat-aligned lyrics. A staff can carry several (stacked
 * alternate-lyric rows, §3.3). `null` = held/rest beat (no syllable).
 */
export interface LyricRow {
	pickup: (string | null)[]; // aligned to pickup beats
	measures: (string | null)[][]; // [measureIndex][beatIndex]
}

/**
 * A staff = 4 voice lines + its lyric row(s). Voice order is always
 * Tenor, Lead, Baritone, Bass (§3.3).
 */
export interface ParsedStaff {
	/** [voiceIndex][beatIndex] — beats before the first `|` (anacrusis); empty arrays if none */
	pickup: Beat[][];
	/** [measureIndex][voiceIndex][beatIndex] */
	measures: Beat[][][];
	lyricRows: LyricRow[];
}

export interface ParseWarning {
	message: string;
	staffIndex?: number;
	line?: number; // 1-based line number in the body
	col?: number; // 0-based column of the offending token, when known
	length?: number; // length of the offending token, when known
	token?: string; // the offending token text, when the warning is about one
}

export interface ParsedTag {
	staffs: ParsedStaff[];
	warnings: ParseWarning[];
}

export const VOICE_NAMES = ['Tenor', 'Lead', 'Baritone', 'Bass'] as const;
export const VOICE_ABBREV = ['T', 'L', 'B', 'Bs'] as const;
