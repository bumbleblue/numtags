/**
 * MusicXML (and compressed .mxl) → ScoreModel (FABLE_SPEC §6.2).
 *
 * Deterministic and offline. Handles partwise scores with 4 parts (one per
 * barbershop voice) and the 2-part SATB-on-2-staves convention (each part
 * carries 2 voices split by <voice> number, or by <chord/> stacking).
 * MusicXML preserves enharmonic spelling, so step+alter survive verbatim.
 *
 * Best-effort: recoverable oddities become warnings, never throws — only
 * structurally unreadable input does.
 */

import { unzipSync, strFromU8 } from 'fflate';
import type { NoteEvent, ScoreModel, Step, Voice, VoiceRole } from './types';
import { VOICE_ROLES } from './types';
import { LETTER_PC, parseKeyName } from './encode';

/** Major key names indexed by fifths + 7. */
const MAJOR_KEY_BY_FIFTHS = [
	'Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'
];
/** Relative-minor tonic names indexed by fifths + 7. */
const MINOR_KEY_BY_FIFTHS = [
	'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'
];

export function parseMusicXML(data: string | Uint8Array): ScoreModel {
	return parseMusicXMLWithWarnings(data).score;
}

export function parseMusicXMLWithWarnings(data: string | Uint8Array): {
	score: ScoreModel;
	warnings: string[];
} {
	const warnings: string[] = [];
	const xml = extractXmlText(data, warnings);

	const doc = new DOMParser().parseFromString(xml, 'application/xml') as XMLDocument;
	if (doc.getElementsByTagName('parsererror').length > 0 || !doc.documentElement) {
		throw new Error('Could not parse MusicXML: not well-formed XML');
	}
	const rootTag = doc.documentElement.tagName;
	if (rootTag === 'score-timewise') {
		throw new Error('score-timewise MusicXML is not supported (export partwise)');
	}
	if (rootTag !== 'score-partwise') {
		throw new Error(`Not a MusicXML score (root element <${rootTag}>)`);
	}

	// part-list: id → human part name
	const partNames = new Map<string, string>();
	for (const sp of Array.from(doc.getElementsByTagName('score-part'))) {
		const id = sp.getAttribute('id') ?? '';
		const name = textOf(sp, 'part-name') ?? '';
		partNames.set(id, name);
	}

	const ctx: ParseContext = { key: null, time: null, warnings };
	const rawParts: RawPart[] = Array.from(doc.documentElement.children)
		.filter((el) => el.tagName === 'part')
		.map((el) => parsePart(el, partNames.get(el.getAttribute('id') ?? '') ?? '', ctx));

	// key / time signature (defaults + warnings per §6.2)
	let tonicPitchClass = 0;
	let mode: 'major' | 'minor' = 'major';
	let keyName = 'C';
	if (ctx.key) {
		mode = ctx.key.mode === 'minor' ? 'minor' : 'major';
		const idx = Math.max(0, Math.min(14, ctx.key.fifths + 7));
		keyName = mode === 'minor' ? MINOR_KEY_BY_FIFTHS[idx] + 'm' : MAJOR_KEY_BY_FIFTHS[idx];
		tonicPitchClass = pcOfKeyName(keyName);
	} else {
		warnings.push('No key signature found — defaulting to C major; set the key in review.');
	}
	const timeSignature = ctx.time ?? { beats: 4, beatType: 4 };
	if (!ctx.time) {
		warnings.push('No time signature found — assuming 4/4.');
	}
	const measureLenQ = timeSignature.beats * (4 / timeSignature.beatType);

	const voices = assignVoices(rawParts, measureLenQ, warnings);

	return {
		score: { tonicPitchClass, mode, keyName, timeSignature, voices },
		warnings
	};
}

// ── .mxl handling ───────────────────────────────────────────────────────────

