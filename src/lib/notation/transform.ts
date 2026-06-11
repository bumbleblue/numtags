/**
 * Pure text transforms over canonical ASCII notation bodies (FABLE_SPEC §6.5).
 *
 * `shiftVoiceOctave` powers the review screen's per-voice "shift ±octave"
 * control (§6.4 known-fuzzy area 2: the encoder's home-octave guess can put a
 * whole voice an octave off). It is parse-aware — it tokenizes exactly like
 * parse.ts — but re-emits the body as text, preserving whitespace, barlines,
 * labels, lyrics and even invalid tokens verbatim. Only the octave marks of
 * note tokens on the targeted voice change.
 *
 * Also home to the blank authoring template (§6.6) and the non-blocking
 * validation warnings computed from a parse() result (§7.1).
 */

import type { Beat, ParsedTag } from './types';

/** Same voice-label prefix parse.ts strips, kept verbatim here. */
const VOICE_LABEL_RE = /^(\s*(?:tenor|lead|baritone|bass|t|l|b|bs)\s*:\s*)/i;

/** Canonical note token — must stay in sync with parse.ts NOTE_RE. */
const NOTE_RE = /^(~?)([#b]?)([1-7])('+|,+|)(\/{0,2})(\.?)$/;

/**
 * Shift every note of one voice up or down by whole octaves, as a pure text
 * transform. `voiceIndex` counts voice lines (lines containing `|`) within
 * each staff block, 0 = Tenor … 3 = Bass; every staff in the body is
 * affected. Non-note tokens, lyric lines, labels and whitespace pass through
 * verbatim. `delta` is in octaves (e.g. +1 / -1).
 */
export function shiftVoiceOctave(body: string, voiceIndex: number, delta: number): string {
	if (delta === 0) return body;
	let voiceInBlock = 0;
	return body
		.split('\n')
		.map((line) => {
			if (line.trim() === '') {
				voiceInBlock = 0; // blank line = staff-block boundary (parse.ts)
				return line;
			}
			if (!line.includes('|')) return line; // lyric line
			const isTarget = voiceInBlock === voiceIndex;
			voiceInBlock++;
			return isTarget ? shiftLine(line, delta) : line;
		})
		.join('\n');
}

function shiftLine(line: string, delta: number): string {
	const labelMatch = VOICE_LABEL_RE.exec(line);
	const label = labelMatch ? labelMatch[1] : '';
	const rest = line.slice(label.length);
	// Split keeping whitespace runs so spacing survives verbatim.
	const pieces = rest.split(/(\s+)/);
	return (
		label +
		pieces
			.map((piece) => {
				if (piece === '' || /^\s+$/.test(piece)) return piece;
				return shiftToken(piece, delta);
			})
			.join('')
	);
}

/** Adjust one token's octave marks; non-note tokens return unchanged. */
function shiftToken(token: string, delta: number): string {
	const m = NOTE_RE.exec(token);
	if (!m) return token;
	const [, tie, accidental, digit, octaveMarks, slashes, dot] = m;
	const current =
		octaveMarks.length === 0
			? 0
			: octaveMarks[0] === "'"
				? octaveMarks.length
				: -octaveMarks.length;
	const next = current + delta;
	const marks = next > 0 ? "'".repeat(next) : next < 0 ? ','.repeat(-next) : '';
	return tie + accidental + digit + marks + slashes + dot;
}

/**
 * Display-only enharmonic simplification for the "sharps only" view setting:
 * a flat becomes the sharp of the degree below (b5 → #4, b3 → #2),
 * deliberately ignoring spelling conventions — # reads better than b at
 * small sizes. Never touches stored text; the data model keeps both (§3).
 * b1 wraps to #7 an octave down (same pitch).
 */
export function flatAsSharp(beat: Beat): Beat {
	if (beat.kind !== 'note' || beat.accidental !== 'flat' || beat.degree === undefined) return beat;
	const wraps = beat.degree === 1;
	const out: Beat = {
		...beat,
		accidental: 'sharp',
		degree: (wraps ? 7 : beat.degree - 1) as NonNullable<Beat['degree']>,
	};
	if (wraps) out.octave = (beat.octave ?? 0) - 1;
	return out;
}

/**
 * Blank 4-voice authoring template (§6.6): one placeholder measure per voice
 * (Tenor/Lead/Baritone/Bass home-chord pitches) plus a held-lyric line, so
 * the live preview shows a sensible staff to start from.
 */
export function blankTemplateBody(): string {
	return ['| 3 - - - |', '| 1 - - - |', '| 5, - - - |', '| 1, - - - |', '_ _ _ _'].join('\n');
}

/**
 * Non-blocking validation warnings computed from a parse() result (§6.6
 * "validate, don't block"): per-measure beat-count mismatches across voices.
 * (The ≠4-voices warning already comes from parse() itself.)
 *
 * parse() pads shorter voices with `empty` beats; a measure where voices'
 * real (unpadded) beat counts disagree gets one warning.
 */
export function beatMismatchWarnings(parsed: ParsedTag): string[] {
	const warnings: string[] = [];
	parsed.staffs.forEach((staff, si) => {
		staff.measures.forEach((measure, mi) => {
			const counts = measure.map((voiceBeats) => {
				let len = voiceBeats.length;
				while (len > 0 && voiceBeats[len - 1].kind === 'empty') len--;
				return len;
			});
			if (counts.length > 1 && new Set(counts).size > 1) {
				warnings.push(
					`Staff ${si + 1}, measure ${mi + 1}: voices have different beat counts (${counts.join(
						' / ',
					)})`,
				);
			}
		});
	});
	return warnings;
}
