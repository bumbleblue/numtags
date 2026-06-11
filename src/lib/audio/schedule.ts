/**
 * ParsedTag → playback schedule (pure; no Web Audio here).
 *
 * Time model: the parser already column-aligns voices (padded measures,
 * right-aligned pickups), so a grid column is a time slot shared by all four
 * voices, and staffs play back-to-back. A column normally lasts one beat;
 * subdivided cells shorten it (`6/ 5/` = two half-beat columns) and dotted
 * cells stretch it — when voices disagree, the fastest voice wins (§3.2:
 * other voices are stretched with holds, never packed).
 *
 * Rhythm is exactly as crude as the notation (§3.2) — playback renders what
 * is written, which doubles as a proofreading tool.
 *
 * Within a voice: a note sustains through `-` holds, `~` ties (same pitch),
 * posted `X`, and padding cells; a new onset, a differently-pitched tie, or a
 * `0` rest ends it. Notes still sounding at the end of the tag — the posted
 * final chord — get `finalChord` so the synth can give them a slow fade
 * instead of a clipped release.
 */

import type { Beat, ParsedTag } from '$lib/notation/types';
import { beatToMidi } from './pitch';

export interface ScheduledNote {
	voice: number; // 0=Tenor … 3=Bass
	midi: number;
	start: number; // beats from the top of the tag
	duration: number; // beats
	finalChord: boolean; // still sounding at the end → fade, don't clip
}

/** One grid column's time slot, for the follow-along highlight. */
export interface ColumnTick {
	staff: number;
	col: number; // flat column index (pickup 0…p-1, then measures)
	start: number; // beats
	duration: number; // beats
}

export interface Schedule {
	notes: ScheduledNote[];
	columns: ColumnTick[];
	totalBeats: number;
}

/** Nominal duration of one cell in beats (subdivision halves, dot ×1.5). */
function cellBeats(beat: Beat): number {
	return (1 / 2 ** (beat.subdivision ?? 0)) * (beat.dotted ? 1.5 : 1);
}

/** A column lasts as long as its fastest explicit note/rest (default 1 beat). */
function columnDuration(column: Beat[]): number {
	let min = Infinity;
	for (const b of column) {
		if (b.kind === 'note' || b.kind === 'rest') min = Math.min(min, cellBeats(b));
	}
	return min === Infinity ? 1 : min;
}

export function buildSchedule(parsed: ParsedTag, tonicPc: number): Schedule {
	const notes: ScheduledNote[] = [];
	const columns: ColumnTick[] = [];

	// Per-voice open note, carried across columns/measures/staffs (ties may
	// cross a staff boundary).
	const open: (ScheduledNote | null)[] = [null, null, null, null];

	const closeOpen = (vi: number, at: number) => {
		const n = open[vi];
		if (n) {
			n.duration = at - n.start;
			open[vi] = null;
		}
	};

	let now = 0;

	for (let si = 0; si < parsed.staffs.length; si++) {
		const staff = parsed.staffs[si];
		// Pickup block, then each measure — the parser pads every voice to the
		// same column count within each block.
		const blocks: Beat[][][] = [staff.pickup, ...staff.measures].filter(
			(block) => (block[0]?.length ?? 0) > 0,
		);
		let flatCol = 0;

		for (const block of blocks) {
			const colCount = block[0].length;
			for (let ci = 0; ci < colCount; ci++) {
				const column = block.map((voiceBeats) => voiceBeats[ci] ?? { kind: 'empty' as const });
				const dur = columnDuration(column);

				columns.push({ staff: si, col: flatCol, start: now, duration: dur });

				column.forEach((beat, vi) => {
					switch (beat.kind) {
						case 'note': {
							const midi = beatToMidi(beat, tonicPc);
							if (midi === null) break;
							if (beat.tiedFromPrev && open[vi]?.midi === midi) break; // continuation
							closeOpen(vi, now);
							const note: ScheduledNote = {
								voice: vi,
								midi,
								start: now,
								duration: 0, // set when closed
								finalChord: false,
							};
							open[vi] = note;
							notes.push(note);
							break;
						}
						case 'rest':
						case 'invalid':
							closeOpen(vi, now);
							break;
						case 'hold':
						case 'posted':
						case 'empty':
							break; // sustain whatever is open
					}
				});

				now += dur;
				flatCol++;
			}
		}
	}

	// Whatever is still open rings to the end — the posted final chord.
	for (let vi = 0; vi < open.length; vi++) {
		const n = open[vi];
		if (n) {
			n.duration = now - n.start;
			n.finalChord = true;
			open[vi] = null;
		}
	}

	return {
		notes: notes.filter((n) => n.duration > 0),
		columns,
		totalBeats: now,
	};
}