function extractXmlText(data: string | Uint8Array, warnings: string[]): string {
	if (typeof data === 'string') return data;
	if (data.length >= 2 && data[0] === 0x50 && data[1] === 0x4b) {
		// ZIP magic "PK" → compressed .mxl
		const files = unzipSync(data);
		const container = files['META-INF/container.xml'];
		if (container) {
			const containerDoc = new DOMParser().parseFromString(
				strFromU8(container),
				'application/xml'
			);
			const rootfile = containerDoc.getElementsByTagName('rootfile')[0];
			const path = rootfile?.getAttribute('full-path');
			if (path && files[path]) return strFromU8(files[path]);
			warnings.push('MXL container.xml rootfile missing or unreadable — using first XML file.');
		}
		const fallback = Object.keys(files).find(
			(name) => !name.startsWith('META-INF/') && /\.(xml|musicxml)$/i.test(name)
		);
		if (fallback) return strFromU8(files[fallback]);
		throw new Error('Compressed MusicXML (.mxl) contains no score XML file');
	}
	return new TextDecoder().decode(data);
}

// ── raw part parsing ────────────────────────────────────────────────────────

interface RawEvent {
	voiceKey: string;
	chord: boolean;
	rest: boolean;
	step?: Step;
	alter: number;
	octave: number;
	durQ: number; // quarter-beats (divisions-normalized)
	tieStop: boolean;
	fermata: boolean;
	lyric?: NoteEvent['lyric'];
	midi: number; // chromatic pitch for averaging/ordering; NaN for rests
}

interface RawPart {
	name: string;
	measures: RawEvent[][];
}

interface ParseContext {
	key: { fifths: number; mode: string } | null;
	time: { beats: number; beatType: number } | null;
	warnings: string[];
}

function parsePart(partEl: Element, name: string, ctx: ParseContext): RawPart {
	let divisions = 1;
	let warnedGrace = false;
	const measures: RawEvent[][] = [];

	for (const measureEl of Array.from(partEl.children)) {
		if (measureEl.tagName !== 'measure') continue;
		const events: RawEvent[] = [];
		for (const el of Array.from(measureEl.children)) {
			if (el.tagName === 'attributes') {
				const div = textOf(el, 'divisions');
				if (div) divisions = Math.max(1, parseFloat(div) || 1);
				const keyEl = el.getElementsByTagName('key')[0];
				if (keyEl && !ctx.key) {
					ctx.key = {
						fifths: parseInt(textOf(keyEl, 'fifths') ?? '0', 10) || 0,
						mode: textOf(keyEl, 'mode') ?? 'major'
					};
				}
				const timeEl = el.getElementsByTagName('time')[0];
				if (timeEl && !ctx.time) {
					ctx.time = {
						beats: parseInt(textOf(timeEl, 'beats') ?? '4', 10) || 4,
						beatType: parseInt(textOf(timeEl, 'beat-type') ?? '4', 10) || 4
					};
				}
				continue;
			}
			if (el.tagName !== 'note') continue;
			if (el.getElementsByTagName('grace').length > 0 || el.getElementsByTagName('cue').length > 0) {
				if (!warnedGrace) {
					ctx.warnings.push(`Grace/cue notes skipped in part "${name || '?'}".`);
					warnedGrace = true;
				}
				continue;
			}
			const durText = textOf(el, 'duration');
			if (!durText) continue; // unreadable note — best-effort skip
			const durQ = (parseFloat(durText) || 0) / divisions;
			const rest = el.getElementsByTagName('rest').length > 0;
			const pitchEl = el.getElementsByTagName('pitch')[0];
			let step: Step | undefined;
			let alter = 0;
			let octave = 4;
			if (!rest && pitchEl) {
				const stepText = (textOf(pitchEl, 'step') ?? '').toUpperCase();
				if ('ABCDEFG'.includes(stepText) && stepText.length === 1) step = stepText as Step;
				alter = clampAlter(Math.round(parseFloat(textOf(pitchEl, 'alter') ?? '0') || 0));
				octave = parseInt(textOf(pitchEl, 'octave') ?? '4', 10);
				if (Number.isNaN(octave)) octave = 4;
			}
			const tieStop =
				Array.from(el.getElementsByTagName('tie')).some(
					(t) => t.getAttribute('type') === 'stop'
				) ||
				Array.from(el.getElementsByTagName('tied')).some(
					(t) => t.getAttribute('type') === 'stop'
				);
			const fermata = el.getElementsByTagName('fermata').length > 0;
			let lyric: NoteEvent['lyric'];
			const lyricEl = el.getElementsByTagName('lyric')[0];
			if (lyricEl) {
				const text = textOf(lyricEl, 'text');
				if (text) {
					const syl = textOf(lyricEl, 'syllabic');
					lyric = {
						text,
						syllabic:
							syl === 'begin' || syl === 'middle' || syl === 'end' ? syl : 'single'
					};
				}
			}
			events.push({
				voiceKey: textOf(el, 'voice') ?? textOf(el, 'staff') ?? '1',
				chord: el.getElementsByTagName('chord').length > 0,
				rest: rest || step === undefined,
				step,
				alter,
				octave,
				durQ,
				tieStop,
				fermata,
				lyric,
				midi: step !== undefined && !rest ? midiOf(step, alter, octave) : NaN
			});
		}
		measures.push(events);
	}
	return { name, measures };
}

