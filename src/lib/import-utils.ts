/**
 * Pure helpers for the Import screen (FABLE_SPEC §6.1, §6.7, §7.1):
 * file-type sniffing for friendly "that's not a …" errors, draft Tag
 * construction, and defensive parsing of barbershoptags.com autofill data.
 *
 * Everything here is side-effect free; `parseBbsTagsXML` needs a DOMParser
 * (browser / happy-dom).
 */

import type { Tag, TagOrigin } from './types';

// ── file sniffing ───────────────────────────────────────────────────────────

export type FileKind =
	| 'midi'
	| 'mxl' // compressed MusicXML (zip)
	| 'musicxml'
	| 'tagfile' // numtags .md (YAML frontmatter)
	| 'image'
	| 'pdf'
	| 'unknown';

/** Best-effort content sniff of a picked file (magic bytes first, then text). */
export function sniffFile(bytes: Uint8Array): FileKind {
	const ascii = (start: number, len: number) =>
		String.fromCharCode(...bytes.slice(start, start + len));

	if (bytes.length >= 4) {
		const m4 = ascii(0, 4);
		if (m4 === 'MThd') return 'midi';
		if (m4 === 'PK\x03\x04') return 'mxl';
		if (m4 === '%PDF') return 'pdf';
		if (m4.startsWith('GIF8')) return 'image';
		if (bytes[0] === 0x89 && m4.slice(1) === 'PNG') return 'image';
		if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image'; // JPEG
		if (m4 === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image';
	}

	// Textual formats: decode a prefix, skip BOM/whitespace.
	let text = '';
	try {
		text = new TextDecoder('utf-8', { fatal: false })
			.decode(bytes.slice(0, 2048))
			.replace(/^﻿/, '')
			.trimStart();
	} catch {
		return 'unknown';
	}
	if (text.startsWith('---')) return 'tagfile';
	if (text.includes('<score-partwise') || text.includes('<score-timewise')) return 'musicxml';
	if (text.startsWith('<?xml') || text.startsWith('<!DOCTYPE') || text.startsWith('<'))
		return 'musicxml'; // XML-ish — let the real parser produce the precise error
	return 'unknown';
}

// ── draft Tag construction ──────────────────────────────────────────────────

export interface BbsAutofill {
	id?: number;
	title?: string;
	arranger?: string;
	key?: string; // e.g. "Ab", "Fm"
	lyrics?: string;
	sourceUrl?: string;
}

/** Today as the catalog's YYYY-MM-DD `date_added`. */
export function today(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Build a fresh draft Tag for the review screen. `tag_id: 0` means "assign a
 * local id on save" (db.ts). Autofill metadata (§6.7) fills the gaps; an
 * encoder-derived key wins over the autofilled one.
 */
export function makeDraftTag(
	body: string,
	origin: TagOrigin,
	autofill?: BbsAutofill | null,
	keyName?: string,
): Tag {
	const key = keyName ?? autofill?.key;
	return {
		metadata: {
			title: autofill?.title || 'Untitled',
			tag_id: 0,
			arranger: autofill?.arranger || 'unknown',
			difficulty: 'Easy',
			...(autofill?.sourceUrl ? { source_url: autofill.sourceUrl } : {}),
			date_added: today(),
			parts: 4,
			...(autofill?.lyrics ? { lyrics: autofill.lyrics } : {}),
			...(key ? { original_key: key } : {}),
			origin,
		},
		content: body,
		slug: '',
	};
}

// ── barbershoptags.com autofill (§6.7) ──────────────────────────────────────

/** Accepts a bare id ("4642") or any barbershoptags.com URL containing one. */
export function parseBbsId(input: string): number | null {
	const s = input.trim();
	if (s === '') return null;
	if (/^\d+$/.test(s)) return Number(s);
	const m = /[?&]id=(\d+)/.exec(s) ?? /\/tag-(\d+)(?:[-/]|$)/i.exec(s);
	return m ? Number(m[1]) : null;
}

/**
 * Parse the barbershoptags.com API XML defensively (§6.7: verify nothing,
 * take what's there, skip silently on anything odd). Returns null when no
 * usable <tag> element is found.
 */
export function parseBbsTagsXML(xmlText: string, id?: number): BbsAutofill | null {
	let doc: Document;
	try {
		doc = new DOMParser().parseFromString(xmlText, 'application/xml');
	} catch {
		return null;
	}
	if (doc.getElementsByTagName('parsererror').length > 0) return null;

	// First element that looks like a tag record (the API wraps <tags><tag>…).
	const tag =
		doc.getElementsByTagName('tag')[0] ??
		(doc.documentElement?.tagName?.toLowerCase() === 'tag' ? doc.documentElement : null);
	if (!tag) return null;

	const field = (...names: string[]): string | undefined => {
		for (const child of Array.from(tag.children)) {
			if (names.some((n) => child.tagName.toLowerCase() === n.toLowerCase())) {
				const text = child.textContent?.trim();
				if (text) return text;
			}
		}
		return undefined;
	};

	const out: BbsAutofill = {};
	const idText = field('id');
	const tagId = id ?? (idText && /^\d+$/.test(idText) ? Number(idText) : undefined);
	if (tagId !== undefined) {
		out.id = tagId;
		out.sourceUrl = `https://www.barbershoptags.com/tag-${tagId}`;
	}
	const title = field('Title');
	if (title) out.title = title;
	const arranger = field('Arranger', 'Arrer');
	if (arranger) out.arranger = arranger;
	const lyrics = field('Lyrics');
	if (lyrics) out.lyrics = collapseWhitespace(lyrics);
	const writKey = field('WritKey', 'Key');
	if (writKey) {
		// Format like "Major:Ab" / "Minor:F" — or sometimes a bare key name.
		const m = /^(major|minor)\s*:\s*(.+)$/i.exec(writKey);
		if (m) out.key = m[2].trim() + (m[1].toLowerCase() === 'minor' ? 'm' : '');
		else out.key = writKey.trim();
	}
	return Object.keys(out).length > 0 ? out : null;
}

function collapseWhitespace(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}
