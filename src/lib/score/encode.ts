/**
 * ScoreModel → canonical ASCII notation body (FABLE_SPEC §6.4).
 *
 * One pure, deterministic function: `encode(score)`. The mapping table in
 * §6.4 is implemented rule-for-rule; the known-fuzzy areas (crude rhythm,
 * octave home, posted heuristic, enharmonics) follow the documented
 * heuristics and always land in the review screen.
 *
 * Also exports the small key-math helpers (letter distance, circle-of-fifths
 * diatonic alters) shared by the MIDI importer's enharmonic speller.
 */

import type { NoteEvent, ScoreModel, Step, Voice } from './types';
import { VOICE_ROLES } from './types';

// ── key math (shared with midi.ts) ─────────────────────────────────────────

export const LETTERS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_INDEX: Record<Step, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
export const LETTER_PC: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Circle-of-fifths position of the major key on each natural letter. */
const MAJOR_FIFTHS_BY_LETTER: Record<Step, number> = { C: 0, D: 2, E: 4, F: -1, G: 1, A: 3, B: 5 };
const SHARP_ORDER: Step[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: Step[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export interface TonicSpelling {
	letter: Step;
	alter: number;
}

/** Parse a key name like "C", "Bb", "F#m" into the tonic's spelled letter + alter. */
export function parseKeyName(keyName: string): TonicSpelling {
	const m = /^\s*([A-Ga-g])(##|#|bb|b)?/.exec(keyName ?? '');
	if (!m) return { letter: 'C', alter: 0 };
	const letter = m[1].toUpperCase() as Step;
	const acc = m[2] ?? '';
	const alter = acc.startsWith('#') ? acc.length : acc.startsWith('b') ? -acc.length : 0;
	return { letter, alter };
}

/** Circle-of-fifths value (sharps positive) for a key. Minor uses the relative major's signature. */
export function fifthsForKey(tonic: TonicSpelling, mode: 'major' | 'minor'): number {
	return MAJOR_FIFTHS_BY_LETTER[tonic.letter] + 7 * tonic.alter - (mode === 'minor' ? 3 : 0);
}

/** The key signature's alteration for a letter (e.g. B → -1 in F major). */
export function diatonicAlterForLetter(letter: Step, fifths: number): number {
	let alter = 0;
	for (let i = 0; i < fifths; i++) if (SHARP_ORDER[i % 7] === letter) alter++;
	for (let i = 0; i < -fifths; i++) if (FLAT_ORDER[i % 7] === letter) alter--;
	return alter;
}

// ── encoder ─────────────────────────────────────────────────────────────────

const EPS = 1e-6;
/** Readability default: wrap to a new staff every N measures (§ deliverable). */
const MEASURES_PER_STAFF = 4;

interface Cell {
	text: string;
	lyric: NoteEvent['lyric'] | null;
}

export function encode(score: ScoreModel): string {
	const tonic = parseKeyName(score.keyName);
	const fifths = fifthsForKey(tonic, score.mode);
	const beatType = score.timeSignature.beatType || 4;
	/** quarter-beats per notation cell (one cell = one beat of the meter) */
	const unitQuarters = 4 / beatType;
	/** cells per full measure */
	const measureUnits = score.timeSignature.beats || 4;
	/** letter-based position of the tonic's home (tonic at octave 4) */
	const tonicPos = 4 * 7 + LETTER_INDEX[tonic.letter];

	const voices = orderVoices(score.voices);
	const measureCount = Math.max(0, ...voices.map((v) => v.measures.length));
	if (measureCount === 0) return '';

	// Pickup: a partial first measure (by the longest voice) when more follow.
	const firstTotals = voices.map((v) => totalUnits(v.measures[0] ?? [], unitQuarters));
	const maxFirst = Math.max(...firstTotals);
	const hasPickup = measureCount >= 2 && maxFirst > EPS && maxFirst < measureUnits - EPS;
	const pickupUnits = hasPickup ? maxFirst : measureUnits;

	const pitchText = (ev: NoteEvent): string => {
		const step = ev.step as Step;
		const degree = ((LETTER_INDEX[step] - LETTER_INDEX[tonic.letter]) % 7 + 7) % 7 + 1;
		const rel = (ev.alter ?? 0) - diatonicAlterForLetter(step, fifths);
		const acc = rel > 0 ? '#'.repeat(rel) : rel < 0 ? 'b'.repeat(-rel) : '';
		// Written (letter-based) octave window so B#/Cb land right (§6.4).
		const notePos = (ev.octave ?? 4) * 7 + LETTER_INDEX[step];
		const w = Math.floor((notePos - tonicPos) / 7);
		const oct = w > 0 ? "'".repeat(w) : w < 0 ? ','.repeat(-w) : '';
		return acc + String(degree) + oct;
	};

	const renderVoice = (voice: Voice): Cell[][] => {
		// Posted heuristic: the voice's final event, if a note with a fermata
		// or lasting ≥ 4 beats, becomes a single X cell.
		let postedM = -1;
		let postedI = -1;
		for (let m = measureCount - 1; m >= 0; m--) {
			const evs = voice.measures[m] ?? [];
			if (evs.length === 0) continue;
			const last = evs[evs.length - 1];
			if (
				last.kind === 'note' &&
				(last.fermata || last.durationBeats / unitQuarters >= 4 - EPS)
			) {
				postedM = m;
				postedI = evs.length - 1;
			}
			break;
		}

		const out: Cell[][] = [];
		for (let m = 0; m < measureCount; m++) {
			const evs = voice.measures[m] ?? [];
			const cells: Cell[] = [];
			let pendingRest = 0;
			const flushRest = () => {
				const zeros = Math.round(pendingRest);
				for (let z = 0; z < zeros; z++) cells.push({ text: '0', lyric: null });
				pendingRest = 0;
			};
			for (let i = 0; i < evs.length; i++) {
				const ev = evs[i];
				const units = ev.durationBeats / unitQuarters;
				if (ev.kind === 'rest' || ev.step === undefined) {
					pendingRest += units; // merge consecutive sub-beat rests up to beats
					continue;
				}
				flushRest();
				if (m === postedM && i === postedI) {
					cells.push({ text: 'X', lyric: ev.lyric ?? null });
					continue;
				}
				const pitch = (ev.tiedFromPrev ? '~' : '') + pitchText(ev);
				const lyric = ev.tiedFromPrev ? null : (ev.lyric ?? null);
				if (units >= 0.875) {
					if (Math.abs(units - 1.5) < 0.01) {
						cells.push({ text: pitch + '.', lyric }); // dotted (lengthen by half)
					} else {
						const n = Math.max(1, Math.round(units)); // crude grid: nearest beat
						cells.push({ text: pitch, lyric });
						for (let h = 1; h < n; h++) cells.push({ text: '-', lyric: null });
					}
				} else if (units >= 0.375) {
					cells.push({ text: pitch + '/', lyric }); // eighth
				} else {
					cells.push({ text: pitch + '//', lyric }); // sixteenth
				}
			}
			flushRest();
			if (cells.length === 0) {
				// empty measure: best-effort full rest
				const expected = m === 0 && hasPickup ? pickupUnits : measureUnits;
				const zeros = Math.max(1, Math.round(expected));
				for (let z = 0; z < zeros; z++) cells.push({ text: '0', lyric: null });
			}
			out.push(cells);
		}
		return out;
	};

	const rendered = voices.map(renderVoice); // [voiceIdx][measureIdx][cellIdx]

	// Staff layout: pickup attaches before the first `|`; then 4 measures per staff.
	const bodyMeasures: number[] = [];
	for (let m = hasPickup ? 1 : 0; m < measureCount; m++) bodyMeasures.push(m);
	const staffChunks: number[][] = [];
	if (bodyMeasures.length === 0) {
		staffChunks.push([]); // degenerate: pickup-only score
	} else {
		for (let i = 0; i < bodyMeasures.length; i += MEASURES_PER_STAFF) {
			staffChunks.push(bodyMeasures.slice(i, i + MEASURES_PER_STAFF));
		}
	}

	const staffs = staffChunks.map((chunk, staffIdx) => {
		const includePickup = hasPickup && staffIdx === 0;
		const lines = rendered.map((measures) => {
			const segs = chunk.map((m) => measures[m].map((c) => c.text).join(' '));
			if (includePickup) segs.unshift(measures[0].map((c) => c.text).join(' '));
			return segs.join(' | ') + ' |';
		});
		const lyricLine = renderLyricLine(
			(includePickup ? [rendered[1][0]] : []).concat(chunk.map((m) => rendered[1][m]))
		);
		if (lyricLine !== null) lines.push(lyricLine);
		return lines.join('\n');
	});

	return staffs.join('\n\n');
}

function orderVoices(voices: Voice[]): Voice[] {
	const ordered = VOICE_ROLES.map((role) => voices.find((v) => v.role === role));
	if (ordered.every((v) => v !== undefined)) return ordered as Voice[];
	return voices; // fall back to given order if roles are missing/duplicated
}

function totalUnits(events: NoteEvent[], unitQuarters: number): number {
	return events.reduce((sum, ev) => sum + ev.durationBeats / unitQuarters, 0);
}

/**
 * Lead-voice lyric line for one staff (§3.3): one token per beat cell,
 * `_` for held/rest/hold cells, begin/middle syllables joined to the next
 * syllable with `-`. Returns null when the staff carries no lyrics.
 */
function renderLyricLine(measureCells: Cell[][]): string | null {
	const cells = measureCells.flat();
	if (!cells.some((c) => c.lyric)) return null;
	// trim trailing held beats — they carry no information at line end
	let end = cells.length;
	while (end > 0 && !cells[end - 1].lyric) end--;
	let out = '';
	for (let i = 0; i < end; i++) {
		const cell = cells[i];
		out += cell.lyric ? cell.lyric.text : '_';
		if (i < end - 1) {
			const joinHyphen =
				cell.lyric &&
				(cell.lyric.syllabic === 'begin' || cell.lyric.syllabic === 'middle') &&
				cells[i + 1].lyric;
			out += joinHyphen ? '-' : ' ';
		}
	}
	return out;
}