function clampAlter(n: number): NonNullable<NoteEvent['alter']> {
	return Math.max(-2, Math.min(2, n)) as NonNullable<NoteEvent['alter']>;
}

function midiOf(step: Step, alter: number, octave: number): number {
	return (octave + 1) * 12 + LETTER_PC[step] + alter;
}

function pcOfKeyName(keyName: string): number {
	const { letter, alter } = parseKeyName(keyName);
	return ((LETTER_PC[letter] + alter) % 12 + 12) % 12;
}

function textOf(el: Element, tag: string): string | null {
	const found = el.getElementsByTagName(tag)[0];
	const text = found?.textContent;
	return text == null || text === '' ? null : text;
}

// ── voice stream extraction & role assignment ──────────────────────────────

interface Stream {
	partName: string;
	measures: NoteEvent[][];
	avgMidi: number;
	noteCount: number;
}

function toNoteEvent(ev: RawEvent): NoteEvent {
	const out: NoteEvent = { kind: ev.rest ? 'rest' : 'note', durationBeats: ev.durQ };
	if (!ev.rest) {
		out.step = ev.step;
		out.alter = clampAlter(ev.alter);
		out.octave = ev.octave;
		if (ev.tieStop) out.tiedFromPrev = true;
		if (ev.fermata) out.fermata = true;
		if (ev.lyric) out.lyric = ev.lyric;
	}
	return out;
}

function streamStats(measures: NoteEvent[][], partName: string): Stream {
	let sum = 0;
	let count = 0;
	for (const m of measures) {
		for (const ev of m) {
			if (ev.kind === 'note' && ev.step !== undefined) {
				sum += midiOf(ev.step, ev.alter ?? 0, ev.octave ?? 4);
				count++;
			}
		}
	}
	return { partName, measures, avgMidi: count ? sum / count : -Infinity, noteCount: count };
}

/**
 * Split one part into monophonic voice streams.
 * - Multiple <voice> numbers → one stream each (chords flattened to top note).
 * - Single voice + <chord/> stacks and chordSplit → two streams, top/bottom of
 *   each chord (single notes sing in both — barbershop unison convention).
 */
