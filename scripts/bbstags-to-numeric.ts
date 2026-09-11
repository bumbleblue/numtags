/**
 * barbershoptags.com → numtags numeric notation, in bulk.
 *
 * For each tag (id, URL, or --search hit) this fetches the official API
 * record, picks the best machine-readable source, and runs it through the
 * app's own import pipeline (src/lib/score/*) to an ASCII notation body:
 *
 *   MusicXML   <Notation type="xml|musicxml|mxl">                       → parseMusicXML
 *   MIDI       <AllParts|Notation|Bass|Bari|Lead|Tenor type="mid|midi"> → parseMIDI
 *   image/PDF  <SheetMusic> / <SheetMusicAlt>  (only with --omr <url>)  → homr → MusicXML
 *   nothing convertible                                                 → metadata-only skeleton
 *
 * Reality check (2026-09, 400-tag sample): ~99% of tags offer only sheet-music
 * images + MP3 learning tracks, so bulk conversion is really an OMR job; MIDI
 * and MusicXML sources exist but are rare (≈1–2%).
 *
 * Output goes to --out (default out/bbstags/) as catalog-format .md files;
 * --catalog writes straight into data/tags, where every file carries
 * `status: auto-generated` until a person reviews it and marks it checked
 * (the review screen's Details tab). Tags already in the target are skipped.
 * report.json records the source used and every importer warning per tag.
 *
 * Run (vite-node, not tsx: @tonejs/midi is a UMD bundle Node's ESM loader can't see through):
 *   npm run bbstags -- 24 7561 https://www.barbershoptags.com/tag-4074
 *   npm run bbstags -- --search "close your eyes" --limit 10
 *   npm run bbstags -- 24 --omr http://localhost:8000
 *   npm run bbstags -- --catalog 7561 4074      # into data/tags as auto-generated
 *   npm run bbstags -- --catalog --all           # everything convertible on the site
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { makeDraftTag, parseBbsId, parseBbsTagsXML } from '../src/lib/import-utils.js';
import type { BbsAutofill } from '../src/lib/import-utils.js';
import { normalize } from '../src/lib/notation/normalize.js';
import { blankTemplateBody } from '../src/lib/notation/transform.js';
import { encode, LETTER_PC, LETTERS, parseKeyName } from '../src/lib/score/encode.js';
import { parseMIDI } from '../src/lib/score/midi.js';
import { parseMusicXMLWithWarnings } from '../src/lib/score/musicxml.js';
import type { NoteEvent, ScoreModel, VoiceRole } from '../src/lib/score/types.js';
import { VOICE_ROLES } from '../src/lib/score/types.js';
import { serializeTag } from '../src/lib/tagfile.js';
import type { TagOrigin } from '../src/lib/types.js';

// The importers call `new DOMParser()` (browser global); happy-dom stands in.
const domWindow = new Window();
(globalThis as unknown as { DOMParser: unknown }).DOMParser = domWindow.DOMParser;
const XMLSerializerCtor = domWindow.XMLSerializer;

const API = 'https://www.barbershoptags.com/api.php';
const POLITE_DELAY_MS = 300;

const MUSICXML_TYPES = new Set(['xml', 'musicxml', 'mxl']);
const MIDI_TYPES = new Set(['mid', 'midi']);
const IMAGE_TYPES = new Set(['gif', 'png', 'jpg', 'jpeg', 'pdf']);
const PART_FIELDS: Record<string, VoiceRole> = {
	Tenor: 'tenor',
	Lead: 'lead',
	Bari: 'baritone',
	Bass: 'bass'
};
const MEDIA_FIELDS = [
	'Notation',
	'SheetMusic',
	'SheetMusicAlt',
	'AllParts',
	'Tenor',
	'Lead',
	'Bari',
	'Bass',
	'Other1',
	'Other2',
	'Other3',
	'Other4'
];

// ── CLI ─────────────────────────────────────────────────────────────────────

interface Options {
	ids: number[];
	search?: string;
	all: boolean;
	limit: number;
	out: string;
	omr?: string;
	fromSources?: string; // dir with <id>-omr.musicxml files: reuse instead of calling OMR
	force: boolean;
	saveSources: boolean;
	noOctaveShift: boolean;
}

function usage(): never {
	console.log(
		[
			'Usage: npm run bbstags -- [ids or URLs…] [options]',
			'',
			'  --all             walk the whole site catalog; convert every tag with a usable source',
			'  --search <text>   full-text search on barbershoptags.com (title/lyrics)',
			'  --limit <n>       max search hits (default 25)',
			'  --out <dir>       output directory (default out/bbstags)',
			'  --catalog         shorthand for --out data/tags (entries land as status: auto-generated)',
			'  --omr <url>       OMR service base URL for image/PDF-only tags (POST /omr)',
			'  --from-sources <dir>  reuse <dir>/<id>-omr.musicxml from an earlier run instead of calling OMR',
			'  --force           overwrite existing output files',
			'  --no-sources      do not keep the downloaded source files',
			'  --no-octave-shift keep source octaves (default: shift whole score to home the lead)',
			''
		].join('\n')
	);
	process.exit(1);
}

function parseArgs(argv: string[]): Options {
	const opts: Options = { ids: [], all: false, limit: 25, out: 'out/bbstags', force: false, saveSources: true, noOctaveShift: false };
	const bad: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const next = () => {
			const v = argv[++i];
			if (v === undefined) usage();
			return v;
		};
		if (a === '--all') opts.all = true;
		else if (a === '--search') opts.search = next();
		else if (a === '--limit') opts.limit = Math.max(1, Number(next()) || 25);
		else if (a === '--out') opts.out = next();
		else if (a === '--catalog') opts.out = 'data/tags';
		else if (a === '--omr') opts.omr = next().replace(/\/+$/, '');
		else if (a === '--from-sources') opts.fromSources = next();
		else if (a === '--force') opts.force = true;
		else if (a === '--no-sources') opts.saveSources = false;
		else if (a === '--no-octave-shift') opts.noOctaveShift = true;
		else if (a === '--help' || a === '-h') usage();
		else {
			const id = parseBbsId(a);
			if (id) opts.ids.push(id);
			else bad.push(a);
		}
	}
	if (bad.length) {
		console.error(`Not a barbershoptags id or URL: ${bad.join(', ')}`);
		usage();
	}
	if (opts.ids.length === 0 && !opts.search && !opts.all) usage();
	return opts;
}

// ── barbershoptags API ──────────────────────────────────────────────────────

interface Media {
	field: string;
	type: string; // lower-cased `type` attribute, '' when absent
	url: string;
}

interface Record_ {
	id: number;
	autofill: BbsAutofill;
	title: string;
	parts?: number;
	posted?: string; // YYYY-MM-DD
	notes?: string;
	media: Media[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOk(url: string): Promise<Response> {
	await sleep(POLITE_DELAY_MS);
	const res = await fetch(url, {
		headers: { 'User-Agent': 'numtags-importer (+https://numtags.app)' },
		signal: AbortSignal.timeout(60_000)
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
	return res;
}

function textOf(el: Element, name: string): string | undefined {
	for (const child of Array.from(el.children)) {
		if (child.tagName.toLowerCase() === name.toLowerCase()) {
			const t = child.textContent?.trim();
			return t || undefined;
		}
	}
	return undefined;
}

/** "Fri, 12 Dec 2008" → "2008-12-12" */
function isoDate(posted: string | undefined): string | undefined {
	if (!posted) return undefined;
	const d = new Date(posted);
	return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function recordFromElement(el: Element): Record_ | null {
	const autofill = parseBbsTagsXML(new XMLSerializerCtor().serializeToString(el as never));
	if (!autofill?.id || !autofill.title) return null;
	const media: Media[] = [];
	for (const child of Array.from(el.children)) {
		if (!MEDIA_FIELDS.includes(child.tagName)) continue;
		const url = child.textContent?.trim();
		if (!url) continue;
		let type = (child.getAttribute('type') ?? '').toLowerCase();
		if (!type) type = (/\.([a-z0-9]+)$/i.exec(url)?.[1] ?? '').toLowerCase();
		media.push({ field: child.tagName, type, url });
	}
	const parts = Number(textOf(el, 'Parts'));
	return {
		id: autofill.id,
		autofill,
		title: autofill.title,
		parts: Number.isInteger(parts) && parts > 0 ? parts : undefined,
		posted: isoDate(textOf(el, 'Posted')),
		notes: textOf(el, 'Notes')?.replace(/\s+/g, ' '),
		media
	};
}

function recordsFromXML(xml: string): Record_[] {
	const doc = new DOMParser().parseFromString(xml, 'application/xml');
	return Array.from(doc.getElementsByTagName('tag'))
		.map(recordFromElement)
		.filter((r): r is Record_ => r !== null);
}

async function fetchRecord(id: number): Promise<Record_ | null> {
	const xml = await (await fetchOk(`${API}?id=${id}`)).text();
	return recordsFromXML(xml)[0] ?? null;
}

/** Page through the whole site catalog (100 records per request). */
async function allRecords(): Promise<Record_[]> {
	const out: Record_[] = [];
	for (let start = 1; ; start += 100) {
		const xml = await (await fetchOk(`${API}?n=100&start=${start}`)).text();
		const total = /<tags available="(\d+)"/.exec(xml)?.[1] ?? '?';
		const recs = recordsFromXML(xml);
		out.push(...recs);
		console.log(`… catalog records ${out.length} of ${total}`);
		if (recs.length < 100) break;
	}
	return out;
}

async function searchRecords(q: string, limit: number): Promise<Record_[]> {
	const xml = await (await fetchOk(`${API}?q=${encodeURIComponent(q)}&n=${limit}`)).text();
	return recordsFromXML(xml);
}

// ── source selection ────────────────────────────────────────────────────────

type SourceKind = 'musicxml' | 'midi' | 'midi-parts' | 'image';
interface Source {
	kind: SourceKind;
	media: Media[]; // one file, or four part files for 'midi-parts'
}

function pickSource(rec: Record_): Source | null {
	const notation = rec.media.find((m) => m.field === 'Notation');
	if (notation && MUSICXML_TYPES.has(notation.type)) return { kind: 'musicxml', media: [notation] };

	const midi = rec.media.filter((m) => MIDI_TYPES.has(m.type));
	const whole = midi.find((m) => m.field === 'Notation' || m.field === 'AllParts');
	if (whole) return { kind: 'midi', media: [whole] };
	const parts = Object.keys(PART_FIELDS).map((f) => midi.find((m) => m.field === f));
	if (parts.every(Boolean)) return { kind: 'midi-parts', media: parts as Media[] };
	if (midi.length) return { kind: 'midi', media: [midi[0]] }; // some single part — still a start

	const image =
		rec.media.find((m) => m.field === 'SheetMusic' && IMAGE_TYPES.has(m.type)) ??
		rec.media.find((m) => m.field === 'SheetMusicAlt' && IMAGE_TYPES.has(m.type));
	return image ? { kind: 'image', media: [image] } : null;
}

// ── conversion ──────────────────────────────────────────────────────────────

interface Converted {
	score: ScoreModel;
	warnings: string[];
	confidence?: number;
	musicxml?: string; // OMR path only: the recognized score, for re-import
}

/**
 * happy-dom's DOMParser rejects processing instructions such as
 * `<?PDFtoMusic …?>` that browsers accept; drop them (text XML only — a
 * compressed .mxl starts with the ZIP magic and is passed through).
 */
function stripProcessingInstructions(bytes: Uint8Array): Uint8Array | string {
	if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) return bytes;
	return new TextDecoder().decode(bytes).replace(/<\?(?!xml[\s?])[\s\S]*?\?>/g, '');
}

