import { describe, expect, it } from 'vitest';
import { parse } from '$lib/notation/parse';
import { tonicPitchClass } from './pitch';
import { buildSchedule, type ScheduledNote } from './schedule';

const C = tonicPitchClass('C');

/** Build a 4-voice staff body from per-voice lines. */
const body = (...lines: string[]) => lines.join('\n');

const FOUR = (line: string) => body(line, line, line, line);

const byVoice = (notes: ScheduledNote[], voice: number) =>
	notes.filter((n) => n.voice === voice).sort((a, b) => a.start - b.start);

describe('buildSchedule', () => {
	it('one beat per cell; holds extend the note instead of re-attacking', () => {
		const { notes, totalBeats } = buildSchedule(parse(FOUR('| 3 - - 5 |')), C);
		const v0 = byVoice(notes, 0);
		expect(v0).toHaveLength(2);
		expect(v0[0]).toMatchObject({ start: 0, duration: 3, midi: 64 });
		expect(v0[1]).toMatchObject({ start: 3, duration: 1, midi: 67 });
		expect(totalBeats).toBe(4);
	});

	it('ties continue the same pitch across a barline without re-attacking', () => {
		const { notes } = buildSchedule(parse(FOUR('| 3 - | ~3 - |')), C);
		expect(byVoice(notes, 0)).toHaveLength(1);
		expect(byVoice(notes, 0)[0]).toMatchObject({ start: 0, duration: 4 });
	});

	it('a tie to a different pitch re-articulates (slur)', () => {
		const { notes } = buildSchedule(parse(FOUR('| 3 ~4 |')), C);
		const v0 = byVoice(notes, 0);
		expect(v0).toHaveLength(2);
		expect(v0[1]).toMatchObject({ start: 1, midi: 65 });
	});

	it('rests end the running note and stay silent', () => {
		const { notes } = buildSchedule(buildParsed('| 3 0 5 - |'), C);
		const v0 = byVoice(notes, 0);
		expect(v0[0]).toMatchObject({ start: 0, duration: 1 });
		expect(v0[1]).toMatchObject({ start: 2, duration: 2 });
	});

	it('subdivided cells shorten their column for all voices', () => {
		const parsed = parse(
			body('| 6/ 5/ 3 |', '| 1 - 1 |', '| 5, - 5, |', '| 1, - 1, |'),
		);
		const { notes, columns, totalBeats } = buildSchedule(parsed, C);
		expect(columns.map((c) => c.duration)).toEqual([0.5, 0.5, 1]);
		expect(totalBeats).toBe(2);
		// The lead's held 1 spans both eighth columns: one beat total.
		expect(byVoice(notes, 1)[0]).toMatchObject({ start: 0, duration: 1 });
		expect(byVoice(notes, 0).map((n) => n.start)).toEqual([0, 0.5, 1]);
	});

	it('right-aligns short pickups: late voices wait, they don\'t jump early', () => {
		const parsed = parse(body('5 5 | 3 |', '5 | 1 |', '5 5 | 5, |', '5 | 1, |'));
		const { notes } = buildSchedule(parsed, C);
		// Tenor enters at beat 0; Lead's single pickup beat right-aligns to beat 1.
		expect(byVoice(notes, 0)[0].start).toBe(0);
		expect(byVoice(notes, 1)[0].start).toBe(1);
	});

	it('marks notes ringing into posted X cells as the final chord', () => {
		const { notes, totalBeats } = buildSchedule(parse(FOUR('| 3 - X X |')), C);
		const v0 = byVoice(notes, 0);
		expect(v0).toHaveLength(1);
		expect(v0[0]).toMatchObject({ duration: 4, finalChord: true });
		expect(totalBeats).toBe(4);
	});

	it('plays staffs back to back with continuous column timing', () => {
		const parsed = parse(`${FOUR('| 3 - |')}\n\n${FOUR('| 5 - |')}`);
		const { notes, columns } = buildSchedule(parsed, C);
		expect(byVoice(notes, 0).map((n) => n.start)).toEqual([0, 2]);
		expect(columns.map((c) => [c.staff, c.col, c.start])).toEqual([
			[0, 0, 0],
			[0, 1, 1],
			[1, 0, 2],
			[1, 1, 3],
		]);
	});

	it('flat column indices count the pickup first, matching the renderer', () => {
		const parsed = parse(FOUR('5 | 3 - |'));
		const { columns } = buildSchedule(parsed, C);
		expect(columns.map((c) => c.col)).toEqual([0, 1, 2]);
	});

	it('survives invalid tokens and empty bodies', () => {
		expect(buildSchedule(parse(''), C).notes).toEqual([]);
		const { notes } = buildSchedule(parse(FOUR('| 3 ?? 5 |')), C);
		// invalid token ends the running note like a rest
		expect(byVoice(notes, 0)[0]).toMatchObject({ start: 0, duration: 1 });
	});
});

/** parse() wrapper for single-voice-of-interest cases (other voices rest). */
function buildParsed(line: string) {
	return parse(body(line, '| 0 0 0 0 |', '| 0 0 0 0 |', '| 0 0 0 0 |'));
}