function partStreams(part: RawPart, chordSplit: boolean, warnings: string[]): Stream[] {
	const voiceKeys = Array.from(
		new Set(part.measures.flat().map((e) => e.voiceKey))
	).sort();

	if (voiceKeys.length > 1) {
		return voiceKeys
			.map((key) => {
				let droppedChord = false;
				const measures = part.measures.map((evs) => {
					const out: NoteEvent[] = [];
					for (const ev of evs) {
						if (ev.voiceKey !== key) continue;
						if (ev.chord && out.length > 0) {
							// flatten: keep the higher of the colliding notes
							const prev = out[out.length - 1];
							const prevMidi =
								prev.kind === 'note' && prev.step !== undefined
									? midiOf(prev.step, prev.alter ?? 0, prev.octave ?? 4)
									: -Infinity;
							if (!Number.isNaN(ev.midi) && ev.midi > prevMidi) {
								out[out.length - 1] = toNoteEvent(ev);
							}
							droppedChord = true;
							continue;
						}
						out.push(toNoteEvent(ev));
					}
					return out;
				});
				if (droppedChord) {
					warnings.push(
						`Chords in part "${part.name || '?'}" flattened to the top note — check in review.`
					);
				}
				return streamStats(measures, part.name);
			})
			.sort((a, b) => b.avgMidi - a.avgMidi);
	}

	const hasChords = part.measures.flat().some((e) => e.chord);
	if (chordSplit && hasChords) {
		let warnedUnison = false;
		const upper: NoteEvent[][] = [];
		const lower: NoteEvent[][] = [];
		for (const evs of part.measures) {
			const up: NoteEvent[] = [];
			const low: NoteEvent[] = [];
			// group base note + following <chord/> notes into one onset
			let group: RawEvent[] = [];
			const flushGroup = () => {
				if (group.length === 0) return;
				const sorted = [...group].sort((a, b) => b.midi - a.midi);
				up.push(toNoteEvent(sorted[0]));
				low.push(toNoteEvent(sorted[sorted.length - 1]));
				if (sorted.length === 1 && !warnedUnison) {
					warnings.push(
						`Single notes in part "${part.name || '?'}" assigned to both voices (unison) — check in review.`
					);
					warnedUnison = true;
				}
				group = [];
			};
			for (const ev of evs) {
				if (ev.rest) {
					flushGroup();
					up.push(toNoteEvent(ev));
					low.push(toNoteEvent(ev));
				} else if (ev.chord && group.length > 0) {
					group.push(ev);
				} else {
					flushGroup();
					group = [ev];
				}
			}
			flushGroup();
			upper.push(up);
			lower.push(low);
		}
		return [streamStats(upper, part.name), streamStats(lower, part.name)];
	}

	// single monophonic voice (4-part case: keep top note of any chords)
	let droppedChord = false;
	const measures = part.measures.map((evs) => {
		const out: NoteEvent[] = [];
		for (const ev of evs) {
			if (ev.chord && out.length > 0) {
				const prev = out[out.length - 1];
				const prevMidi =
					prev.kind === 'note' && prev.step !== undefined
						? midiOf(prev.step, prev.alter ?? 0, prev.octave ?? 4)
						: -Infinity;
				if (!Number.isNaN(ev.midi) && ev.midi > prevMidi) out[out.length - 1] = toNoteEvent(ev);
				droppedChord = true;
				continue;
			}
			out.push(toNoteEvent(ev));
		}
		return out;
	});
	if (droppedChord) {
		warnings.push(
			`Chords in part "${part.name || '?'}" flattened to the top note — check in review.`
		);
	}
	return [streamStats(measures, part.name)];
}

function roleFromName(name: string): VoiceRole | null {
	const n = name.toLowerCase();
	if (/tenor/.test(n)) return 'tenor';
	if (/lead/.test(n)) return 'lead';
	if (/bari/.test(n)) return 'baritone';
	if (/bass/.test(n)) return 'bass';
	return null;
}

function restMeasures(count: number, measureLenQ: number): NoteEvent[][] {
	return Array.from({ length: count }, () => [
		{ kind: 'rest', durationBeats: measureLenQ } as NoteEvent
	]);
}