async function download(m: Media): Promise<Uint8Array> {
	return new Uint8Array(await (await fetchOk(m.url)).arrayBuffer());
}

async function runOMR(omr: string, bytes: Uint8Array, filename: string): Promise<Converted> {
	const fd = new FormData();
	fd.append('file', new Blob([bytes.slice().buffer as ArrayBuffer]), filename);
	await sleep(POLITE_DELAY_MS);
	const res = await fetch(`${omr}/omr`, { method: 'POST', body: fd, signal: AbortSignal.timeout(600_000) });
	if (!res.ok) {
		let detail = `${res.status} ${res.statusText}`;
		try {
			detail = (await res.json()).detail ?? detail;
		} catch {
			/* keep status text */
		}
		throw new Error(`OMR failed: ${detail}`);
	}
	const xml = await res.text();
	const conf = res.headers.get('X-Confidence');
	const out: Converted = { ...parseMusicXMLWithWarnings(xml), musicxml: xml };
	if (conf !== null && !Number.isNaN(Number(conf))) {
		out.confidence = Number(conf);
		out.score.confidence = out.confidence;
	}
	const pages = res.headers.get('X-Pdf-Pages');
	if (pages && Number(pages) > 1) out.warnings.push(`PDF has ${pages} pages; only page 1 was read.`);
	return out;
}

