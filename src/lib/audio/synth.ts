/**
 * Minimal piano-ish Web Audio voice — accuracy over beauty (a learning
 * reference, not a learning track). Sharp attack, decay to a sustain level so
 * held grid notes keep sounding, short release; the posted final chord gets a
 * long fade instead.
 *
 * Two oscillators per note (triangle fundamental + quiet sine an octave up
 * for onset clarity) into one envelope gain. No dependencies, no samples —
 * keeps the PWA fully offline.
 */

const ATTACK = 0.008;
const DECAY = 0.25; // seconds to fall to the sustain level
const SUSTAIN = 0.45; // fraction of peak
const RELEASE = 0.12;
const FINAL_RELEASE = 1.6; // posted final chord fade

export interface NoteHandle {
	stop: () => void;
}

export function playNote(
	ctx: AudioContext,
	destination: AudioNode,
	freq: number,
	startTime: number,
	durationSec: number,
	finalChord: boolean,
): NoteHandle {
	const env = ctx.createGain();
	env.connect(destination);

	const fundamental = ctx.createOscillator();
	fundamental.type = 'triangle';
	fundamental.frequency.value = freq;
	fundamental.connect(env);

	const octave = ctx.createOscillator();
	octave.type = 'sine';
	octave.frequency.value = freq * 2;
	const octaveGain = ctx.createGain();
	octaveGain.gain.value = 0.18;
	octave.connect(octaveGain);
	octaveGain.connect(env);

	const release = finalChord ? FINAL_RELEASE : RELEASE;
	const end = startTime + durationSec;

	// setTargetAtTime segments simply take over at their start times, so this
	// stays well-ordered even when the note is shorter than attack + decay.
	const g = env.gain;
	g.setValueAtTime(0.0001, startTime);
	g.exponentialRampToValueAtTime(1, startTime + ATTACK);
	g.setTargetAtTime(SUSTAIN, startTime + ATTACK, DECAY / 3);
	g.setTargetAtTime(0.0001, end, release / 4);

	const stopAt = end + release + 0.05;
	fundamental.start(startTime);
	octave.start(startTime);
	fundamental.stop(stopAt);
	octave.stop(stopAt);

	let stopped = false;
	return {
		stop() {
			if (stopped) return;
			stopped = true;
			// Quick fade-out, then kill — avoids a click on interrupt.
			const t = ctx.currentTime;
			g.cancelScheduledValues(t);
			g.setValueAtTime(g.value || 0.0001, t);
			g.exponentialRampToValueAtTime(0.0001, t + 0.05);
			fundamental.stop(t + 0.08);
			octave.stop(t + 0.08);
		},
	};
}