function assignVoices(rawParts: RawPart[], measureLenQ: number, warnings: string[]): Voice[] {
	const partsWithNotes = rawParts.filter((p) => p.measures.flat().some((e) => !e.rest));
	const byRole = new Map<VoiceRole, Stream>();

	if (partsWithNotes.length >= 4) {
		let chosen = partsWithNotes;
		if (partsWithNotes.length > 4) {
			warnings.push(
				`Found ${partsWithNotes.length} parts with notes — using the 4 busiest; check in review.`
			);
			chosen = [...partsWithNotes]
				.map((p) => ({ p, n: p.measures.flat().filter((e) => !e.rest).length }))
				.sort((a, b) => b.n - a.n)
				.slice(0, 4)
				.map((x) => x.p);
		}
		const streams = chosen.map((p) => {
			const s = partStreams(p, false, warnings);
			if (s.length > 1) {
				warnings.push(
					`Part "${p.name || '?'}" has multiple voices — using the busiest; check in review.`
				);
				s.sort((a, b) => b.noteCount - a.noteCount);
			}
			return s[0];
		});
		// map by part name if all 4 roles are labeled, else by pitch order
		const named = streams.map((s) => roleFromName(s.partName));
		const allLabeled =
			named.every((r) => r !== null) && new Set(named).size === 4;
		if (allLabeled) {
			streams.forEach((s, i) => byRole.set(named[i] as VoiceRole, s));
		} else {
			const sorted = [...streams].sort((a, b) => b.avgMidi - a.avgMidi);
			VOICE_ROLES.forEach((role, i) => byRole.set(role, sorted[i]));
		}
	} else if (partsWithNotes.length === 2) {
		// SATB-on-2-staves barbershop convention
		const split = partsWithNotes.map((p) => {
			let streams = partStreams(p, true, warnings);
			if (streams.length === 1) {
				warnings.push(
					`Expected 2 voices in part "${p.name || '?'}" but found 1 — other voice left as rests.`
				);
				const count = streams[0].measures.length;
				streams = [streams[0], streamStats(restMeasures(count, measureLenQ), p.name)];
			} else if (streams.length > 2) {
				warnings.push(
					`Part "${p.name || '?'}" has ${streams.length} voices — using highest and lowest.`
				);
				streams = [streams[0], streams[streams.length - 1]];
			}
			return streams;
		});
		// which part is the treble (tenor+lead) staff?
		const names = partsWithNotes.map((p) => p.name.toLowerCase());
		let trebleIdx: number;
		if (/tenor|lead/.test(names[0]) || /bari|bass/.test(names[1])) trebleIdx = 0;
		else if (/tenor|lead/.test(names[1]) || /bari|bass/.test(names[0])) trebleIdx = 1;
		else {
			const avg = split.map(
				(s) => (s[0].avgMidi + (s[1].noteCount ? s[1].avgMidi : s[0].avgMidi)) / 2
			);
			trebleIdx = avg[0] >= avg[1] ? 0 : 1;
		}
		const treble = split[trebleIdx];
		const bassStaff = split[1 - trebleIdx];
		byRole.set('tenor', treble[0]);
		byRole.set('lead', treble[1]);
		byRole.set('baritone', bassStaff[0]);
		byRole.set('bass', bassStaff[1]);
	} else {
		// 1 or 3 parts: best-effort, top-to-bottom by pitch
		warnings.push(
			`Expected 4 parts (or 2 staves × 2 voices) but found ${partsWithNotes.length} — best-effort voice assignment; fix in review.`
		);
		const streams = partsWithNotes
			.flatMap((p) => partStreams(p, true, warnings))
			.sort((a, b) => b.avgMidi - a.avgMidi)
			.slice(0, 4);
		streams.forEach((s, i) => byRole.set(VOICE_ROLES[i], s));
	}

	// normalize: every role present, every voice the same measure count
	const measureCount = Math.max(
		1,
		...Array.from(byRole.values()).map((s) => s.measures.length)
	);
	return VOICE_ROLES.map((role) => {
		const stream = byRole.get(role);
		const measures = stream ? [...stream.measures] : [];
		while (measures.length < measureCount) {
			measures.push([{ kind: 'rest', durationBeats: measureLenQ }]);
		}
		if (!stream) {
			warnings.push(`No source found for the ${role} voice — filled with rests.`);
		}
		return { role, measures };
	});
}