/** Four single-part MIDIs → one score, each file's busiest voice taking its role. */
function mergePartMidis(results: { role: VoiceRole; parsed: ReturnType<typeof parseMIDI> }[]): Converted {
	const warnings: string[] = [];
	const lead = results.find((r) => r.role === 'lead')!.parsed.score;
	const measureLenQ = lead.timeSignature.beats * (4 / lead.timeSignature.beatType);
	const restMeasure = (): NoteEvent[] => [{ kind: 'rest', durationBeats: measureLenQ }];
	const perRole = new Map<VoiceRole, NoteEvent[][]>();
	for (const { role, parsed } of results) {
		const busiest = parsed.score.voices.reduce((best, v) => {
			const count = (x: typeof v) => x.measures.flat().filter((e) => e.kind === 'note').length;
			return count(v) > count(best) ? v : best;
		});
		perRole.set(role, busiest.measures);
		for (const w of parsed.warnings) warnings.push(`[${role}] ${w}`);
		if (parsed.score.tonicPitchClass !== lead.tonicPitchClass) {
			warnings.push(`[${role}] key (${parsed.score.keyName}) differs from lead's (${lead.keyName}); lead's used.`);
		}
	}
	const numMeasures = Math.max(...Array.from(perRole.values()).map((m) => m.length));
	const voices = VOICE_ROLES.map((role) => {
		const measures = perRole.get(role) ?? [];
		while (measures.length < numMeasures) measures.push(restMeasure());
		return { role, measures };
	});
	warnings.push('Voices came from four separate part files; check alignment measure by measure.');
	return { score: { ...lead, voices }, warnings };
}

