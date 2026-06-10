/**
 * Legacy / leniency normalizer (FABLE_SPEC §6.6).
 *
 * Converts legacy Unicode notation bodies (combining octave dots, `♯ ♭ ⁀`,
 * en/em dashes, middle-dot rests) and tidy input variants into the canonical
 * ASCII shorthand (§3). Canonical ASCII input passes through unchanged
 * (idempotent). This is a migration/leniency pass only — the parser reads
 * canonical ASCII directly.
 *
 * Legacy → canonical mappings:
 *   - combining dot above U+0307  → `'` per dot (octave up)
 *   - combining dot below U+0323  → `,` per dot (octave down)
 *   - combining low line  U+0332  → `/` per line (subdivision)
 *   - `♯` / `♭`                   → `#` / `b` prefix
 *   - `⁀` U+2040                  → `~` tie prefix (splits glued pairs like `5⁀4`)
 *   - `–` U+2013 / `—` U+2014     → `-` (the single hold token)
 *   - standalone `·` U+00B7       → `0` (legacy rest)
 *   - `·` attached after a digit  → `.` (dotted)
 *
 * Only voice lines (lines containing `|`) are retokenized; their whitespace
 * runs collapse to single spaces. Lyric lines keep their spacing semantics
 * (interior runs preserved; only trailing whitespace is trimmed).
 */

const DOT_ABOVE = '\u0307'; // combining dot above — legacy octave up
const DOT_BELOW = '\u0323'; // combining dot below — legacy octave down
const LOW_LINE = '\u0332'; // combining low line — legacy subdivision
const MIDDLE_DOT = '\u00b7'; // legacy rest (standalone) / dotted (after a digit)

/**
 * One legacy-or-canonical note token: optional tie, optional accidental,
 * digit, then any mix of octave/subdivision marks (combining or ASCII),
 * then an optional dotted suffix (`·` legacy or `.` canonical).
 */
const NOTE_TOKEN_RE = new RegExp(
	`^(~?)([#b]?)([1-7])([${DOT_ABOVE}${DOT_BELOW}${LOW_LINE}',/]*)([${MIDDLE_DOT}.]?)$`,
);

function countOf(s: string, chars: string): number {
	let n = 0;
	for (const ch of s) if (chars.includes(ch)) n++;
	return n;
}

/** Normalize a single note-shaped token into canonical mark order, or null if it isn't one. */
function normalizeNoteToken(token: string): string | null {
	const m = NOTE_TOKEN_RE.exec(token);
	if (!m) return null;
	const [, tie, accidental, digit, marks, dot] = m;
	const ups = countOf(marks, DOT_ABOVE + "'");
	const downs = countOf(marks, DOT_BELOW + ',');
	const subdivision = countOf(marks, LOW_LINE + '/');
	// Canonical order: tie, accidental, digit, octave marks, subdivision, dot.
	// (Mixed up+down marks are preserved literally; the parser flags them.)
	return (
		tie +
		accidental +
		digit +
		"'".repeat(ups) +
		','.repeat(downs) +
		'/'.repeat(subdivision) +
		(dot ? '.' : '')
	);
}

/** Normalize one whitespace-separated cell of a voice line. May emit several tokens. */
function normalizeCell(cell: string): string {
	// Character-level legacy glyphs that map 1:1.
	const s = cell
		.replace(/♯/g, '#')
		.replace(/♭/g, 'b')
		.replace(/⁀/g, '~')
		.replace(/[–—]/g, '-');

	// A tie glued onto the previous note (`5⁀4` → `5 ~4`) splits into two cells.
	const pieces: string[] = [];
	let start = 0;
	for (let i = 1; i < s.length; i++) {
		if (s[i] === '~') {
			pieces.push(s.slice(start, i));
			start = i;
		}
	}
	pieces.push(s.slice(start));

	return pieces
		.map((piece) => {
			if (piece === MIDDLE_DOT) return '0'; // legacy standalone middle dot = rest
			return normalizeNoteToken(piece) ?? piece;
		})
		.join(' ');
}

/** Voice line: retokenize, collapsing whitespace runs to single spaces. */
function normalizeVoiceLine(line: string): string {
	return line
		.split(/\s+/)
		.filter((cell) => cell.length > 0)
		.map(normalizeCell)
		.join(' ');
}

/**
 * Convert a notation body from legacy Unicode / tidy variants to canonical
 * ASCII shorthand. Idempotent: canonical input comes back unchanged.
 */
export function normalize(body: string): string {
	return body
		.split('\n')
		.map((line) => {
			if (line.includes('|')) return normalizeVoiceLine(line);
			return line.trimEnd(); // lyric (or blank) line — keep interior spacing
		})
		.join('\n');
}
