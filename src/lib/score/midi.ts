/**
 * MIDI → ScoreModel (FABLE_SPEC §6.2).
 *
 * Deterministic and offline, via @tonejs/midi. MIDI is lossier than MusicXML:
 * enharmonic spelling is absent (61 = C♯ or D♭) and voices may share a track,
 * so this importer guesses — key from the key-signature meta event or a
 * Krumhansl-lite pitch-class fit, voices from track names / pitch order /
 * chord splitting — and reports every guess as a warning for the review step.
 */

import { Midi } from '@tonejs/midi';
import type { NoteEvent, ScoreModel, Step, Voice } from './types';
import { VOICE_ROLES } from './types';
import {
	LETTERS,
	LETTER_PC,
	diatonicAlterForLetter,
	fifthsForKey,
	parseKeyName
} from './encode';

const EPS = 1e-6;
/** sixteenth grid, in quarter-beats */
const GRID = 0.25;
/** Major-key tonic spellings by pitch class (flat-leaning, barbershop-friendly). */
const MAJOR_NAME_BY_PC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

interface RawNote {
	start: number; // quarter-beats, quantized
	end: number; // quarter-beats, quantized
	midi: number;
}

export function parseMIDI(data: Uint8Array): { score: ScoreModel; warnings: string[] } {
	const warnings: string[] = [];
	const midi = new Midi(data);
	const ppq = midi.header.ppq || 480;

	const tsEvent = midi.header.timeSignatures[0];
	const timeSignature = tsEvent
		? { beats: tsEvent.timeSignature[0] || 4, beatType: tsEvent.timeSignature[1] || 4 }
		: { beats: 4, beatType: 4 };
	if (!tsEvent) warnings.push('No time signature in MIDI — assuming 4/4.');

	const melodic = midi.tracks.filter((t) => t.notes.length > 0);
	if (melodic.length === 0) throw new Error('MIDI file contains no notes');

	const quantize = (ticks: number) => Math.round((ticks / ppq) / GRID) * GRID;
	const trackNotes = melodic.map((t) =>
		t.notes
			.map((n) => {
				const start = quantize(n.ticks);
				const end = Math.max(start + GRID, quantize(n.ticks + n.durationTicks));
				return { start, end, midi: n.midi };
			})
			.sort((a, b) => a.start - b.start || b.midi - a.midi)
	);

	const streams = assignTracksToVoices(melodic.map((t) => t.name), trackNotes, warnings);
	streams.forEach((s, i) => enforceMonophony(s, VOICE_ROLES[i], warnings));

	// key: meta event, else inference
	let tonicPitchClass: number;
	let mode: 'major' | 'minor';
	let keyName: string;
	const ks = midi.header.keySignatures[0];
	if (ks && /^[A-G]/.test(ks.key ?? '')) {
		// @tonejs/midi reports the signature's *major* key name; minor = relative.
		const major = parseKeyName(ks.key);
		if (ks.scale === 'minor') {
			mode = 'minor';
			const letterIdx = LETTERS.indexOf(major.letter);
			const minorLetter = LETTERS[(letterIdx + 5) % 7];
			const minorPc = (((LETTER_PC[major.letter] + major.alter + 9) % 12) + 12) % 12;
			const alter = wrapAlter(minorPc - LETTER_PC[minorLetter]);
			tonicPitchClass = minorPc;
			keyName = minorLetter + (alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)) + 'm';
		} else {
			mode = 'major';
			keyName = ks.key;
			tonicPitchClass = (((LETTER_PC[major.letter] + major.alter) % 12) + 12) % 12;
		}
	} else {
		mode = 'major';
		tonicPitchClass = inferMajorTonic(streams);
		keyName = MAJOR_NAME_BY_PC[tonicPitchClass];
		warnings.push(
			`No key signature in MIDI — inferred ${keyName} major from pitch content; set the key in review.`
		);
	}

	const fifths = fifthsForKey(parseKeyName(keyName), mode);
	const measureLenQ = timeSignature.beats * (4 / timeSignature.beatType);
	const globalEnd = Math.max(0, ...streams.flat().map((n) => n.end));
	const numMeasures = Math.max(1, Math.ceil(globalEnd / measureLenQ - EPS));

	const voices: Voice[] = VOICE_ROLES.map((role, i) => ({
		role,
		measures: streamToMeasures(streams[i], measureLenQ, numMeasures, fifths)
	}));

	return {
		score: { tonicPitchClass, mode, keyName, timeSignature, voices },
		warnings
	};
}

