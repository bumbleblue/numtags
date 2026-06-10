import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseTagFile, serializeTag } from './tagfile';

const dir = join(import.meta.dirname, '..', '..', 'data', 'tags');

describe('tagfile', () => {
	it.each(readdirSync(dir).filter((f) => f.endsWith('.md')))(
		'%s round-trips through parse → serialize → parse',
		(file) => {
			const raw = readFileSync(join(dir, file), 'utf8');
			const tag = parseTagFile(raw, file.replace(/\.md$/, ''));
			expect(tag.metadata.tag_id).toBeGreaterThan(0);
			expect(tag.metadata.origin).toBe('catalog');
			expect(tag.content).toContain('|');

			const again = parseTagFile(serializeTag(tag), tag.slug);
			expect(again.metadata).toEqual(tag.metadata);
			expect(again.content.trim()).toBe(tag.content.trim());
		},
	);

	it('serializes a minimal authored tag with quoting', () => {
		const out = serializeTag({
			metadata: {
				title: 'My "new" tag',
				tag_id: 1_000_000,
				arranger: 'me',
				difficulty: 'Easy',
				date_added: '2026-06-10',
				parts: 4,
				origin: 'authored',
			},
			content: '| 1 - |\n| 1 - |\n| 1 - |\n| 1 - |',
			slug: 'local-1000000',
		});
		expect(out).toContain(`title: "My 'new' tag"`);
		expect(out).toContain('origin: "authored"');
		expect(out.endsWith('| 1 - |\n')).toBe(true);
		expect(parseTagFile(out).metadata.tag_id).toBe(1_000_000);
	});

	it('rejects non-tag files', () => {
		expect(() => parseTagFile('just some text')).toThrow(/frontmatter/);
	});
});