/**
 * Home the lead. The catalog's transcribers put the lead where it needs the
 * fewest octave marks (tag 24: lead `1 1 1 … 7,`; Ireland: `5 1' 7` rather
 * than `5, 1 7,`), and shift all voices together so intervals stay intact.
 * Try whole-octave shifts and keep the one with the fewest marked lead
 * cells (ties → the smaller shift).
 */
function homeTheLead(conv: Converted): void {
	const tonic = parseKeyName(conv.score.keyName);
	const tonicPos = 4 * 7 + LETTERS.indexOf(tonic.letter);
	const lead = conv.score.voices.find((v) => v.role === 'lead');
	const notes = (lead?.measures.flat() ?? []).filter((e) => e.kind === 'note' && e.step !== undefined);
	if (notes.length === 0) return;
	const marks = (k: number) =>
		notes.filter((e) => Math.floor((((e.octave ?? 4) + k) * 7 + LETTERS.indexOf(e.step!) - tonicPos) / 7) !== 0).length;
	let best = 0;
	for (const k of [-1, 1, -2, 2]) if (marks(k) < marks(best)) best = k;
	if (best === 0) return;
	conv.score = {
		...conv.score,
		voices: conv.score.voices.map((v) => ({
			...v,
			measures: v.measures.map((m) =>
				m.map((e) => (e.kind === 'note' && e.octave !== undefined ? { ...e, octave: e.octave + best } : e))
			)
		}))
	};
	conv.warnings.push(
		`Shifted all voices ${best > 0 ? 'up' : 'down'} ${Math.abs(best)} octave${Math.abs(best) === 1 ? '' : 's'} to home the lead; adjust per voice in review if needed.`
	);
}

/**
 * The MIDI importer guesses the key when the file has no key signature. The
 * site knows the written key, so prefer that — but say so, since learning
 * tracks are sometimes transposed (the record's Notes usually mention it).
 */
