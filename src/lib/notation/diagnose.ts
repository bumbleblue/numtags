/**
 * Plain-language diagnosis of unparseable notation tokens (FABLE_SPEC §6.6
 * "validate, don't block" + §7.1 partial parse).
 *
 * People hitting these errors are usually learning the notation system AND
 * the input system at the same time, so every message says what to type
 * instead, not just that the token is wrong. Checks are ordered from the
 * most specific mistake to the most generic.
 */

/** Legacy Unicode glyphs the normalizer converts — shown with their ASCII form. */
const LEGACY_GLYPHS: [RegExp, string][] = [
	[/♯/, '# (sharp)'],
	[/♭/, 'b (flat)'],
	[/⁀/, '~ (tie)'],
	[/[–—]/, '- (hold)'],
	[/[·•]/, '. (dot)'],
	[/[\u0300-\u036f]/, "octave marks ' (up) and , (down) after the digit"],
];

/**
 * Explain why a token didn't parse, in terms of what to type instead.
 * Returns a sentence fragment (no leading capital, no trailing period) to
 * splice into a warning message, or a generic fallback.
 */
export function diagnoseToken(raw: string): string {
	for (const [re, ascii] of LEGACY_GLYPHS) {
		if (re.test(raw)) {
			return `this looks like the old Unicode notation — here you type ${ascii}`;
		}
	}

	if (/^[A-Ga-g][#b']*$/.test(raw)) {
		return `notes are scale degrees 1–7, not letter names — 1 is the key's root (do), so in F the note A is 3`;
	}

	if (/[89]/.test(raw)) {
		return `scale degrees only go 1–7 — for the octave above, add ' after the digit (1' is the root an octave up)`;
	}

	if (/^[1-7]+[#b]/.test(raw.replace(/^~/, ''))) {
		const digit = raw.replace(/^~/, '')[0];
		const acc = raw.includes('#') ? '#' : 'b';
		return `the sharp/flat goes in front of the digit: ${acc}${digit}, not ${digit}${acc}`;
	}

	if (/^[',]/.test(raw)) {
		return `octave marks go after the digit: 5' (octave up) or 5, (octave down)`;
	}

	if (/^[#b]?[1-7]/.test(raw) && /~/.test(raw.slice(1))) {
		return `the tie goes in front of the note it ties into: "3 ~3", not "3~ 3"`;
	}

	if (/[1-7][^\s]*[1-7]/.test(raw)) {
		return `one note per beat — put a space between notes`;
	}

	if (/\/{3,}/.test(raw)) {
		return `subdivision stops at sixteenths: / is an eighth, // a sixteenth`;
	}

	// Right characters, wrong order (e.g. "5./", "5/,", "5.'").
	if (/^[~#b1-7',/.]+$/.test(raw)) {
		return `the marks are in the wrong order — a note reads tie, sharp/flat, digit, octave, subdivision, dot: ~b3'/. is a tied flat-3, octave up, dotted eighth`;
	}

	return `notes look like #5'/. (sharp/flat, digit 1–7, octave, subdivision, dot) — plus - hold, 0 rest, x posted`;
}
