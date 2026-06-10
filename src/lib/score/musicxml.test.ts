// @vitest-environment happy-dom
/**
 * MusicXML importer tests (FABLE_SPEC §6.2) + the golden integration test
 * (§13): fixture MusicXML → parseMusicXML → encode → exact ASCII body.
 */
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { parseMusicXML, parseMusicXMLWithWarnings } from './musicxml';
import { encode } from './encode';

// ── fixture builders ────────────────────────────────────────────────────────

interface XNoteOpts {
	alter?: number;
	voice?: number;
	chord?: boolean;
	tie?: 'start' | 'stop';
	fermata?: boolean;
	lyric?: [text: string, syllabic?: string];
	rest?: boolean;
}

function xnote(step: string, octave: number, dur: number, opts: XNoteOpts = {}): string {
	const parts: string[] = ['<note>'];
	if (opts.chord) parts.push('<chord/>');
	if (opts.rest) {
		parts.push('<rest/>');
	} else {
		parts.push(
			'<pitch>',
			`<step>${step}</step>`,
			opts.alter !== undefined ? `<alter>${opts.alter}</alter>` : '',
			`<octave>${octave}</octave>`,
			'</pitch>'
		);
	}
	parts.push(`<duration>${dur}</duration>`);
	if (opts.tie) parts.push(`<tie type="${opts.tie}"/>`);
	if (opts.voice !== undefined) parts.push(`<voice>${opts.voice}</voice>`);
	if (opts.fermata) parts.push('<notations><fermata/></notations>');
	if (opts.lyric) {
		parts.push(
			'<lyric>',
			`<syllabic>${opts.lyric[1] ?? 'single'}</syllabic>`,
			`<text>${opts.lyric[0]}</text>`,
			'</lyric>'
		);
	}
	parts.push('</note>');
	return parts.join('');
}

const ATTRS_F = `<attributes><divisions>2</divisions><key><fifths>-1</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>`;

function partList(names: string[]): string {
	return (
		'<part-list>' +
		names
			.map((name, i) => `<score-part id="P${i + 1}"><part-name>${name}</part-name></score-part>`)
			.join('') +
		'</part-list>'
	);
}

function part(id: string, measures: string[]): string {
	return (
		`<part id="${id}">` +
		measures.map((m, i) => `<measure number="${i}">${m}</measure>`).join('') +
		'</part>'
	);
}

/**
 * 4-part fixture in F major, 4/4: a 1-beat pickup, a tenor tie across the
 * barline, fermatas on the final chord, lead lyrics with syllabics.
 * Divisions = 2 (a quarter note is duration 2).
 */
const FOUR_PART_F = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
${partList(['Tenor', 'Lead', 'Baritone', 'Bass'])}
${part('P1', [
	ATTRS_F + xnote('A', 4, 2),
	[xnote('A', 4, 4), xnote('G', 4, 2), xnote('B', 4, 2, { alter: -1, tie: 'start' })].join(''),
	[xnote('B', 4, 2, { alter: -1, tie: 'stop' }), xnote('A', 4, 6, { fermata: true })].join('')
])}
${part('P2', [
	ATTRS_F + xnote('F', 4, 2, { lyric: ['Oh'] }),
	[
		xnote('F', 4, 2, { lyric: ['ne', 'begin'] }),
		xnote('F', 4, 2, { lyric: ['ver', 'end'] }),
		xnote('E', 4, 4, { lyric: ['more'] })
	].join(''),
	xnote('F', 4, 8, { fermata: true, lyric: ['roam'] })
])}
${part('P3', [
	ATTRS_F + xnote('C', 4, 2),
	[xnote('C', 4, 4), xnote('B', 3, 2, { alter: 0 }), xnote('C', 4, 2)].join(''),
	xnote('C', 4, 8, { fermata: true })
])}
${part('P4', [
	ATTRS_F + xnote('F', 3, 2),
	[xnote('F', 3, 4), xnote('G', 3, 2), xnote('C', 3, 2)].join(''),
	xnote('F', 3, 8, { fermata: true })
])}
</score-partwise>`;

/**
 * 2-part SATB-on-2-staves fixture: treble part with two <voice> streams
 * (tenor above lead), bass part with <chord/> stacks (baritone above bass).
 */
const TWO_PART = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
${partList(['Tenor/Lead', 'Bari/Bass'])}
${part('P1', [
	'<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' +
		xnote('A', 4, 2, { voice: 1 }) +
		xnote('G', 4, 2, { voice: 1 }) +
		'<backup><duration>4</duration></backup>' +
		xnote('F', 4, 2, { voice: 2 }) +
		xnote('E', 4, 2, { voice: 2 })
])}
${part('P2', [
	'<attributes><divisions>1</divisions></attributes>' +
		xnote('C', 4, 2, { voice: 1 }) +
		xnote('F', 3, 2, { voice: 1, chord: true }) +
		xnote('B', 3, 2, { voice: 1 }) +
		xnote('G', 3, 2, { voice: 1, chord: true })
])}
</score-partwise>`;

