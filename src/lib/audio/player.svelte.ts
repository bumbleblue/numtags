/**
 * Singleton playback store (Svelte 5 runes, same pattern as settings).
 *
 * One tag plays at a time: either the full mix (`'all'`) or one voice solo
 * (its index). Tags are seconds long, so every note is scheduled up front on
 * the AudioContext clock; a rAF loop derives the current grid column from
 * `ctx.currentTime` to drive the follow-along highlight.
 *
 * The AudioContext is created/resumed inside play() — always a user gesture,
 * which is what iOS Safari requires. (Web Audio respects the iOS ring/silent
 * switch; that's a documented caveat, not a bug.)
 */

import type { ParsedTag } from '$lib/notation/types';
import { buildSchedule, type Schedule } from './schedule';
import { midiToFreq, tonicPitchClass } from './pitch';
import { playNote, type NoteHandle } from './synth';

export type PlayMode = 'all' | number; // number = solo voice index (0=Tenor … 3=Bass)

export interface Playhead {
	staff: number;
	col: number; // flat column index, matching the renderer's measure offsets
	voice: number | null; // solo voice index, null for the full mix
}

const BPM = 90;
const SEC_PER_BEAT = 60 / BPM;
const MASTER_GAIN = 0.22; // headroom for 4 voices
const LEAD_IN = 0.08; // scheduling headroom after resume()

class Player {
	/** What's currently sounding for this token, or null when idle.
	    $state.raw: these are replaced wholesale, and `token` must keep its
	    identity (callers compare it with ===) — no deep proxy. */
	playing = $state.raw<{ token: unknown; mode: PlayMode } | null>(null);
	playhead = $state.raw<Playhead | null>(null);

	#ctx: AudioContext | null = null;
	#master: GainNode | null = null;
	#handles: NoteHandle[] = [];
	#raf = 0;
	#fallbackTimer: ReturnType<typeof setInterval> | null = null;

	/**
	 * Start playback; any current playback stops first. `token` identifies the
	 * tag for the UI (pass the parsed object itself) so callers can ask "is
	 * *my* tag playing?".
	 */
	async play(parsed: ParsedTag, keyName: string | undefined, mode: PlayMode): Promise<void> {
		this.stop();

		const schedule = buildSchedule(parsed, tonicPitchClass(keyName));
		if (schedule.notes.length === 0) return;

		const ctx = (this.#ctx ??= new AudioContext());
		if (ctx.state !== 'running') {
			// Inside a real tap this resolves immediately; if the browser blocks
			// autoplay anyway (no user activation), bail out instead of sitting
			// in a stuck "playing" state with a frozen clock.
			await Promise.race([ctx.resume(), new Promise((res) => setTimeout(res, 500))]);
			// Fresh read: the await may have changed the state (TS can't know,
			// so it over-narrows without the cast).
			if ((ctx.state as AudioContextState) !== 'running') return;
		}

		const master = ctx.createGain();
		master.gain.value = MASTER_GAIN;
		master.connect(ctx.destination);
		this.#master = master;

		const t0 = ctx.currentTime + LEAD_IN;
		for (const note of schedule.notes) {
			if (mode !== 'all' && note.voice !== mode) continue;
			this.#handles.push(
				playNote(
					ctx,
					master,
					midiToFreq(note.midi),
					t0 + note.start * SEC_PER_BEAT,
					note.duration * SEC_PER_BEAT,
					note.finalChord,
				),
			);
		}

		this.playing = { token: parsed, mode };
		this.#followPlayhead(ctx, t0, schedule, mode);
	}

	stop(): void {
		for (const h of this.#handles) h.stop();
		this.#handles = [];
		if (this.#master) {
			// Disconnect after the interrupt fades clear the graph.
			const m = this.#master;
			setTimeout(() => m.disconnect(), 200);
			this.#master = null;
		}
		cancelAnimationFrame(this.#raf);
		if (this.#fallbackTimer !== null) {
			clearInterval(this.#fallbackTimer);
			this.#fallbackTimer = null;
		}
		this.playing = null;
		this.playhead = null;
	}

	/** Convenience for UI toggles: stop if this exact request is playing, else play. */
	toggle(parsed: ParsedTag, keyName: string | undefined, mode: PlayMode): void {
		if (this.playing?.token === parsed && this.playing.mode === mode) {
			this.stop();
		} else {
			void this.play(parsed, keyName, mode);
		}
	}

	isPlaying(parsed: ParsedTag, mode?: PlayMode): boolean {
		return (
			this.playing?.token === parsed && (mode === undefined || this.playing.mode === mode)
		);
	}

	/** Dev/debug introspection (used by tests and the __player console handle). */
	debugInfo(): { state: AudioContextState; time: number } | null {
		return this.#ctx ? { state: this.#ctx.state, time: this.#ctx.currentTime } : null;
	}

	#followPlayhead(ctx: AudioContext, t0: number, schedule: Schedule, mode: PlayMode): void {
		const voice = mode === 'all' ? null : mode;
		// The posted final chord rings past the last column; keep the playhead
		// (and the playing state) alive until the fade is done.
		const tailSec = 1.6;
		const endSec = schedule.totalBeats * SEC_PER_BEAT + tailSec;

		const tick = () => {
			const elapsed = ctx.currentTime - t0;
			if (elapsed >= endSec) {
				this.stop();
				return;
			}
			const beat = elapsed / SEC_PER_BEAT;
			let current: Playhead | null = null;
			for (const c of schedule.columns) {
				if (beat >= c.start && beat < c.start + c.duration) {
					current = { staff: c.staff, col: c.col, voice };
					break;
				}
				if (c.start > beat) break;
			}
			// Past the last column (final chord ringing): hold the last column.
			if (!current && beat >= 0 && schedule.columns.length > 0) {
				const last = schedule.columns[schedule.columns.length - 1];
				if (beat >= last.start) current = { staff: last.staff, col: last.col, voice };
			}
			this.playhead = current;
		};

		// rAF for a smooth highlight while visible; an interval fallback so the
		// clock (and the end-of-playback stop) keeps running when the tab is
		// hidden and rAF is throttled to zero.
		const loop = () => {
			tick();
			if (this.playing !== null) this.#raf = requestAnimationFrame(loop);
		};
		this.#raf = requestAnimationFrame(loop);
		this.#fallbackTimer = setInterval(tick, 250);
	}
}

export const player = new Player();

// Dev-only escape hatch for debugging playback in the browser console.
if (import.meta.env.DEV) (globalThis as { __player?: unknown }).__player = player;
