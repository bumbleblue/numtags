/**
 * Lyric grid helpers for the beat-anchored lyric editor (§6.5/§6.6).
 *
 * The review screen edits voices and lyrics separately: the source textarea
 * holds ONLY voice lines, and lyrics live as per-beat syllable cells typed
 * directly under the rendered notes. These helpers convert between that
 * split view and the canonical body (voice lines + token lyric lines, §3.3).
 *
 * Cell convention: one string per flattened beat (pickup first, then
 * measures), '' = no syllable on that beat (canonical `_`). A cell whose
 * text ends with '-' continues its word into the next cell ("slee-" "py"
 * ⇄ the canonical chunk "slee-py").
 */
import { parse } from './parse';
import type { ParsedStaff } from './types';

/** [staffIndex][rowIndex][flatBeatIndex] */
export type LyricCells = string[][][];

function padded(cells: (string | null)[] | undefined, len: number): string[] {
	const out: string[] = [];
	for (let i = 0; i < len; i++) out.push(cells?.[i] ?? '');
	return out.map((c) => c ?? '');
}

/** Flatten a staff's lyric rows to beat-aligned cell arrays ('' = none). */
export function lyricCellsForStaff(staff: ParsedStaff): string[][] {
	const pickupLen = staff.pickup[0]?.length ?? 0;
	const beatCounts = staff.measures.map((m) => m[0]?.length ?? 0);
	return staff.lyricRows.map((row) => [
		...padded(row.pickup, pickupLen),
		...beatCounts.flatMap((len, mi) => padded(row.measures[mi], len)),
	]);
}

/** Total flattened beat count of a staff (pickup + measures). */
export function staffBeatCount(staff: ParsedStaff): number {
	return (
		(staff.pickup[0]?.length ?? 0) +
		staff.measures.reduce((n, m) => n + (m[0]?.length ?? 0), 0)
	);
}

/**
 * Split a canonical body into voice-only source text and lyric cells.
 * Voice lines (lines containing `|`) keep their staff grouping; everything
 * else becomes cells aligned to the parsed beat grid.
 */
export function splitBody(body: string): { voiceBody: string; lyricCells: LyricCells } {
	const parsed = parse(body);
	const lyricCells = parsed.staffs.map(lyricCellsForStaff);

	const blocks: string[][] = [];
	let cur: string[] = [];
	for (const line of body.split('\n')) {
		if (line.includes('|')) {
			cur.push(line);
		} else if (cur.length) {
			blocks.push(cur);
			cur = [];
		}
	}
	if (cur.length) blocks.push(cur);

	return { voiceBody: blocks.map((b) => b.join('\n')).join('\n\n'), lyricCells };
}

/** One lyric row of cells → a canonical token lyric line. */
export function composeLyricLine(cells: string[]): string {
	const trimmed = [...cells];
	while (trimmed.length && !(trimmed[trimmed.length - 1] ?? '').trim()) trimmed.pop();

	const chunks: string[] = [];
	let joining = false;
	for (const raw of trimmed) {
		const c = (raw ?? '').trim().replace(/\s+/g, '-'); // cells are single syllables
		if (!c) {
			chunks.push('_');
			joining = false;
		} else if (joining && chunks.length) {
			chunks[chunks.length - 1] += c;
			joining = c.endsWith('-');
		} else {
			chunks.push(c);
			joining = c.endsWith('-');
		}
	}
	return chunks.join(' ');
}

/**
 * Recombine voice-only source text with lyric cells into a canonical body.
 * Lyric rows attach directly under their staff's voice lines; all-empty
 * rows are dropped.
 */
export function composeBody(voiceBody: string, lyricCells: LyricCells): string {
	const blocks = voiceBody
		.split(/\n{2,}/)
		.map((b) => b.split('\n').filter((l) => l.trim()))
		.filter((b) => b.length);

	const out = blocks.map((lines, si) => {
		const rows = (lyricCells[si] ?? [])
			.map(composeLyricLine)
			.filter((line) => line.length > 0);
		return [...lines, ...rows].join('\n');
	});
	return out.join('\n\n') + (out.length ? '\n' : '');
}