// ── voice assignment ────────────────────────────────────────────────────────

function avgMidi(notes: RawNote[]): number {
	if (notes.length === 0) return -Infinity;
	return notes.reduce((s, n) => s + n.midi, 0) / notes.length;
}

function roleFromName(name: string): number {
	const n = name.toLowerCase();
	if (/tenor/.test(n)) return 0;
	if (/lead/.test(n)) return 1;
	if (/bari/.test(n)) return 2;
	if (/bass/.test(n)) return 3;
	return -1;
}

/** Split a polyphonic note list into `count` voices by pitch order at each onset. */
function splitByPitchOrder(notes: RawNote[], count: number): RawNote[][] {
	const groups = new Map<number, RawNote[]>();
	for (const n of notes) {
		const key = Math.round(n.start / GRID);
		const g = groups.get(key);
		if (g) g.push(n);
		else groups.set(key, [n]);
	}
	const out: RawNote[][] = Array.from({ length: count }, () => []);
	for (const key of Array.from(groups.keys()).sort((a, b) => a - b)) {
		const g = groups.get(key)!.sort((a, b) => b.midi - a.midi);
		if (count === 2) {
			out[0].push(g[0]);
			if (g.length > 1) out[1].push(g[g.length - 1]);
		} else {
			for (let i = 0; i < Math.min(g.length, count); i++) out[i].push(g[i]);
		}
	}
	return out;
}

function assignTracksToVoices(
	names: string[],
	trackNotes: RawNote[][],
	warnings: string[]
): RawNote[][] {
	const n = trackNotes.length;

	if (n === 1) {
		const polyphonic = trackNotes[0].some(
			(note, i, arr) => i > 0 && Math.abs(note.start - arr[i - 1].start) < EPS
		);
		warnings.push(
			polyphonic
				? 'Single polyphonic track split into 4 voices by pitch order — check voice assignment in review.'
				: 'Single melodic track — assigned to tenor, other voices left empty; fix in review.'
		);
		return splitByPitchOrder(trackNotes[0], 4);
	}

	if (n >= 4) {
		let indices = trackNotes.map((_, i) => i);
		if (n > 4) {
			warnings.push(`MIDI has ${n} melodic tracks — using the 4 busiest; check in review.`);
			indices = [...indices]
				.sort((a, b) => trackNotes[b].length - trackNotes[a].length)
				.slice(0, 4);
		}
		// by name if all four roles are labeled on distinct tracks
		const roles = indices.map((i) => roleFromName(names[i]));
		if (roles.every((r) => r >= 0) && new Set(roles).size === 4) {
			const out: RawNote[][] = [[], [], [], []];
			indices.forEach((trackIdx, j) => (out[roles[j]] = trackNotes[trackIdx]));
			return out;
		}
		// else highest average pitch = tenor … lowest = bass
		return indices
			.map((i) => trackNotes[i])
			.sort((a, b) => avgMidi(b) - avgMidi(a));
	}

	// 2–3 tracks: best-effort
	const sorted = [...trackNotes].sort((a, b) => avgMidi(b) - avgMidi(a));
	if (n === 2) {
		warnings.push(
			'MIDI has 2 tracks — split each into 2 voices by pitch order; check voice assignment in review.'
		);
		const [t0a, t0b] = splitByPitchOrder(sorted[0], 2);
		const [t1a, t1b] = splitByPitchOrder(sorted[1], 2);
		return [t0a, t0b, t1a, t1b];
	}
	warnings.push(
		'MIDI has 3 melodic tracks — assigned to tenor/lead/bass by pitch, baritone left empty; fix in review.'
	);
	return [sorted[0], sorted[1], [], sorted[2]];
}

/** Drop same-onset duplicates (keep top) and truncate overlaps within one voice. */
function enforceMonophony(notes: RawNote[], role: string, warnings: string[]): void {
	let warned = false;
	for (let i = notes.length - 1; i > 0; i--) {
		if (Math.abs(notes[i].start - notes[i - 1].start) < EPS) {
			notes.splice(i, 1); // sorted with higher midi first → keep top
			if (!warned) {
				warnings.push(`Simultaneous notes in the ${role} voice — kept the top note.`);
				warned = true;
			}
		}
	}
	for (let i = 0; i < notes.length - 1; i++) {
		if (notes[i].end > notes[i + 1].start + EPS) {
			notes[i].end = Math.max(notes[i].start + GRID, notes[i + 1].start);
		}
	}
}