function applySiteKey(conv: Converted, rec: Record_): void {
	const siteKey = rec.autofill.key;
	if (!siteKey || !conv.warnings.some((w) => /no key signature/i.test(w))) return;
	const tonic = parseKeyName(siteKey);
	const mode: ScoreModel['mode'] = /m$/.test(siteKey) ? 'minor' : 'major';
	const pc = (((LETTER_PC[tonic.letter] + tonic.alter) % 12) + 12) % 12;
	if (pc === conv.score.tonicPitchClass && mode === conv.score.mode) return;
	conv.score = { ...conv.score, tonicPitchClass: pc, mode, keyName: siteKey };
	conv.warnings.push(
		`Used the site's written key (${siteKey}) instead of the inferred one; if the MIDI is a transposed learning track, set the key in review.`
	);
}

async function convert(rec: Record_, source: Source, opts: Options, saveSource: (m: Media, bytes: Uint8Array) => void): Promise<Converted> {
	if (source.kind === 'musicxml') {
		const bytes = await download(source.media[0]);
		saveSource(source.media[0], bytes);
		return parseMusicXMLWithWarnings(stripProcessingInstructions(bytes));
	}
	if (source.kind === 'midi') {
		const bytes = await download(source.media[0]);
		saveSource(source.media[0], bytes);
		const conv: Converted = parseMIDI(bytes);
		applySiteKey(conv, rec);
		return conv;
	}
	if (source.kind === 'midi-parts') {
		const results = [];
		for (const m of source.media) {
			const bytes = await download(m);
			saveSource(m, bytes);
			results.push({ role: PART_FIELDS[m.field], parsed: parseMIDI(bytes) });
		}
		// Learning-track MIDIs are usually full mixes with one part emphasized,
		// not monophonic parts: merge only when every file carries a single voice.
		const voicesWithNotes = (score: ScoreModel) =>
			score.voices.filter((v) => v.measures.flat().some((e) => e.kind === 'note')).length;
		const monophonic = results.every((r) => voicesWithNotes(r.parsed.score) === 1);
		const conv: Converted = monophonic
			? mergePartMidis(results)
			: { ...(results.find((r) => r.role === 'lead') ?? results[0]).parsed };
		if (!monophonic) {
			conv.warnings = [
				...conv.warnings,
				'Part files are full mixes (learning tracks), not single voices — used the Lead file as the whole score.'
			];
		}
		applySiteKey(conv, rec);
		return conv;
	}
	// image / PDF
	const saved = opts.fromSources ? join(opts.fromSources, `${rec.id}-omr.musicxml`) : null;
	if (saved && existsSync(saved)) {
		const xml = readFileSync(saved, 'utf8');
		const conv: Converted = { ...parseMusicXMLWithWarnings(xml), musicxml: xml };
		conv.warnings.push(`Recognized score reused from ${saved}.`);
		trebleStaffIs8vb(conv);
		return conv;
	}
	if (!opts.omr) throw new Error('image-only tag: pass --omr <service url> to run OMR');
	const bytes = await download(source.media[0]);
	saveSource(source.media[0], bytes);
	const conv = await runOMR(opts.omr, bytes, `${rec.id}.${source.media[0].type}`);
	// Keep the recognized MusicXML next to the image: importer changes can then
	// be re-run without paying for OMR again.
	if (conv.musicxml) saveSource({ field: 'omr', type: 'musicxml', url: '' }, new TextEncoder().encode(conv.musicxml));
	trebleStaffIs8vb(conv);
	return conv;
}

/**
 * Barbershop scores write tenor/lead on a treble clef sounding an octave
 * lower ("8vb"). OMR reads the clef as plain treble, so those two voices
 * come back an octave above the bass staff's (sounding) pitches. Correct
 * that before homing the lead so all four voices share one octave frame.
 */
function trebleStaffIs8vb(conv: Converted): void {
	conv.score = {
		...conv.score,
		voices: conv.score.voices.map((v) =>
			v.role === 'tenor' || v.role === 'lead'
				? { ...v, measures: v.measures.map((m) => m.map((e) => (e.kind === 'note' && e.octave !== undefined ? { ...e, octave: e.octave - 1 } : e))) }
				: v
		)
	};
	conv.warnings.push('Tenor/lead read as treble 8vb (one octave below the OMR reading).');
}