// ── tests ───────────────────────────────────────────────────────────────────

describe('parseMusicXML: 4-part scores', () => {
	const { score, warnings } = parseMusicXMLWithWarnings(FOUR_PART_F);

	it('reads key and time signature', () => {
		expect(score.keyName).toBe('F');
		expect(score.tonicPitchClass).toBe(5);
		expect(score.mode).toBe('major');
		expect(score.timeSignature).toEqual({ beats: 4, beatType: 4 });
		expect(warnings).toEqual([]);
	});

	it('maps labeled parts to roles', () => {
		expect(score.voices.map((v) => v.role)).toEqual(['tenor', 'lead', 'baritone', 'bass']);
		expect(score.voices[0].measures[0][0]).toMatchObject({ step: 'A', octave: 4 });
		expect(score.voices[3].measures[0][0]).toMatchObject({ step: 'F', octave: 3 });
	});

	it('normalizes durations to quarter-beats via divisions', () => {
		expect(score.voices[0].measures[0][0].durationBeats).toBe(1); // pickup quarter
		expect(score.voices[0].measures[1][0].durationBeats).toBe(2); // half
		expect(score.voices[1].measures[2][0].durationBeats).toBe(4); // whole
	});

	it('preserves spelling, ties, fermatas and lyrics', () => {
		const tenorTied = score.voices[0].measures[2][0];
		expect(tenorTied).toMatchObject({ step: 'B', alter: -1, tiedFromPrev: true });
		expect(score.voices[0].measures[1][2].tiedFromPrev).toBeUndefined(); // tie start, not stop
		expect(score.voices[0].measures[2][1].fermata).toBe(true);
		expect(score.voices[1].measures[1][0].lyric).toEqual({ text: 'ne', syllabic: 'begin' });
		expect(score.voices[1].measures[0][0].lyric).toEqual({ text: 'Oh', syllabic: 'single' });
	});

	it('falls back to pitch order when parts are unlabeled', () => {
		const unlabeled = FOUR_PART_F.replace(/<part-name>[^<]*<\/part-name>/g, '<part-name>Voice</part-name>');
		const s = parseMusicXML(unlabeled);
		expect(s.voices[0].measures[0][0]).toMatchObject({ step: 'A', octave: 4 }); // highest avg → tenor
		expect(s.voices[3].measures[0][0]).toMatchObject({ step: 'F', octave: 3 }); // lowest avg → bass
	});
});

describe('parseMusicXML: 2-part (SATB on 2 staves)', () => {
	const { score, warnings } = parseMusicXMLWithWarnings(TWO_PART);

	it('splits each part into 2 voices (voice numbers, then chord stacks)', () => {
		expect(warnings).toEqual([]);
		expect(score.voices[0].measures[0].map((e) => e.step)).toEqual(['A', 'G']); // tenor
		expect(score.voices[1].measures[0].map((e) => e.step)).toEqual(['F', 'E']); // lead
		expect(score.voices[2].measures[0].map((e) => e.step)).toEqual(['C', 'B']); // baritone (chord tops)
		expect(score.voices[2].measures[0][0].octave).toBe(4);
		expect(score.voices[3].measures[0].map((e) => e.step)).toEqual(['F', 'G']); // bass (chord bottoms)
		expect(score.voices[3].measures[0][0].octave).toBe(3);
	});
});

