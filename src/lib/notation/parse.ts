/**
 * Canonical ASCII notation parser (FABLE_SPEC §3, §4.4).
 *
 * Reads a tag's canonical ASCII body into semantic `Beat` tokens — octave and
 * subdivision are integers, not embedded glyphs — plus beat-aligned lyric rows.
 *
 * Grammar (§3):
 *   - Body = staffs separated by blank line(s).
 *   - A staff = consecutive voice lines (lines containing `|`) + following
 *     lyric line(s). A lyric-only block after a blank line attaches to the
 *     previous staff as additional stacked LyricRows.
 *   - Voice line: whitespace-separated cells; `|` = barline; beats before the
 *     first `|` = pickup (right-aligned into the beat(s) before measure 1).
 *   - Token: optional `~` tie, optional `#`/`b` accidental, digit 1–7, octave
 *     `'`/`,` suffixes, subdivision `/` (1=eighth, 2=sixteenth), dotted `.`.
 *     Other tokens: `-` hold, `0` rest, `x`/`X`+ posted (stored canonical `X`,
 *     lowercase accepted as input). Anything else parses as kind 'invalid'
 *     with `raw` set plus a ParseWarning — never throws (§7.1).
 *
 * Lyric lines: a single space advances to the next beat cell; `_` (or a
 * standalone `-`) = a held/rest beat (null); a hyphen inside a word splits
 * syllables across consecutive beats (`slee-py` → "slee-", "py"); a run of
 * 2+ spaces is honored as one held beat between syllables (legacy).
 */

import { diagnoseToken } from './diagnose';
import type {
	Beat,
	LyricRow,
	ParsedStaff,
	ParseWarning,
	ParsedTag,
} from './types';

/** Optional voice label prefix on a voice line, e.g. `Tenor:` / `Bs:`. */
const VOICE_LABEL_RE = /^\s*(tenor|lead|baritone|bass|t|l|b|bs)\s*:\s*/i;

/**
 * Canonical note token, in canonical mark order:
 * tie, accidental, digit, octave marks (all `'` or all `,`), subdivision, dot.
 */
