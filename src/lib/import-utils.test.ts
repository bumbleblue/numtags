// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { makeDraftTag, parseBbsId, parseBbsTagsXML, sniffFile } from './import-utils';

const bytes = (s: string) => new TextEncoder().encode(s);

describe('sniffFile', () => {
	it('detects MIDI by MThd magic', () => {
		expect(sniffFile(bytes('MThd\x00\x00\x00\x06'))).toBe('midi');
	});

	it('detects zip (.mxl) / PDF / GIF / PNG / JPEG magic', () => {
		expect(sniffFile(bytes('PK\x03\x04rest'))).toBe('mxl');
		expect(sniffFile(bytes('%PDF-1.4'))).toBe('pdf');
		expect(sniffFile(bytes('GIF89a...'))).toBe('image');
		expect(sniffFile(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe('image');
		expect(sniffFile(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image');
	});

	it('detects tag files by frontmatter and MusicXML by markup', () => {
		expect(sniffFile(bytes('---\ntitle: "x"\n---\n| 1 |'))).toBe('tagfile');
		expect(sniffFile(bytes('﻿---\ntitle: "x"\n---\n'))).toBe('tagfile');
		expect(sniffFile(bytes('<?xml version="1.0"?><score-partwise/>'))).toBe('musicxml');
		expect(sniffFile(bytes('<score-partwise version="3.1">'))).toBe('musicxml');
	});

	it('returns unknown for arbitrary text', () => {
		expect(sniffFile(bytes('hello world'))).toBe('unknown');
		expect(sniffFile(new Uint8Array([]))).toBe('unknown');
	});
});

describe('parseBbsId', () => {
	it('accepts a bare numeric id', () => {
		expect(parseBbsId(' 4642 ')).toBe(4642);
	});

	it('extracts the id from barbershoptags.com URLs', () => {
		expect(parseBbsId('https://www.barbershoptags.com/tag-7-Sleepytime')).toBe(7);
		expect(parseBbsId('https://www.barbershoptags.com/dbpage.php?page=tagdetail&id=123')).toBe(123);
	});

	it('rejects junk', () => {
		expect(parseBbsId('')).toBeNull();
		expect(parseBbsId('not a url')).toBeNull();
	});
});

describe('parseBbsTagsXML', () => {
	const xml = `<?xml version="1.0"?>
		<tags available="1"><tag>
			<id>7</id>
			<Title>When it's sleepy time</Title>
			<WritKey>Major:C</WritKey>
			<Arranger>unknown</Arranger>
			<Lyrics>When it's   sleepy time
			down south</Lyrics>
		</tag></tags>`;

	it('extracts title, arranger, key, lyrics and a source url', () => {
		const af = parseBbsTagsXML(xml);
		expect(af).toEqual({
			id: 7,
			sourceUrl: 'https://www.barbershoptags.com/tag-7',
			title: "When it's sleepy time",
			arranger: 'unknown',
			key: 'C',
			lyrics: "When it's sleepy time down south",
		});
	});

	it('maps minor keys to the m suffix', () => {
		const af = parseBbsTagsXML('<tags><tag><WritKey>Minor:F</WritKey></tag></tags>', 9);
		expect(af?.key).toBe('Fm');
		expect(af?.sourceUrl).toBe('https://www.barbershoptags.com/tag-9');
	});

	it('survives missing fields, junk and non-XML', () => {
		expect(parseBbsTagsXML('<tags available="0"></tags>')).toBeNull();
		expect(parseBbsTagsXML('not xml at all')).toBeNull();
		expect(parseBbsTagsXML('<tags><tag><Unknown>x</Unknown></tag></tags>')).toBeNull();
	});
});

describe('makeDraftTag', () => {
	it('fills sensible defaults with tag_id 0 (assign-on-save)', () => {
		const tag = makeDraftTag('| 1 |', 'authored');
		expect(tag.metadata.tag_id).toBe(0);
		expect(tag.metadata.title).toBe('Untitled');
		expect(tag.metadata.arranger).toBe('unknown');
		expect(tag.metadata.parts).toBe(4);
		expect(tag.metadata.origin).toBe('authored');
		expect(tag.content).toBe('| 1 |');
	});

	it('merges autofill metadata, encoder key winning over autofill key', () => {
		const tag = makeDraftTag(
			'| 1 |',
			'imported-midi',
			{ title: 'T', arranger: 'A', key: 'Ab', lyrics: 'la', sourceUrl: 'https://x' },
			'F',
		);
		expect(tag.metadata.title).toBe('T');
		expect(tag.metadata.arranger).toBe('A');
		expect(tag.metadata.original_key).toBe('F');
		expect(tag.metadata.lyrics).toBe('la');
		expect(tag.metadata.source_url).toBe('https://x');
	});
});