describe('parseMusicXML: defaults and degraded input', () => {
	it('defaults to C major and 4/4 with warnings, pads missing voices with rests', () => {
		const minimal = `<score-partwise>${partList(['Music'])}${part('P1', [
			'<attributes><divisions>1</divisions></attributes>' + xnote('C', 4, 4)
		])}</score-partwise>`;
		const { score, warnings } = parseMusicXMLWithWarnings(minimal);
		expect(score.keyName).toBe('C');
		expect(score.timeSignature).toEqual({ beats: 4, beatType: 4 });
		expect(warnings.some((w) => /no key signature/i.test(w))).toBe(true);
		expect(warnings.some((w) => /no time signature/i.test(w))).toBe(true);
		expect(warnings.some((w) => /expected 4/i.test(w))).toBe(true);
		expect(score.voices).toHaveLength(4);
		expect(score.voices[0].measures[0][0].step).toBe('C'); // lone stream → tenor
		expect(score.voices[3].measures[0][0]).toMatchObject({ kind: 'rest', durationBeats: 4 });
	});

	it('reads minor keys as the relative minor of the signature', () => {
		const minorXml = FOUR_PART_F.replace(
			'<key><fifths>-1</fifths><mode>major</mode></key>',
			'<key><fifths>0</fifths><mode>minor</mode></key>'
		);
		const s = parseMusicXML(minorXml);
		expect(s.keyName).toBe('Am');
		expect(s.mode).toBe('minor');
		expect(s.tonicPitchClass).toBe(9);
	});

	it('throws on non-MusicXML documents', () => {
		expect(() => parseMusicXML('<foo/>')).toThrow(/not a musicxml score/i);
	});

	it('flattens chords to the top note in 4-part scores, with a warning', () => {
		const chordy = FOUR_PART_F.replace(
			xnote('F', 3, 2),
			xnote('F', 3, 2) + xnote('C', 3, 2, { chord: true })
		);
		const { score, warnings } = parseMusicXMLWithWarnings(chordy);
		expect(score.voices[3].measures[0]).toHaveLength(1);
		expect(score.voices[3].measures[0][0].step).toBe('F');
		expect(warnings.some((w) => /chord/i.test(w))).toBe(true);
	});
});

describe('parseMusicXML: compressed .mxl input', () => {
	it('unzips via META-INF/container.xml rootfile', () => {
		const container =
			'<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.xml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>';
		const mxl = zipSync({
			'META-INF/container.xml': strToU8(container),
			'score.xml': strToU8(FOUR_PART_F)
		});
		const score = parseMusicXML(mxl);
		expect(score.keyName).toBe('F');
		expect(score.voices[0].measures).toHaveLength(3);
	});

	it('falls back to the first non-META-INF xml entry', () => {
		const mxl = zipSync({ 'tag.xml': strToU8(FOUR_PART_F) });
		expect(parseMusicXML(mxl).keyName).toBe('F');
	});

	it('treats a non-ZIP byte array as UTF-8 MusicXML text', () => {
		expect(parseMusicXML(strToU8(FOUR_PART_F)).keyName).toBe('F');
	});
});

describe('integration: MusicXML → ScoreModel → encode (golden pattern, §13)', () => {
	it('produces the exact hand-computed ASCII body', () => {
		const score = parseMusicXML(FOUR_PART_F);
		expect(encode(score)).toBe(
			[
				'3 | 3 - 2 4 | ~4 X |',
				'1 | 1 1 7, - | X |',
				'5, | 5, - #4, 5, | X |',
				'1, | 1, - 2, 5,, | X |',
				'Oh ne-ver more _ roam'
			].join('\n')
		);
	});
});