const NOTE_RE = /^(~?)([#b]?)([1-7])('+|,+|)(\/{0,2})(\.?)$/;

const EMPTY_BEAT: Beat = { kind: 'empty' };

function parseToken(token: string): Beat {
	if (token === '-') return { kind: 'hold' };
	if (token === '0') return { kind: 'rest' };
	if (/^[xX]+$/.test(token)) return { kind: 'posted' }; // typed x or X; drawn as X

	const m = NOTE_RE.exec(token);
	if (!m) return { kind: 'invalid', raw: token };

	const [, tie, accidental, digit, octaveMarks, slashes, dot] = m;
	const beat: Beat = {
		kind: 'note',
		degree: Number(digit) as Beat['degree'],
	};
	if (accidental === '#') beat.accidental = 'sharp';
	if (accidental === 'b') beat.accidental = 'flat';
	if (octaveMarks.length > 0) {
		beat.octave =
			octaveMarks[0] === "'" ? octaveMarks.length : -octaveMarks.length;
	}
	if (slashes.length > 0) beat.subdivision = slashes.length;
	if (dot) beat.dotted = true;
	if (tie) beat.tiedFromPrev = true;
	return beat;
}

interface VoiceLine {
	lineNo: number; // 1-based line number in the body
	pickup: Beat[];
	measures: Beat[][];
}

function parseVoiceLine(text: string, lineNo: number): VoiceLine {
	const label = VOICE_LABEL_RE.exec(text)?.[0] ?? '';
	const unlabeled = text.slice(label.length);

	// Tokenize in place (rather than split) so each token keeps its source
	// column — invalid tokens carry it for inline error markers (§7.1).
	const segments: Beat[][] = [[]];
	for (const m of unlabeled.matchAll(/\||[^\s|]+/g)) {
		if (m[0] === '|') {
			segments.push([]);
			continue;
		}
		const beat = parseToken(m[0]);
		if (beat.kind === 'invalid') beat.col = label.length + m.index;
		segments[segments.length - 1].push(beat);
	}

	const pickup = segments[0];
	const measures = segments.slice(1).filter((m) => m.length > 0);

	return { lineNo, pickup, measures };
}

function padEnd(beats: Beat[], len: number): Beat[] {
	if (beats.length >= len) return beats;
	return [...beats, ...Array(len - beats.length).fill(EMPTY_BEAT)];
}

/** Right-align pickup beats so they lead into the first measure. */
function padStart(beats: Beat[], len: number): Beat[] {
	if (beats.length >= len) return beats;
	return [...Array(len - beats.length).fill(EMPTY_BEAT), ...beats];
}

/**
 * Parse one lyric line into flat beat-aligned cells.
 * Leading whitespace is stripped (monospace visual alignment only).
 */
function parseLyricLine(text: string): (string | null)[] {
	const trimmed = text.trimStart().trimEnd();
	if (!trimmed) return [];

	const cells: (string | null)[] = [];
	// A run of 2+ spaces = one held beat between syllables (legacy); a single
	// space just advances to the next cell.
	for (const segment of trimmed.split(/ {2,}/).flatMap((run, i) => {
		const words = run.split(' ').filter((w) => w.length > 0);
		return i === 0 ? words : [null, ...words];
	})) {
		if (segment === null) {
			cells.push(null); // the held beat a 2+-space run stands for
			continue;
		}
		if (segment === '_' || segment === '-') {
			cells.push(null); // explicit held/rest beat
			continue;
		}
		// Hyphen = syllable break across consecutive beats; the break hyphen
		// stays on the leading syllable ("slee-py" → "slee-", "py").
		const syllables = segment.split('-');
		syllables.forEach((syl, i) => {
			const cell = i < syllables.length - 1 ? `${syl}-` : syl;
			cells.push(cell === '' || cell === '-' || cell === '_' ? null : cell);
		});
	}
	return cells;
}

/**
 * Distribute one lyric line's cells across pickup beats then measures, in
 * order (cell i = flattened beat i). Trailing beats with no cells → null.
 */
function distributeLyrics(
	cells: (string | null)[],
	pickupLen: number,
	measureBeatCounts: number[],
): LyricRow {
	let pos = 0;
	const pickup: (string | null)[] = Array.from(
		{ length: pickupLen },
		() => cells[pos++] ?? null,
	);
	const measures = measureBeatCounts.map((count) =>
		Array.from({ length: count }, () => cells[pos++] ?? null),
	);
	return { pickup, measures };
}

interface Line {
	text: string;
	lineNo: number; // 1-based
}

/**
 * Parse a canonical ASCII notation body into staffs of semantic Beat tokens
 * plus beat-aligned lyric rows. Never throws — unparseable tokens become
 * kind 'invalid' beats with warnings (§7.1 partial parse).
 */
export function parse(body: string): ParsedTag {
	const staffs: ParsedStaff[] = [];
	const warnings: ParseWarning[] = [];

	// Group lines into blocks separated by blank line(s).
	const blocks: Line[][] = [];
	let current: Line[] = [];
	body.split('\n').forEach((text, i) => {
		if (text.trim() === '') {
			if (current.length > 0) blocks.push(current);
			current = [];
		} else {
			current.push({ text, lineNo: i + 1 });
		}
	});
	if (current.length > 0) blocks.push(current);

	for (const block of blocks) {
		const voiceLines = block.filter((l) => l.text.includes('|'));
		const lyricLines = block.filter((l) => !l.text.includes('|'));

		if (voiceLines.length === 0) {
			// Lyric-only block: attaches to the previous staff (§3.3).
			const staff = staffs[staffs.length - 1];
			if (!staff) {
				warnings.push({
					message: 'Lyric lines with no staff to attach to',
					line: block[0].lineNo,
				});
				continue;
			}
			const pickupLen = staff.pickup[0]?.length ?? 0;
			const beatCounts = staff.measures.map((m) => m[0]?.length ?? 0);
			for (const l of lyricLines) {
				staff.lyricRows.push(
					distributeLyrics(parseLyricLine(l.text), pickupLen, beatCounts),
				);
			}
			continue;
		}

		const staffIndex = staffs.length;
		const voices = voiceLines.map((l) => parseVoiceLine(l.text, l.lineNo));

		if (voices.length !== 4) {
			warnings.push({
				message: `Staff ${staffIndex + 1} has ${voices.length} voice line${
					voices.length === 1 ? '' : 's'
				} (expected 4)`,
				staffIndex,
				line: voiceLines[0].lineNo,
			});
		}

		// Collect warnings for invalid tokens (the beats themselves stay in
		// place). The message explains what to type instead (§6.6).
		for (const v of voices) {
			for (const beat of [...v.pickup, ...v.measures.flat()]) {
				if (beat.kind === 'invalid' && beat.raw !== undefined) {
					warnings.push({
						message: `"${beat.raw}" isn't a token I know — ${diagnoseToken(beat.raw)}`,
						staffIndex,
						line: v.lineNo,
						col: beat.col,
						length: beat.raw.length,
						token: beat.raw,
					});
				}
			}
		}

		// Pickup: right-align across voices (§3.3).
		const pickupLen = Math.max(...voices.map((v) => v.pickup.length));
		const pickup = voices.map((v) => padStart(v.pickup, pickupLen));

		// Measures: pad shorter voices to each measure's max beat count.
		const measureCount = Math.max(...voices.map((v) => v.measures.length));
		const measures: Beat[][][] = Array.from(
			{ length: measureCount },
			(_, mi) => {
				const voiceBeats = voices.map((v) => v.measures[mi] ?? []);
				const maxBeats = Math.max(...voiceBeats.map((b) => b.length), 1);
				return voiceBeats.map((b) => padEnd(b, maxBeats));
			},
		);

		const beatCounts = measures.map((m) => m[0]?.length ?? 0);
		const lyricRows = lyricLines.map((l) =>
			distributeLyrics(parseLyricLine(l.text), pickupLen, beatCounts),
		);

		staffs.push({ pickup, measures, lyricRows });
	}

	return { staffs, warnings };
}