// ── output ──────────────────────────────────────────────────────────────────

function slugify(title: string): string {
	return (
		title
			.normalize('NFD')
			.replace(/\p{M}+/gu, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'untitled'
	);
}

function fileTagId(file: string): number | null {
	const m = /^tag_id:\s*(\d+)/m.exec(readFileSync(file, 'utf8'));
	return m ? Number(m[1]) : null;
}

/**
 * A catalog file a person has worked on must survive --force: status
 * `checked`, or the last commit touching it is a wiki edit/revert through
 * the catalog bot ("Edit tag 7: … (by Casey)") rather than a script run.
 */
function touchedByPeople(file: string): boolean {
	if (/^status: "checked"$/m.test(readFileSync(file, 'utf8'))) return true;
	try {
		const subject = execSync(`git log -1 --format=%s -- ${JSON.stringify(file)}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
		return /^(Edit|Revert) tag \d+/.test(subject);
	} catch {
		return false;
	}
}

/** tag_id → file for every .md already in the output dir (the catalog, when --catalog). */
function indexExisting(dir: string): Map<number, string> {
	const map = new Map<number, string>();
	if (!existsSync(dir)) return map;
	for (const name of readdirSync(dir)) {
		if (!name.endsWith('.md')) continue;
		const file = join(dir, name);
		const id = fileTagId(file);
		if (id !== null && !map.has(id)) map.set(id, file);
	}
	return map;
}

const ORIGIN_BY_KIND: Record<SourceKind, TagOrigin> = {
	musicxml: 'imported-musicxml',
	midi: 'imported-midi',
	'midi-parts': 'imported-midi',
	image: 'imported-image'
};

interface ReportEntry {
	id: number;
	title: string;
	file?: string;
	source: { kind: SourceKind; files: string[] } | null;
	status: 'converted' | 'skeleton' | 'failed';
	writtenKey?: string;
	encodedKey?: string;
	confidence?: number;
	warnings: string[];
	error?: string;
}

async function processRecord(
	rec: Record_,
	opts: Options,
	existing: Map<number, string>,
	report: ReportEntry[]
): Promise<void> {
	const entry: ReportEntry = {
		id: rec.id,
		title: rec.title,
		source: null,
		status: 'skeleton',
		writtenKey: rec.autofill.key,
		warnings: []
	};
	report.push(entry);

	// Already there (any filename) → skip unless --force, which overwrites in place;
	// same title but a different tag → id-suffixed filename.
	let slug = slugify(rec.title);
	let file = existing.get(rec.id) ?? join(opts.out, `${slug}.md`);
	if (existsSync(file) && fileTagId(file) !== rec.id) {
		slug = `${slug}-${rec.id}`;
		file = join(opts.out, `${slug}.md`);
	}
	if (existsSync(file) && !opts.force) {
		entry.status = 'failed';
		entry.error = `already present: ${file} (use --force to overwrite)`;
		console.log(`⏭  #${rec.id} ${rec.title} — ${entry.error}`);
		return;
	}
	if (existsSync(file) && opts.force && touchedByPeople(file)) {
		entry.status = 'failed';
		entry.error = `kept: ${file} was checked or edited by a person`;
		console.log(`🔒 #${rec.id} ${rec.title} — ${entry.error}`);
		return;
	}

	const saveSource = (m: Media, bytes: Uint8Array) => {
		if (!opts.saveSources) return;
		const dir = join(opts.out, 'sources');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, `${rec.id}-${m.field}.${m.type || 'bin'}`), bytes);
	};

	const source = pickSource(rec);
	let body = blankTemplateBody();
	let origin: TagOrigin = 'authored';
	let keyName: string | undefined;

	if (source) {
		entry.source = { kind: source.kind, files: source.media.map((m) => `${m.field} (${m.type})`) };
		try {
			const conv = await convert(rec, source, opts, saveSource);
			if (!opts.noOctaveShift) homeTheLead(conv);
			body = normalize(encode(conv.score)); // canonical ASCII, always (normalize is a no-op on encoder output)
			origin = ORIGIN_BY_KIND[source.kind];
			keyName = conv.score.keyName;
			entry.status = 'converted';
			entry.encodedKey = keyName;
			entry.confidence = conv.confidence;
			entry.warnings.push(...conv.warnings);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			entry.warnings.push(`${source.kind}: ${msg} — wrote a metadata-only skeleton instead.`);
		}
	} else {
		entry.warnings.push('No convertible source on the site (no notation file, no image) — skeleton only.');
	}
	if (entry.status === 'skeleton') {
		entry.warnings.push('Body is the blank template: transcribe from the sheet music.');
		if (opts.out === 'data/tags') {
			entry.status = 'failed';
			entry.error = 'not written: skeletons stay out of the catalog';
			console.log(`🚫 #${rec.id} ${rec.title} — ${entry.error}`);
			for (const w of entry.warnings) console.log(`     ⚠ ${w}`);
			return;
		}
	}

	const tag = makeDraftTag(body, origin, rec.autofill, keyName);
	tag.metadata.tag_id = rec.id;
	tag.metadata.parts = rec.parts ?? 4;
	if (rec.posted) tag.metadata.date_added = rec.posted;
	if (rec.notes) tag.metadata.comments = rec.notes;
	tag.slug = slug;
	tag.metadata.status = 'auto-generated';
	// In the catalog, `origin` is library provenance and must read `catalog`;
	// the conversion source lives in report.json.
	if (opts.out === 'data/tags') tag.metadata.origin = 'catalog';

	mkdirSync(opts.out, { recursive: true });
	writeFileSync(file, serializeTag(tag));
	entry.file = file;

	const icon = entry.status === 'converted' ? '✅' : '📝';
	const via = entry.source ? ` via ${entry.source.kind}` : '';
	console.log(`${icon} #${rec.id} ${rec.title}${via} → ${file}`);
	for (const w of entry.warnings) console.log(`     ⚠ ${w}`);
}

// ── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	const report: ReportEntry[] = [];

	const records: Record_[] = [];
	if (opts.all) {
		const everything = await allRecords();
		let imageOnly = 0;
		let nothing = 0;
		for (const rec of everything) {
			const source = pickSource(rec);
			if (!source) nothing++;
			else if (source.kind === 'image' && !opts.omr) imageOnly++;
			else records.push(rec);
		}
		console.log(
			`📚 ${everything.length} tags on the site: ${records.length} with a usable source` +
				(opts.omr ? '' : `, ${imageOnly} image-only (skipped — pass --omr to convert them)`) +
				`, ${nothing} with no files at all.`
		);
	}
	if (opts.search) {
		const hits = await searchRecords(opts.search, opts.limit);
		console.log(`🔎 "${opts.search}": ${hits.length} hit(s)`);
		records.push(...hits);
	}
	for (const [i, id] of opts.ids.entries()) {
		if (records.some((r) => r.id === id)) continue;
		if (opts.ids.length > 20 && i % 20 === 0) console.log(`… fetching records ${i + 1}–${Math.min(i + 20, opts.ids.length)} of ${opts.ids.length}`);
		const rec = await fetchRecord(id).catch((e: Error) => {
			console.log(`❌ #${id}: ${e.message}`);
			report.push({ id, title: '', source: null, status: 'failed', warnings: [], error: e.message });
			return null;
		});
		if (rec) records.push(rec);
		else if (!report.some((r) => r.id === id)) {
			console.log(`❌ #${id}: no such tag`);
			report.push({ id, title: '', source: null, status: 'failed', warnings: [], error: 'no such tag' });
		}
	}

	const existing = indexExisting(opts.out);
	for (const rec of records) await processRecord(rec, opts, existing, report);

	const reportDir = opts.out === 'data/tags' ? 'out/bbstags' : opts.out;
	mkdirSync(reportDir, { recursive: true });
	writeFileSync(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
	const count = (s: ReportEntry['status']) => report.filter((r) => r.status === s).length;
	console.log(
		`\n${count('converted')} converted, ${count('skeleton')} skeleton(s), ${count('failed')} failed/skipped → ${join(reportDir, 'report.json')}`
	);
	console.log(
		opts.out === 'data/tags'
			? 'Catalog entries carry status: auto-generated until someone marks them checked in review.'
			: 'Every file is a draft: review in the app (Import → tag file) before publishing.'
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