// ── key inference (Krumhansl-lite, §6.2) ───────────────────────────────────

function inferMajorTonic(streams: RawNote[][]): number {
	const hist = new Array(12).fill(0);
	for (const stream of streams) {
		for (const n of stream) hist[((n.midi % 12) + 12) % 12] += n.end - n.start;
	}
	const total = hist.reduce((a, b) => a + b, 0) || 1;
	// the final bass note is the likeliest tonic
	const bassStream = streams[3]?.length ? streams[3] : streams.find((s) => s.length) ?? [];
	const lastBass = bassStream[bassStream.length - 1];
	const bassPc = lastBass ? ((lastBass.midi % 12) + 12) % 12 : -1;

	let best = 0;
	let bestScore = -Infinity;
	for (let tonic = 0; tonic < 12; tonic++) {
		let score = 0;
		for (const off of MAJOR_SCALE_OFFSETS) score += hist[(tonic + off) % 12];
		if (tonic === bassPc) score += 0.25 * total;
		if (score > bestScore + EPS) {
			bestScore = score;
			best = tonic;
		}
	}
	return best;
}

// ── spelling + measure building ─────────────────────────────────────────────

function wrapAlter(n: number): number {
	return ((((n + 6) % 12) + 12) % 12) - 6;
}

/**
 * Spell a chromatic pitch against the key: smallest accidental relative to the
 * key signature wins; ties prefer continuity with the previous note (sharps
 * ascending, flats descending; flat-leaning when there is no direction).
 */
export function spellPitch(
	midiNote: number,
	fifths: number,
	prevMidi?: number
): { step: Step; alter: NoteEvent['alter']; octave: number } {
	const pc = ((midiNote % 12) + 12) % 12;
	let best: { step: Step; alter: number; score: number } | null = null;
	for (const letter of LETTERS) {
		const alter = wrapAlter(pc - LETTER_PC[letter]);
		if (alter < -2 || alter > 2) continue;
		const rel = alter - diatonicAlterForLetter(letter, fifths);
		let score = Math.abs(rel) * 100 + Math.abs(alter) * 10;
		if (rel !== 0) {
			if (prevMidi !== undefined && midiNote > prevMidi) {
				if (rel < 0) score += 1; // ascending: prefer the sharp spelling
			} else if (rel > 0) {
				score += 1; // descending / no context: prefer the flat spelling
			}
		}
		if (!best || score < best.score) best = { step: letter, alter, score };
	}
	const { step, alter } = best!;
	const octave = (midiNote - alter - LETTER_PC[step]) / 12 - 1;
	return { step, alter: alter as NoteEvent['alter'], octave };
}

/**
 * Notes (+ gaps → rests) → per-measure NoteEvents; notes spanning barlines are
 * split into tied events (tiedFromPrev on each continuation).
 */
function streamToMeasures(
	notes: RawNote[],
	measureLenQ: number,
	numMeasures: number,
	fifths: number
): NoteEvent[][] {
	const measures: NoteEvent[][] = Array.from({ length: numMeasures }, () => []);
	const totalQ = numMeasures * measureLenQ;

	const pushSpan = (
		from: number,
		to: number,
		make: (tied: boolean) => NoteEvent
	) => {
		let start = from;
		while (start < to - EPS) {
			const m = Math.min(numMeasures - 1, Math.floor(start / measureLenQ + EPS));
			const chunkEnd = Math.min(to, (m + 1) * measureLenQ);
			const ev = make(start > from + EPS);
			ev.durationBeats = chunkEnd - start;
			measures[m].push(ev);
			start = chunkEnd;
		}
	};

	let cursor = 0;
	let prevMidi: number | undefined;
	for (const note of notes) {
		if (note.start > cursor + EPS) {
			pushSpan(cursor, note.start, () => ({ kind: 'rest', durationBeats: 0 }));
		}
		const { step, alter, octave } = spellPitch(note.midi, fifths, prevMidi);
		pushSpan(note.start, note.end, (tied) => {
			const ev: NoteEvent = { kind: 'note', step, alter, octave, durationBeats: 0 };
			if (tied) ev.tiedFromPrev = true;
			return ev;
		});
		prevMidi = note.midi;
		cursor = Math.max(cursor, note.end);
	}
	if (cursor < totalQ - EPS) {
		pushSpan(cursor, totalQ, () => ({ kind: 'rest', durationBeats: 0 }));
	}
	return measures;
}
